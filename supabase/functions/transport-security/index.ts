import { generateRegistrationOptions, verifyRegistrationResponse, generateAuthenticationOptions, verifyAuthenticationResponse } from 'npm:@simplewebauthn/server@13.2.2';
const URL_BASE=Deno.env.get('SUPABASE_URL')!,SERVICE=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,PUBLIC_KEY=Deno.env.get('SUPABASE_ANON_KEY')!;
const rpID='transport-report-ts-web.pages.dev';
const bytes=(s:string)=>Uint8Array.from(atob(s),c=>c.charCodeAt(0)),base64=(b:Uint8Array)=>btoa(String.fromCharCode(...b));
const sha=async(s:string)=>'\\x'+[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)))].map(x=>x.toString(16).padStart(2,'0')).join('');
async function rest(path:string,method='GET',body?:unknown){
 const r=await fetch(URL_BASE+'/rest/v1/'+path,{method,headers:{apikey:SERVICE,Authorization:'Bearer '+SERVICE,'Content-Type':'application/json',Prefer:'return=representation'},body:body===undefined?undefined:JSON.stringify(body)});
 if(!r.ok)throw Error('Операцію не підтверджено');const text=await r.text();return text?JSON.parse(text):null;
}
async function user(req:Request){
 const auth=req.headers.get('authorization')||'';if(!auth.startsWith('Bearer '))throw Error('Потрібен вхід через email і пароль');
 const r=await fetch(URL_BASE+'/auth/v1/user',{headers:{apikey:PUBLIC_KEY,Authorization:auth}});
 if(!r.ok)throw Error('Сесія завершилась. Увійдіть через email і пароль');const u=await r.json();
 const profiles=await rest('profiles?id=eq.'+encodeURIComponent(u.id)+'&active=eq.true&select=id');if(!profiles.length)throw Error('Профіль недоступний');return u;
}
Deno.serve(async req=>{
 const origin=req.headers.get('origin')||'',allowed=/^https:\/\/(?:[a-z0-9-]+\.)?transport-report-ts-web\.pages\.dev$/.test(origin);
 const headers={'Content-Type':'application/json','Cache-Control':'no-store','Access-Control-Allow-Origin':allowed?origin:'https://transport-report-ts-web.pages.dev','Access-Control-Allow-Headers':'authorization,apikey,content-type','Access-Control-Allow-Methods':'POST,OPTIONS','Vary':'Origin'};
 const reply=(value:unknown,status=200)=>new Response(JSON.stringify(value),{status,headers});
 if(!allowed)return reply({error:'Origin not allowed'},403);
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers});if(req.method!=='POST')return reply({error:'Method not allowed'},405);
 try{
  if(Number(req.headers.get('content-length')||0)>20000)return reply({error:'Request too large'},413);
  const raw=await req.text();if(raw.length>20000)return reply({error:'Request too large'},413);const body=JSON.parse(raw),action=body.action;
  if(action==='enroll'){
   const u=await user(req);if(!/^\d{4}$/.test(body.pin)||typeof body.secret!=='string'||body.secret.length<40)throw Error('Вкажіть 4 цифри PIN');
   const result=await rest('rpc/transport_enroll_device','POST',{owner_id:u.id,pin:body.pin,device_secret:body.secret});return reply(result);
  }
  if(!/^[a-f0-9-]{36}$/i.test(body.deviceId)||typeof body.secret!=='string'||body.secret.length<40)throw Error('Пристрій недоступний');
  if(action==='unlock'){
   const result=await rest('rpc/transport_unlock_device','POST',{device_id:body.deviceId,pin:String(body.pin||''),device_secret:body.secret});return reply(result,result.ok?200:401);
  }
  const ds=await rest('transport_device_vaults?id=eq.'+encodeURIComponent(body.deviceId)+'&select=*'),d=ds[0];
  if(!d||d.disabled||d.secret_hash!==await sha(body.secret))throw Error('Пристрій недоступний');
  const profiles=await rest('profiles?id=eq.'+d.user_id+'&active=eq.true&select=id');if(!profiles.length)throw Error('Профіль недоступний');
  const patch=(data:unknown)=>rest('transport_device_vaults?id=eq.'+d.id,'PATCH',data);
  if(['disable','biometric-disable','register-start','register-finish'].includes(action)){
   const u=await user(req);if(u.id!==d.user_id)throw Error('Доступ заборонений');
   if(action==='disable'){await patch({disabled:true,unlock_key:'',credential:null,challenge:null});return reply({ok:true})}
   if(action==='biometric-disable'){await patch({credential:null,challenge:null});return reply({ok:true})}
  }
  if(action==='register-start'){
   const options=await generateRegistrationOptions({rpName:'Transport Report TS',rpID,userName:d.user_id,userID:new TextEncoder().encode(d.user_id),attestationType:'none',authenticatorSelection:{authenticatorAttachment:'platform',residentKey:'preferred',userVerification:'required'},supportedAlgorithmIDs:[-7,-257]});
   await patch({challenge:{value:options.challenge,type:'register',origin,expires:Date.now()+180000}});return reply(options);
  }
  if(action==='authenticate-start'){
   if(!d.credential)throw Error('Біометрію не налаштовано');
   const options=await generateAuthenticationOptions({rpID,allowCredentials:[{id:d.credential.id,transports:d.credential.transports}],userVerification:'required'});
   await patch({challenge:{value:options.challenge,type:'authenticate',origin,expires:Date.now()+180000}});return reply(options);
  }
  const type=action==='register-finish'?'register':action==='authenticate-finish'?'authenticate':null,c=d.challenge;
  if(!type||!c||c.type!==type||c.origin!==origin||c.expires<Date.now())throw Error('Підтвердження протерміновано. Спробуйте ще раз');
  // Atomic challenge consumption prevents replay and concurrent successful assertions.
  const consumed=await rest('transport_device_vaults?id=eq.'+d.id+'&challenge->>value=eq.'+encodeURIComponent(c.value),'PATCH',{challenge:null});if(!consumed.length)throw Error('Підтвердження вже використане');
  if(type==='register'){
   const result=await verifyRegistrationResponse({response:body.response,expectedChallenge:c.value,expectedOrigin:origin,expectedRPID:rpID,requireUserVerification:true});
   if(!result.verified||!result.registrationInfo)throw Error('Пристрій не підтвердив реєстрацію');
   const credential=result.registrationInfo.credential;
   await patch({credential:{...credential,publicKey:base64(credential.publicKey)},updated_at:new Date().toISOString()});return reply({ok:true});
  }
  const result=await verifyAuthenticationResponse({response:body.response,expectedChallenge:c.value,expectedOrigin:origin,expectedRPID:rpID,credential:{...d.credential,publicKey:bytes(d.credential.publicKey)},requireUserVerification:true});
  if(!result.verified)throw Error('Не вдалося підтвердити пристрій');
  await patch({credential:{...d.credential,counter:result.authenticationInfo.newCounter},attempts:0,locked_until:null});
  return reply({ok:true,key:d.unlock_key,user_id:d.user_id});
 }catch(e){return reply({error:e instanceof Error?e.message:'Не вдалося виконати операцію'},400)}
});
