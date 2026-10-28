import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
const root=path.resolve('dist');
const sentinel='AI_SECRET_SENTINEL_NOT_FOR_BROWSER_72819';
let checked=0;
async function visit(dir) {
 for(const entry of await readdir(dir,{withFileTypes:true})) {
  const name=path.join(dir,entry.name);
  if(entry.isDirectory()) await visit(name);
  else if(/\.(?:js|html|json|map|css)$/.test(name)) {
   const data=await readFile(name,'utf8'); checked++;
   assert.ok(!data.includes(sentinel),`Secret leaked into ${name}`);
   assert.ok(!data.includes('generativelanguage.googleapis.com'),`Browser contains direct Gemini transport: ${name}`);
  }
 }
}
await visit(root);assert.ok(checked>0,'No browser assets checked');
console.log(`Checked ${checked} browser assets: no injected secret or Gemini transport.`);
