// Runs the shipped Edge handler unchanged (TypeScript transpilation only).
// Only Supabase storage/Auth are isolated; WebAuthn verification is the real library.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),crypto=require('node:crypto');
module.exports=async function makeFixture(){
 const deps=process.env.TRTS_TEST_DEPS||'/tmp/trts-ui-tests/node_modules',ts=require(path.join(deps,'typescript')),webauthn=await import(path.join(deps,'@simplewebauthn/server/esm/index.js'));
 const id='00000000-0000-0000-0000-000000000443',devices=new Map(),hash=s=>'\\x'+crypto.createHash('sha256').update(s).digest('hex');
 const json=x=>new Response(JSON.stringify(x),{headers:{'Content-Type':'application/json'}});
 const fetchMock=async(url,options={})=>{
  const u=new URL(url),table=u.pathname.split('/').at(-1),body=options.body?JSON.parse(options.body):null;
  if(u.pathname==='/auth/v1/user')return options.headers.Authorization==='Bearer isolated-runtime-fixture'?json({id}):new Response('{}',{status:401});
  if(table==='profiles')return json([{id,active:true}]);
  if(table==='transport_enroll_device'){
   const device={id:crypto.randomUUID(),user_id:id,secret_hash:hash(body.device_secret),pin:body.pin,unlock_key:crypto.randomBytes(32).toString('base64'),attempts:0,disabled:false};devices.set(device.id,device);return json({id:device.id,key:device.unlock_key});
  }
  if(table==='transport_unlock_device'){
   const d=devices.get(body.device_id);if(!d||d.disabled||d.secret_hash!==hash(body.device_secret))return json({ok:false,error:'Пристрій недоступний'});
   if(d.attempts>=5)return json({ok:false,error:'Забагато спроб'});if(d.pin!==body.pin){d.attempts++;return json({ok:false,error:'Невірний PIN'})}d.attempts=0;return json({ok:true,key:d.unlock_key,user_id:id});
  }
  if(table==='transport_device_vaults'){
   const d=devices.get((u.searchParams.get('id')||'').slice(3));if(!d)return json([]);
   if(u.searchParams.has('challenge->>value')&&d.challenge?.value!==u.searchParams.get('challenge->>value').slice(3))return json([]);
   if(options.method==='PATCH')Object.assign(d,body);return json([d]);
  }
  throw Error('Unexpected security fixture request '+u.pathname);
 };
 let handle;
 const source=fs.readFileSync(path.join(__dirname,'../supabase/functions/transport-security/index.ts'),'utf8').replace(/import \{([^}]+)\} from '[^']+';/,'const {$1}=webauthn;');
 const js=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
 vm.runInNewContext(js,{webauthn,Deno:{env:{get:key=>key==='SUPABASE_URL'?'https://security.test':'fixture'},serve:fn=>handle=fn},fetch:fetchMock,crypto:crypto.webcrypto,TextEncoder,TextDecoder,Uint8Array,Response,Request,Date,JSON,Error,Number,String,atob,btoa,encodeURIComponent});
 return{handle,devices};
};
