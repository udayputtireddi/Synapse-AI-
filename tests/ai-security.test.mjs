import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { createHandler, reserveQuota, HttpError, authenticate } from '../server/ai/security.mjs';
import { validate } from '../server/ai/policy.mjs';
const valid = {"operation": "process", "input": {"transcript": "Alice will finish the report tomorrow."}};
const clone = x => structuredClone(x);
class Response extends EventEmitter {
  statusCode = 200; headers = {}; headersSent = false; writableEnded = false; body = null; output = '';
  setHeader(k,v) { this.headers[k]=v; }
  status(n) { this.statusCode=n; return this; }
  json(x) { this.body=x; this.headersSent=true; this.writableEnded=true; return this; }
  write(x) { this.headersSent=true; this.output+=x; }
  end(x='') { this.write(x); this.writableEnded=true; }
}
async function request(overrides={}, body=valid, header='Bearer valid') {
  let calls=0, quotas=0;
  const deps={ verifyToken: async () => ({uid:'alice'}), quota: async () => {quotas++;},
    validate, ready: () => true, execute: async (request, signal, emit) => {calls++; if (emit) emit('Hello'); return {ok:true};}, ...overrides };
  const response=new Response();
  await createHandler(deps)({method:'POST',headers:{authorization:header},body:clone(body)},response);
  return {response,calls,quotas};
}
test('valid operation reaches mock AI and consumes quota',async()=>{
 const {response,calls,quotas}=await request(); assert.equal(response.statusCode,200);assert.equal(calls,1);assert.equal(quotas,1);
 if(valid.operation==='chat') {assert.match(response.output,/Hello/);assert.match(response.output,/"done":true/);}
 else assert.deepEqual(response.body,{ok:true});
 assert.equal(response.headers['Cache-Control'],'no-store');
});
for (const header of ['', 'Basic bad', 'Bearer a b', 'Bearer '+ 'x'.repeat(8200)]) {
 test('reject malformed authorization '+header.slice(0,16),async()=>{const r=await request({},valid,header);assert.equal(r.response.statusCode,401);assert.equal(r.calls,0);assert.equal(r.quotas,0);});
}
test('reject forged, expired, revoked or wrong-project token verification failures',async()=>{
 const r=await request({verifyToken:async()=>{throw Error('secret-token');}});assert.equal(r.response.statusCode,401);assert.equal(r.calls,0);assert.doesNotMatch(JSON.stringify(r.response.body),/secret-token/);
});
test('reject anonymous identities',async()=>{
 const r=await request({verifyToken:async()=>({uid:'guest',firebase:{sign_in_provider:'anonymous'}})});assert.equal(r.response.statusCode,401);assert.equal(r.quotas,0);
});
test('reject verifier result without uid',async()=>{await assert.rejects(authenticate('Bearer valid',async()=>({})),e=>e.status===401);});
for(const body of [null, [], {}, {...valid,operation:'arbitrary-model'}, {...valid,model:'expensive'}, {...valid,input:{...valid.input,apiKey:'injected'}}]) {
 test('reject invalid request '+JSON.stringify(body)?.slice(0,90),async()=>{const r=await request({},body);assert.equal(r.response.statusCode,400);assert.equal(r.calls,0);assert.equal(r.quotas,0);});
}
test('fail closed when server key is missing',async()=>{const r=await request({ready:()=>false});assert.equal(r.response.statusCode,503);assert.equal(r.calls,0);assert.equal(r.quotas,0);});
test('quota exhaustion stops provider execution',async()=>{const r=await request({quota:async()=>{throw new HttpError(429,'Limit');}});assert.equal(r.response.statusCode,429);assert.equal(r.calls,0);});
test('quota storage failure stops provider execution',async()=>{const r=await request({quota:async()=>{throw Error('database-secret');}});assert.equal(r.calls,0);assert.doesNotMatch(JSON.stringify(r.response.body),/database-secret/);});
test('provider failure never returns raw credentials',async()=>{const r=await request({execute:async()=>{throw Error('key-very-secret');}});assert.equal(r.response.statusCode,502);assert.doesNotMatch(JSON.stringify(r.response.body),/key-very-secret/);});
test('timeout cancels provider signal',async()=>{let signal;const r=await request({timeoutMs:5,execute:async(q,s)=>{signal=s;await new Promise(resolve=>s.addEventListener('abort',resolve));throw Error('abort');}});assert.equal(r.response.statusCode,504);assert.equal(signal.aborted,true);});
test('GET cannot invoke provider',async()=>{const res=new Response();await createHandler({})({method:'GET',headers:{}},res);assert.equal(res.statusCode,405);});
test('client disconnect aborts pending provider',async()=>{
 const res=new Response();let signal;
 const handler=createHandler({verifyToken:async()=>({uid:'a'}),quota:async()=>{},validate,ready:()=>true,execute:async(q,s)=>{signal=s;res.emit('close');s.throwIfAborted();}});
 await handler({method:'POST',headers:{authorization:'Bearer x'},body:valid},res);assert.equal(signal.aborted,true);
});
// Serializable fake implements commit/rollback semantics, allowing races against
// the actual quota algorithm. Deployment still requires emulator/live smoke checks.
function database() {
 const values=new Map(); let tail=Promise.resolve();
 return {values,collection:()=>({doc:id=>id}),runTransaction(fn){
   const run=tail.then(async()=>{const writes=new Map();const result=await fn({get:async ref=>({data:()=>clone(values.get(ref))}),set:(ref,value)=>writes.set(ref,value)});for(const [k,v]of writes)values.set(k,v);return result;});
   tail=run.catch(()=>{});return run;
 }};
}
test('concurrent requests cannot exceed minute allowance',async()=>{
 const db=database();const rs=await Promise.allSettled(Array.from({length:80},()=>reserveQuota(db,'app','alice',1,0)));
 assert.equal(rs.filter(r=>r.status==='fulfilled').length,60);assert.equal(rs.filter(r=>r.status==='rejected'&&r.reason.status===429).length,20);
 assert.equal(db.values.get('app-global-day').used,60);
});
test('user quotas isolated; day survives minute rollover',async()=>{
 const db=database();await reserveQuota(db,'app','alice',60,0);await reserveQuota(db,'app','bob',60,0);
 await reserveQuota(db,'app','alice',60,60000);await reserveQuota(db,'app','alice',60,120000);await reserveQuota(db,'app','alice',20,180000);
 await assert.rejects(reserveQuota(db,'app','alice',1,240000),e=>e.status===429);
 await reserveQuota(db,'app','alice',1,86400000);
});
test('global daily budget applies across accounts',async()=>{
 const db=database();for(let i=0;i<40;i++)await reserveQuota(db,'app','u'+i,50,0);
 await assert.rejects(reserveQuota(db,'app','new-user',1,0),e=>e.status===429);
 assert.equal(db.values.get('app-global-day').used,2000);
});
test('quota refuses corrupted counts instead of resetting them',async()=>{
 const db=database();db.values.set('app-global-day',{window:0,used:-1});await assert.rejects(reserveQuota(db,'app','a',1,0),e=>e.status===503);
});
for (const cost of [0,-1,NaN,Infinity,101,1.5]) test('invalid cost '+cost,async()=>{await assert.rejects(reserveQuota(database(),'app','a',cost),e=>e.status===400);});

test('bound transcript and charge all pipeline calls',()=>{
assert.throws(()=>validate({operation:'process',input:{transcript:'x'.repeat(12001)}}));
assert.equal(validate({operation:'process',input:{transcript:'x'.repeat(12000)}}).cost,10);
assert.equal(validate({operation:'chunks',input:{meetingId:'m',meetingTitle:'Meeting',date:'2026-10-26',transcript:'x'.repeat(12000)}}).cost,15);
});
test('bound query context and embeddings',()=>{
assert.throws(()=>validate({operation:'embedding',input:{text:'x'.repeat(2001)}}));
assert.throws(()=>validate({operation:'query',input:{query:'q',context:'x'.repeat(16001)}}));
});


test('browser source cannot import Gemini or legacy secret variables', async () => {
  const { readdir, readFile } = await import('node:fs/promises');
  const { fileURLToPath } = await import('node:url');
  const path = await import('node:path');
  const root = fileURLToPath(new URL('../', import.meta.url));
  async function walk(dir) {
    for(const entry of await readdir(dir,{withFileTypes:true})) {
      if(['functions','server','tests','scripts','node_modules','dist','.git','.firebase'].includes(entry.name)) continue;
      const full=path.join(dir,entry.name);
      if(entry.isDirectory()) await walk(full);
      else if(/\.(?:tsx?|html)$/.test(entry.name) && entry.name!=='server.ts') {
        const content=await readFile(full,'utf8');
        assert.doesNotMatch(content,/@google\/genai|VITE_GEMINI_API_KEY|VITE_API_KEY|process\.env\.(?:GEMINI_API_KEY|API_KEY)/,full);
        assert.doesNotMatch(content,/=\s*import\.meta\.env\s*;/, 'Do not expose the entire Vite environment');
      }
    }
  }
  await walk(root);
});
