const assert=require('node:assert/strict');
const test=require('node:test');
const fs=require('node:fs');
const vm=require('node:vm');

const source=fs.readFileSync('web/security-v443.js','utf8');
const boot=fs.readFileSync('web/security-boot-v443.js','utf8');

class Storage{
 constructor(seed={}){this.values=new Map(Object.entries(seed))}
 getItem(k){return this.values.has(k)?this.values.get(k):null}
 setItem(k,v){this.values.set(k,String(v))}
 removeItem(k){this.values.delete(k)}
}
const jwt=exp=>`x.${Buffer.from(JSON.stringify({exp})).toString('base64url')}.x`;
const response=(status,body)=>({status,ok:status>=200&&status<300,text:async()=>body==null?'':JSON.stringify(body),json:async()=>body});

function runtime(storage,fetch){
 const elements=new Map();
 const element=id=>{if(!elements.has(id))elements.set(id,{value:'',textContent:'',style:{display:'',removeProperty(){}},classList:{add(){},remove(){}},remove(){},focus(){},disabled:false});return elements.get(id)};
 const context={console,TextEncoder,TextDecoder,Buffer,URL,AbortController,crypto:require('node:crypto').webcrypto,
  atob:s=>Buffer.from(s,'base64').toString('binary'),btoa:s=>Buffer.from(s,'binary').toString('base64'),
  localStorage:storage,sessionStorage:new Storage(),fetch,SB:'https://example.supabase.co',KEY:'publishable',token:storage.getItem('trts_token')||'',
  TRTS_OPS:{E:String,view:()=>element('view')},navigator:{},location:{reload(){},replace(){}},setInterval(){},setTimeout,clearTimeout,
  addEventListener(){},document:{hidden:false,querySelector:s=>element(s.replace(/^#/,'').replace('loginForm button','loginButton')),addEventListener(){},createElement:()=>element('created'),body:{append(){}}},
  start:async()=>{},window:null};
 context.window=context;vm.runInNewContext(source,context,{filename:'security-v443.js'});return{context,elements,element};
}

test('build migration never races login with remote global logout',()=>{
 assert.doesNotMatch(boot,/auth\/v1\/logout/);
 assert.doesNotMatch(boot,/scope=global/);
 assert.match(boot,/trts_session_v1/);
});

test('sign-in persists one matching access and refresh pair',async()=>{
 const storage=new Storage({trts_token:'stale-access',trts_refresh:'stale-refresh'}),access=jwt(Date.now()/1000+3600),calls=[];
 const fetch=async(url,opt={})=>{calls.push({url,opt});if(url.includes('grant_type=password'))return response(200,{access_token:access,refresh_token:'refresh-a',expires_at:999});if(url.endsWith('/auth/v1/user'))return response(200,{id:'u1'});if(url.includes('/rest/v1/profiles'))return response(200,[{id:'u1',active:true}]);throw Error(url)};
 const {context,element}=runtime(storage,fetch);element('email').value='user@example.com';element('password').value='secret';await context.signIn();
 const stored=JSON.parse(storage.getItem('trts_session_v1'));assert.equal(stored.access_token,access);assert.equal(stored.refresh_token,'refresh-a');assert.equal(storage.getItem('trts_token'),access);assert.equal(storage.getItem('trts_refresh'),'refresh-a');
 assert.equal(calls.find(x=>x.url.endsWith('/auth/v1/user')).opt.headers.Authorization,`Bearer ${access}`);
});

test('parallel protected requests use one refresh and both send the rotated access token',async()=>{
 const old=jwt(1),fresh=jwt(Date.now()/1000+3600),storage=new Storage({trts_session_v1:JSON.stringify({access_token:old,refresh_token:'refresh-old'}),trts_token:'stale-mirror',trts_refresh:'stale-mirror'});let refreshes=0,protectedHeaders=[];
 const fetch=async(url,opt={})=>{if(url.endsWith('/auth/v1/user'))return response(200,{id:'u1'});if(url.includes('/rest/v1/profiles'))return response(200,[{id:'u1',active:true}]);if(url.includes('grant_type=refresh_token')){refreshes++;await new Promise(r=>setTimeout(r,5));return response(200,{access_token:fresh,refresh_token:'refresh-new'})}protectedHeaders.push(opt.headers.Authorization);return response(200,[])};
 const {context}=runtime(storage,fetch);await new Promise(r=>setTimeout(r,0));await Promise.all([context.api('/rest/v1/routes'),context.api('/rest/v1/route_points')]);
 assert.equal(refreshes,1);assert.deepEqual(protectedHeaders,[`Bearer ${fresh}`,`Bearer ${fresh}`]);assert.equal(storage.getItem('trts_token'),fresh);assert.equal(storage.getItem('trts_refresh'),'refresh-new');
});

test('reload restores the authoritative pair and never stale token mirrors',async()=>{
 const current=jwt(Date.now()/1000+3600),storage=new Storage({trts_session_v1:JSON.stringify({access_token:current,refresh_token:'current-refresh'}),trts_token:'stale-access',trts_refresh:'stale-refresh'});let authHeader='';
 runtime(storage,async(url,opt={})=>{if(url.endsWith('/auth/v1/user')){authHeader=opt.headers.Authorization;return response(200,{id:'u1'})}if(url.includes('/rest/v1/profiles'))return response(200,[{id:'u1',active:true}]);return response(200,[])});await new Promise(r=>setTimeout(r,0));
 assert.equal(authHeader,`Bearer ${current}`);
});

test('a protected 401 refreshes once and retries with the new access token',async()=>{
 const access=jwt(Date.now()/1000+3600),fresh=jwt(Date.now()/1000+7200),storage=new Storage({trts_session_v1:JSON.stringify({access_token:access,refresh_token:'refresh-a'}),trts_token:access,trts_refresh:'refresh-a'});let protectedCalls=0,refreshes=0;
 const {context}=runtime(storage,async(url,opt={})=>{if(url.endsWith('/auth/v1/user'))return response(200,{id:'u1'});if(url.includes('/rest/v1/profiles'))return response(200,[{id:'u1',active:true}]);if(url.includes('grant_type=refresh_token')){refreshes++;return response(200,{access_token:fresh,refresh_token:'refresh-b'})}if(url.includes('/functions/v1/transport-adapter-read')){protectedCalls++;return protectedCalls===1?response(401,{error:'Invalid or expired session'}):response(200,[{route_key:'rt2_ok'}])}throw Error(url)});
 await new Promise(r=>setTimeout(r,0));const rows=await context.api('/functions/v1/transport-adapter-read',{method:'POST',body:'{}'});assert.equal(refreshes,1);assert.equal(protectedCalls,2);assert.equal(rows[0].route_key,'rt2_ok');assert.equal(storage.getItem('trts_refresh'),'refresh-b');
});

test('invalid rotated refresh token clears every local session representation',async()=>{
 const old=jwt(1),storage=new Storage({trts_session_v1:JSON.stringify({access_token:old,refresh_token:'used-refresh'}),trts_token:old,trts_refresh:'used-refresh'});
 runtime(storage,async url=>url.includes('grant_type=refresh_token')?response(400,{msg:'Invalid Refresh Token: Refresh Token Not Found'}):url.endsWith('/auth/v1/user')?response(200,{id:'u1'}):response(200,[{id:'u1',active:true}]));await new Promise(r=>setTimeout(r,10));
 for(const key of ['trts_session_v1','trts_token','trts_refresh'])assert.equal(storage.getItem(key),null);
});

test('explicit logout revokes only the current session and clears local auth',()=>{
 assert.match(source,/auth\/v1\/logout\?scope=local/);
 assert.doesNotMatch(source,/auth\/v1\/logout\?scope=global/);
});
