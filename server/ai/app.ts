import express from 'express';
import { getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { createHandler, reserveQuota, HttpError } from './security.mjs';
import { validate } from './policy.mjs';
import { execute } from './provider';

export function createAIApp() {
  const app = express();
  app.disable('x-powered-by');
  const adminApp = () => getApps()[0] || initializeApp({ projectId: process.env.AI_FIREBASE_PROJECT_ID });
  app.use('/api/ai', express.json({ limit: '3mb', strict: true }));
  app.all('/api/ai', createHandler({
    verifyToken: token => getAuth(adminApp()).verifyIdToken(token, true),
    quota: async (uid, cost) => {
      try { await reserveQuota(getFirestore(adminApp(), 'ai-security'), 'synapse-ai-', uid, cost); }
      catch (error) {
        if (error instanceof HttpError) throw error;
        throw new HttpError(503, 'AI usage service unavailable.');
      }
    },
    validate,
    execute,
    ready: () => Boolean(process.env.GEMINI_API_KEY?.trim()) && Boolean(process.env.AI_FIREBASE_PROJECT_ID),
  }));
  app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);
    res.status(error.type === 'entity.too.large' ? 413 : 400).json({ error: 'Invalid or oversized request body.' });
  });
  return app;
}
