import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
let listener, network, mismatch=false, fetchCalls=[], storage={}, authWindows=0;
globalThis.chrome={
 storage:{local:{setAccessLevel:async()=>{}, get:async keys=>typeof keys==='string'?{[keys]:storage[keys]}:Object.fromEntries(keys.map(k=>[k,storage[k]])),
 set:async data=>Object.assign(storage,data),remove:async keys=>{for(const k of Array.isArray(keys)?keys:[keys])delete storage[k];}}},
 runtime:{id:'test',getURL:()=> 'chrome-extension://test/',onMessage:{addListener:fn=>listener=fn}},
 tabs:{create:async()=>{}},
 identity:{getRedirectURL:()=> 'https://test.chromiumapp.org/oauth',launchWebAuthFlow:async({url})=>{
  authWindows++;const u=new URL(url);assert.equal(u.searchParams.get('code_challenge_method'),'S256');assert.equal(u.searchParams.get('scope'),'profile offline.access');
  return 'https://test.chromiumapp.org/oauth?code=code&state='+(mismatch?'wrong':u.searchParams.get('state'));
 }}
};
globalThis.fetch=async(url,opts)=>{fetchCalls.push({url,opts});return network(url,opts);};
let source=await readFile(new URL('../js/background.js',import.meta.url),'utf8');
source=source.replace("import { WORKER_URL } from './config.js';","const WORKER_URL = 'https://worker.invalid';");
source=source.replace("'./protocol.js'",JSON.stringify(new URL('../js/protocol.js',import.meta.url).href));
await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const send=type=>new Promise(resolve=>listener({type},{id:'test',url:'chrome-extension://test/popup.html'},resolve));
test('background: connect, serialized refresh, mismatch rejection, cooldown survive popup',async()=>{
 network=async(url,opts)=>{
  if(url.endsWith('/config'))return Response.json({clientId:'public-id',redirectUri:'https://test.chromiumapp.org/oauth'});
  if(url.endsWith('/oauth/token'))return Response.json({access_token:'access',refresh_token:'refresh',expires_in:3600});
  return Response.json({handle:'alice'});
 };
 assert.equal((await send('connect')).data.handle,'alice');
 assert.equal(authWindows,1);assert.equal(storage.auth.refreshToken,'refresh');
 storage.auth.expiresAt=0;fetchCalls=[];
 network=async(url,opts)=>{
  if(url.endsWith('/oauth/token')){
   assert.equal(JSON.parse(opts.body).refresh_token,'refresh');
   assert.equal(storage.auth,undefined,'old refresh token consumed before sending');
   return Response.json({access_token:'new-access',refresh_token:'new-refresh',expires_in:3600});
  }return Response.json({handle:'alice'});
 };
 const results=await Promise.all([send('status'),send('status')]);
 assert.ok(results.every(r=>r.ok));assert.equal(fetchCalls.filter(c=>c.url.endsWith('/oauth/token')).length,1);
 assert.equal(storage.auth.refreshToken,'new-refresh');
 mismatch=true;fetchCalls=[];
 network=async()=>Response.json({clientId:'public-id',redirectUri:'https://test.chromiumapp.org/oauth'});
 assert.equal((await send('connect')).ok,false);
 assert.equal(fetchCalls.filter(c=>c.url.endsWith('/oauth/token')).length,0);
 mismatch=false;
 network=async()=>new Response('',{status:429,headers:{'Retry-After':'120'}});
 assert.equal((await send('status')).ok,false);assert.ok(storage.blockedUntil>Date.now()+119000);
 fetchCalls=[];assert.equal((await send('status')).ok,false);assert.equal(fetchCalls.length,0);
 storage.auth.expiresAt=0;
 assert.equal((await send('status')).ok,false);assert.equal(storage.auth.refreshToken,'new-refresh','local cooldown must preserve refresh token');
 delete storage.blockedUntil;
 network=async()=>{throw new Error('connection lost');};
 assert.equal((await send('status')).ok,false);assert.equal(storage.auth,undefined);
});

