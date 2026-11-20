import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
let listener, network, mismatch=false, fetchCalls=[], storage={}, authWindows=0;
const legacyAuth={accessToken:'legacy-access',refreshToken:'legacy-refresh',expiresAt:Date.now()+3600000};
const local={auth:legacyAuth}, accessLevels=[];
function area(data,name) { return {
 setAccessLevel:async value=>accessLevels.push({name,...value}),
 get:async keys=>typeof keys==='string'?{[keys]:data[keys]}:Object.fromEntries(keys.map(k=>[k,data[k]])),
 set:async value=>Object.assign(data,value),remove:async keys=>{for(const k of Array.isArray(keys)?keys:[keys])delete data[k];}
}; }
globalThis.chrome={
 storage:{local:area(local,'local'),session:area(storage,'session')},
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
const send=(type,extra={})=>new Promise(resolve=>listener({type,...extra},{id:'test',url:'chrome-extension://test/popup.html'},resolve));
test('background: connect, serialized refresh, mismatch rejection, cooldown survive popup',async()=>{
 network=async(url,opts)=>{
  if(url.endsWith('/config'))return Response.json({clientId:'public-id',redirectUri:'https://test.chromiumapp.org/oauth'});
  if(url.endsWith('/oauth/token'))return Response.json({access_token:'access',refresh_token:'refresh',expires_in:3600});
  return Response.json({handle:'alice'});
 };
 assert.equal((await send('status')).data.handle,'alice');
 assert.deepEqual(storage.auth,legacyAuth);assert.equal(local.auth,undefined);
 assert.deepEqual(accessLevels,[{name:'local',accessLevel:'TRUSTED_CONTEXTS'},{name:'session',accessLevel:'TRUSTED_CONTEXTS'}]);
 fetchCalls=[];
 assert.equal((await send('connect')).ok,false,'connection requires disclosure consent');
 assert.equal(fetchCalls.length,0);assert.equal(authWindows,0);
 assert.equal((await send('connect',{consent:true})).data.handle,'alice');
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
 assert.equal((await send('connect',{consent:true})).ok,false);
 assert.equal(fetchCalls.filter(c=>c.url.endsWith('/oauth/token')).length,0);
 mismatch=false;
 network=async()=>new Response('',{status:429,headers:{'Retry-After':'120'}});
 assert.equal((await send('status')).ok,false);assert.ok(local.blockedUntil>Date.now()+119000);
 fetchCalls=[];assert.equal((await send('status')).ok,false);assert.equal(fetchCalls.length,0);
 storage.auth.expiresAt=0;
 assert.equal((await send('status')).ok,false);assert.equal(storage.auth.refreshToken,'new-refresh','local cooldown must preserve refresh token');
 delete local.blockedUntil;
 network=async()=>{throw new Error('connection lost');};
 assert.equal((await send('status')).ok,false);assert.equal(storage.auth,undefined);
 assert.equal(local.auth,undefined,'OAuth credentials must not be written to persistent storage');
});

test('disconnect preserves credentials on failure and deletes them only after successful retry',async()=>{
 storage.auth={accessToken:'access',refreshToken:'refresh',expiresAt:0};
 network=async(url,opts)=>{
  assert.ok(url.endsWith('/oauth/revoke'));assert.equal(JSON.parse(opts.body).token,'refresh');
  return Response.json({error:{code:'REVOKE_FAILED',message:'연결 해제 실패'}},{status:502});
 };
 assert.equal((await send('disconnect')).ok,false);assert.equal(storage.auth.refreshToken,'refresh');
 network=async()=>Response.json({});
 assert.equal((await send('disconnect')).ok,true);assert.equal(storage.auth,undefined);
});

test('untrusted senders are rejected and an empty browser session stays signed out without network',async()=>{
 for(const sender of [{id:'other',url:'chrome-extension://test/popup.html'},{id:'test',url:'https://example.com/'},
   {id:'test',url:'chrome-extension://test.evil/popup.html'}]) {
  assert.equal(listener({type:'status'},sender,()=>assert.fail('untrusted sender received a response')),false);
 }
 fetchCalls=[];
 assert.deepEqual((await send('status')).data,{handle:null});assert.equal(fetchCalls.length,0);
});

test('worker restart preserves session credentials, never restores stale disk tokens, and browser-session clearing signs out',async()=>{
 const current={accessToken:'current-access',refreshToken:'current-refresh',expiresAt:Date.now()+3600000};
 storage.auth=current;local.auth=legacyAuth;
 await import('data:text/javascript;base64,'+Buffer.from(source+'\n// restarted worker').toString('base64'));
 network=async(url,opts)=>{
  assert.ok(url.endsWith('/me'));assert.equal(opts.headers.Authorization,'Bearer current-access');
  return Response.json({handle:'alice'});
 };
 assert.equal((await send('status')).data.handle,'alice');
 assert.equal(storage.auth,current);assert.equal(local.auth,undefined);
 delete storage.auth;fetchCalls=[]; // Chrome clears storage.session on a browser restart.
 assert.deepEqual((await send('status')).data,{handle:null});assert.equal(fetchCalls.length,0);
});

test('failed migration still removes legacy disk credentials and performs no network request',async()=>{
 local.auth=legacyAuth;
 const set=chrome.storage.session.set;
 chrome.storage.session.set=async()=>{throw new Error('session storage unavailable');};
 try {
  await import('data:text/javascript;base64,'+Buffer.from(source+'\n// failed migration').toString('base64'));
  fetchCalls=[];
  assert.equal((await send('status')).ok,false);
  assert.equal(local.auth,undefined);assert.equal(storage.auth,undefined);assert.equal(fetchCalls.length,0);
 } finally { chrome.storage.session.set=set; }
});

