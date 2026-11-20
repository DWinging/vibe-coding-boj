import test from 'node:test';
import assert from 'node:assert/strict';
import { buildQuery, retrySeconds, problemDestination } from '../js/protocol.js';
import { handle, ApiBudget } from '../worker/index.js';
const id = 'ijfpnmabjoobcklmokacphodhmechhdk';
const env = { CLIENT_ID: 'test-client', CLIENT_SECRET: 'test-secret', EXTENSION_ID: id,
 BUDGET: { idFromName: x => x, get: () => ({ fetch: async () => Response.json({}) }) } };
const req = (path, body = {}, token) => new Request('https://test.invalid' + path, { method: 'POST',
 headers: { Origin: 'chrome-extension://' + id, 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
 body: JSON.stringify(body) });
test('query keeps tag OR and explicit unsolved ID; rejects injection and budgets', () => {
 assert.equal(buildQuery({min:11,max:15,tags:['dp','math','dp']},'alice'), '*11..15 %ko -@alice (#dp|#math)');
 for (const input of [{min:30,max:1}, {min:1,max:30,tags:['dp|id:1']}, {min:1,max:30,tags:Array.from({length:8},(_,i)=>'tag'+i)}, {min:1,max:30,tags:['a'.repeat(100)]}])
   assert.throws(()=>buildQuery(input,'alice'));
});
test('Korean filter applies to anonymous and signed-in searches and counts against budget', () => {
 const tags=Array.from({length:5},(_,i)=>'tag'+i);
 assert.equal(buildQuery({min:1,max:30,tags:[]}), '*1..30 %ko');
 assert.match(buildQuery({min:1,max:30,tags},'alice'), / %ko -@alice /);
 assert.throws(()=>buildQuery({min:1,max:30,tags:[...tags,'tag5']},'alice'));
 assert.throws(()=>buildQuery({min:1,max:30,tags:[...tags,'tag5']}), /알고리즘은 최대 5개 까지 선택 가능합니다\./);
});
test('Worker always sends Korean condition and does not retry without it on no match',async()=>{
 for (const token of [undefined,'user-token']) {
   let searches=0;
   const res=await handle(req('/random',{min:1,max:5,tags:['dp']},token),env,async(url)=>{
     if(url.endsWith('/me')) return Response.json({id:1,handle:'alice'});
     const q=new URL(url).searchParams.get('q');
     assert.equal(q,token?'*1..5 %ko -@alice (#dp)':'*1..5 %ko (#dp)');
     searches++;
     return Response.json({error:{code:'NOT_FOUND'}},{status:404});
   });
   assert.equal(res.status,404);assert.equal(searches,1);
 }
});
test('Retry-After supports seconds and HTTP date', () => {
 assert.equal(retrySeconds('120'),120);
 assert.equal(retrySeconds('Thu, 01 Jan 1970 00:01:00 GMT',0),60);
 assert.equal(retrySeconds(null),60);
});
test('destination opens BOJ and prefers the mapped judge problem number', () => {
 assert.throws(()=>problemDestination({problemId:19917,subId:'a'}));
 assert.throws(()=>problemDestination({problemId:19917,judgeIds:[]}));
 assert.equal(problemDestination({problemId:19759,judgeIds:[{ojId:'boj',problemId:'28955'}]}),'https://www.acmicpc.net/problem/28955');
 assert.throws(()=>problemDestination({problemId:1000,judgeIds:[{ojId:'other',problemId:'1000'}]}));
 assert.throws(()=>problemDestination({problemId:1000,judgeIds:[{ojId:'boj',problemId:'1000/../../bad'}]}));
 assert.throws(()=>problemDestination({problemId:'https://evil.invalid'}));
});
test('authenticated recommendation gets handle from /me and minimizes response', async () => {
 const calls=[];
 const res=await handle(req('/random',{min:11,max:15,tags:['dp'],requireAccount:true},'user-token'),env, async(url, options)=>{
   calls.push({url,options}); assert.equal(options.headers['x-client-secret'],'test-secret');
   return url.endsWith('/me') ? Response.json({id:1,handle:'alice'}) : Response.json({problemId:1000,subId:'',level:11,tags:['extra'],judgeIds:[{ojId:'boj',problemId:'1000'}]});
 });
 assert.equal(res.status,200); assert.deepEqual(await res.json(),{problemId:1000,subId:'',level:11,judgeIds:[{ojId:'boj',problemId:'1000'}]});
 assert.match(decodeURIComponent(calls[1].url),/-@alice/);
 assert.equal(calls[0].options.headers.Authorization,'Bearer user-token');
 assert.equal(calls[1].options.headers.Authorization,undefined);
});
test('429 propagates Retry-After without retry',async()=>{
 let calls=0;
 const res=await handle(req('/random',{min:1,max:5}),env,async()=>{calls++;return new Response('',{status:429,headers:{'Retry-After':'120'}});});
 assert.equal(res.status,429);assert.equal(res.headers.get('Retry-After'),'120');assert.equal(calls,1);
});
test('missing BOJ mappings trigger bounded re-pick with unchanged filters and per-attempt quota',async()=>{
 let reservations=0, searches=0, me=0;
 const quota={...env,BUDGET:{idFromName:x=>x,get:()=>({fetch:async()=>{reservations++;return Response.json({});}})}};
 const res=await handle(req('/random',{min:11,max:15,tags:['dp']},'user-token'),quota,async url=>{
   if(url.endsWith('/me')){me++;return Response.json({id:1,handle:'alice'});}
   searches++;
   assert.equal(new URL(url).searchParams.get('q'),'*11..15 %ko -@alice (#dp)');
   return Response.json(searches<3?{problemId:1000,judgeIds:searches===1?[]:[{ojId:'other',problemId:'1000'}]}:
     {problemId:19759,level:15,judgeIds:[{ojId:'boj',problemId:'28955'}]});
 });
 assert.equal(res.status,200);assert.equal(searches,3);assert.equal(reservations,3);assert.equal(me,1);
 assert.equal(problemDestination(await res.json()),'https://www.acmicpc.net/problem/28955');
});
test('three non-BOJ results stop without inventing a BOJ URL',async()=>{
 let calls=0;
 const res=await handle(req('/random',{min:1,max:5}),env,async()=>{calls++;return Response.json({problemId:1000,judgeIds:[]});});
 assert.equal(calls,3);assert.equal(res.status,404);assert.equal((await res.json()).error.code,'NO_BOJ_MATCH');
});
test('429 during re-pick immediately stops and preserves Retry-After',async()=>{
 let calls=0;
 const res=await handle(req('/random',{min:1,max:5}),env,async()=>{
   calls++;return calls===1?Response.json({problemId:1000,judgeIds:[]}):new Response('',{status:429,headers:{'Retry-After':'90'}});
 });
 assert.equal(calls,2);assert.equal(res.status,429);assert.equal(res.headers.get('Retry-After'),'90');
});
test('local budget rejection stops re-pick before another upstream request',async()=>{
 let reservations=0, calls=0;
 const quota={...env,BUDGET:{idFromName:x=>x,get:()=>({fetch:async()=>{
   reservations++;return reservations===1?Response.json({}):Response.json({error:{code:'RATE_LIMITED'}},{status:429,headers:{'Retry-After':'5'}});
 }})}};
 const res=await handle(req('/random',{min:1,max:5}),quota,async()=>{calls++;return Response.json({problemId:1000,judgeIds:[]});});
 assert.equal(calls,1);assert.equal(res.status,429);assert.equal(res.headers.get('Retry-After'),'5');
});
test('401 never falls back to anonymous recommendation',async()=>{
 let calls=0;
 const res=await handle(req('/random',{min:1,max:5},'expired'),env,async()=>{calls++;return Response.json({error:{code:'USER_TOKEN_REQUIRED'}},{status:401});});
 assert.equal(res.status,401);assert.equal(calls,1);
 assert.equal((await handle(req('/random',{min:1,max:5,requireAccount:true}),env)).status,401);
});
test('OAuth enforces redirect and PKCE; selects allowed fields only',async()=>{
 let calls=0;
 const fetcher=async(url,o)=>{calls++;const b=JSON.parse(o.body);assert.equal(b.redirect_uri,'https://'+id+'.chromiumapp.org/oauth');assert.equal(b.client_secret,undefined);return Response.json({access_token:'access',refresh_token:'refresh',expires_in:3600});};
 const body={grant_type:'authorization_code',code:'c',code_verifier:'x'.repeat(43),redirect_uri:'https://evil.invalid'};
 assert.equal((await handle(req('/oauth/token',body),env,fetcher)).status,400);assert.equal(calls,0);
 body.redirect_uri='https://'+id+'.chromiumapp.org/oauth';body.client_secret='injected';
 assert.equal((await handle(req('/oauth/token',body),env,fetcher)).status,200);assert.equal(calls,1);
});
test('RFC7009 empty revocation response accepted',async()=>{
 assert.equal((await handle(req('/oauth/revoke',{token:'refresh'}),env,async()=>new Response(null,{status:200}))).status,200);
});
test('missing storage binding is configuration failure, not network delay', async()=>{
 const res=await handle(req('/config'),{...env,BUDGET:undefined});
 assert.equal(res.status,503);
 assert.equal((await res.json()).error.code,'BUDGET_NOT_CONFIGURED');
});
test('storage exception and upstream timeout/network errors are distinct', async()=>{
 const broken={...env,BUDGET:{idFromName:x=>x,get:()=>{throw new TypeError('storage unavailable');}}};
 const storage=await handle(req('/random',{min:1,max:5}),broken);
 assert.equal((await storage.json()).error.code,'BUDGET_UNAVAILABLE');
 for (const [name,code,status] of [['TimeoutError','UPSTREAM_TIMEOUT',504],['TypeError','UPSTREAM_NETWORK',502]]) {
   const res=await handle(req('/random',{min:1,max:5}),env,async()=>{const e=new Error('failure');e.name=name;throw e;});
   assert.equal(res.status,status);assert.equal((await res.json()).error.code,code);
 }
});
test('redirect is not followed with app credentials',async()=>{
 const res=await handle(req('/random',{min:1,max:5}),env,async(url,opts)=>{
   assert.equal(opts.redirect,'manual');
   return new Response(null,{status:302,headers:{Location:'https://other.invalid'}});
 });
 assert.equal((await res.json()).error.code,'UPSTREAM_REDIRECT');
});
test('development and store origins get separate registered redirects', async()=>{
 const dev='chbfbmgdfjoabckohpopnmhcagchcpem';
 const multi={...env,EXTENSION_IDS:id+','+dev};
 const request=req('/config');
 request.headers.set('Origin','chrome-extension://'+dev);
 const res=await handle(request,multi);
 assert.equal(res.status,200);
 assert.equal((await res.json()).redirectUri,'https://'+dev+'.chromiumapp.org/oauth');
 const missing=await handle(req('/config'),{...env,CLIENT_ID:''});
 assert.equal(missing.status,503);
 const error=await missing.json();
 assert.match(error.error.message,/CLIENT_ID/);
 assert.ok(!JSON.stringify(error).includes('test-secret'));
});
test('404, disallowed origin, and oversized bodies handled',async()=>{
 assert.equal((await handle(req('/random',{min:1,max:5}),env,async()=>Response.json({error:{code:'NOT_FOUND'}},{status:404}))).status,404);
 assert.equal((await handle(new Request('https://test.invalid/config',{method:'POST'}),env)).status,403);
 assert.equal((await handle(req('/random',{payload:'x'.repeat(20000)}),env)).status,413);
});
test('global budget survives object recreation and records upstream cooldown',async()=>{
 const data=new Map();const ctx={storage:{get:async k=>data.get(k),put:async(k,v)=>data.set(k,structuredClone(v))},blockConcurrencyWhile:fn=>fn()};
 const gate=new ApiBudget(ctx);
 for(let i=0;i<15;i++) assert.equal((await gate.fetch(req('/check'))).status,200);
 assert.equal((await new ApiBudget(ctx).fetch(req('/check'))).status,429);
 await gate.fetch(req('/block',{blockSeconds:300}));
 assert.ok(Number((await new ApiBudget(ctx).fetch(req('/check'))).headers.get('Retry-After'))>=299);
});

