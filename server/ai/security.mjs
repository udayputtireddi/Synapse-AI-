import { createHash } from 'node:crypto';

export class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
export function object(value, fields) {
  if (!value || typeof value !== 'object' || Array.isArray(value) ||
      Object.keys(value).some(key => !fields.includes(key))) {
    throw new HttpError(400, 'Invalid request fields.');
  }
  return value;
}
export function text(value, max, optional = false) {
  if (optional && value === undefined) return '';
  if (typeof value !== 'string' || value.length > max || (!optional && !value.trim())) {
    throw new HttpError(400, 'Invalid text length.');
  }
  return value;
}
export function list(value, max) {
  if (!Array.isArray(value) || value.length > max) throw new HttpError(400, 'Invalid list length.');
  return value;
}
export function attachment(value) {
  object(value, ['name', 'mimeType', 'data']);
  if (value.name !== undefined) text(value.name, 200);
  if (!['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'text/plain'].includes(value.mimeType)) {
    throw new HttpError(400, 'Unsupported attachment type.');
  }
  text(value.data, 1400000);
  if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value.data) ||
      Buffer.byteLength(value.data, 'base64') > 1000000) throw new HttpError(413, 'Invalid or oversized attachment.');
  return value;
}
export async function authenticate(header, verifyToken) {
  if (typeof header !== 'string' || !/^Bearer [^\s]{1,8192}$/.test(header)) {
    throw new HttpError(401, 'Sign in to use AI.');
  }
  let user;
  try { user = await verifyToken(header.slice(7)); }
  catch { throw new HttpError(401, 'Your session expired. Sign in again.'); }
  if (!user?.uid || user.firebase?.sign_in_provider === 'anonymous') {
    throw new HttpError(401, 'A non-anonymous account is required.');
  }
  return user.uid;
}

// One transaction reserves all counters before any provider request. Fixed windows,
// deliberately not refunded on provider failure; never fall back to process memory.
export async function reserveQuota(db, appId, uid, cost, now = Date.now()) {
  if (!Number.isSafeInteger(cost) || cost < 1 || cost > 100) throw new HttpError(400, 'Invalid request cost.');
  const day = Math.floor(now / 86400000), minute = Math.floor(now / 60000);
  const user = createHash('sha256').update(uid).digest('hex');
  const limits = [
    [`${appId}-user-${user}-minute`, minute, 60],
    [`${appId}-user-${user}-day`, day, 200],
    [`${appId}-global-day`, day, 2000],
  ];
  await db.runTransaction(async tx => {
    const refs = limits.map(([id]) => db.collection('aiUsage').doc(id));
    const snapshots = await Promise.all(refs.map(ref => tx.get(ref)));
    const next = snapshots.map((snap, i) => {
      const old = snap.data();
      const used = old?.window === limits[i][1] ? old.used : 0;
      if (!Number.isSafeInteger(used) || used < 0) throw new HttpError(503, 'AI usage service unavailable.');
      if (used + cost > limits[i][2]) throw new HttpError(429, 'AI usage limit reached. Try again later.');
      return { window: limits[i][1], used: used + cost };
    });
    refs.forEach((ref, i) => tx.set(ref, next[i]));
  });
}

export function createHandler({ verifyToken, quota, validate, execute, ready, timeoutMs = 55000 }) {
  return async (req, res) => {
    let timer;
    const controller = new AbortController();
    const disconnected = () => { if (!res.writableEnded) controller.abort(); };
    res.on?.('close', disconnected);
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    try {
      if (req.method !== 'POST') throw new HttpError(405, 'Use POST.');
      const uid = await authenticate(req.headers.authorization, verifyToken);
      const request = validate(req.body);
      if (!ready()) throw new HttpError(503, 'AI is not configured.');
      await quota(uid, request.cost);
      if (controller.signal.aborted) return;
      let outputLength = 0;
      const emit = request.stream ? chunk => {
        if (controller.signal.aborted) throw new HttpError(504, 'AI request cancelled.');
        outputLength += chunk.length;
        if (outputLength > 64000) throw new HttpError(502, 'AI response exceeded its limit.');
        if (!res.headersSent) res.setHeader('Content-Type', 'application/x-ndjson');
        res.write(JSON.stringify({ text: chunk }) + '\n');
      } : undefined;
      const deadline = new Promise((_, reject) => {
        timer = setTimeout(() => { controller.abort(); reject(new HttpError(504, 'AI request timed out.')); }, timeoutMs);
      });
      const result = await Promise.race([execute(request, controller.signal, emit), deadline]);
      if (res.destroyed) return;
      if (request.stream) {
        if (!res.headersSent) res.setHeader('Content-Type', 'application/x-ndjson');
        res.end(JSON.stringify({ done: true }) + '\n');
      } else {
        const encoded = JSON.stringify(result);
        if (!encoded || encoded.length > 1000000) throw new HttpError(502, 'Invalid AI response.');
        res.json(result);
      }
    } catch (error) {
      controller.abort();
      if (res.destroyed) return;
      const status = error instanceof HttpError ? error.status : 502;
      const message = error instanceof HttpError ? error.message : 'AI service unavailable. Please try again.';
      // Do not log prompts, transcripts, auth headers, keys or raw provider errors.
      if (res.headersSent) res.end(JSON.stringify({ error: message }) + '\n');
      else res.status(status).json({ error: message });
    } finally {
      clearTimeout(timer);
      res.off?.('close', disconnected);
    }
  };
}
