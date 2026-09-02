(()=>{
 'use strict';
 const $=s=>document.querySelector(s),E=TRTS_OPS.E,VAULT='trts_vault',CONFIG='trts_security',encoder=new TextEncoder(),decoder=new TextDecoder();
 let session=null,key=null,profile=null,userInfo=null,refreshing=null,busy=false,epoch=0,activity=Date.now();
 const b64=bytes=>btoa(String.fromCharCode(...new Uint8Array(bytes))),un64=text=>Uint8Array.from(atob(text),c=>c.charCodeAt(0)),url64=b=>b64(b).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');
 const fromURL=s=>un64(s.replaceAll('-','+').replaceAll('_','/')+'='.repeat((4-s.length%4)%4));
 const vault=()=>{try{return JSON.parse(localStorage.getItem(VAULT)||'null')}catch{return null}},config=()=>{try{return{minutes:5,leave:true,...JSON.parse(localStorage.getItem(CONFIG)||'{}')}}catch{return{minutes:5,leave:true}}};
 const locked=()=>Boolean(vault()&&!window.TRTS_UNLOCKED);
 async function security(action,extra={}){
  const v=vault(),r=await fetch(SB+'/functions/v1/transport-security',{method:'POST',headers:{apikey:KEY,'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:JSON.stringify({action,deviceId:v?.id,secret:v?.secret,...extra})}),data=await r.json();
  if(!r.ok||data.ok===false)throw Error(data.error||'Не вдалося підтвердити пристрій');return data;
 }
 async function saveSession(){
  if(!session)return;if(key&&vault()){
   const iv=crypto.getRandomValues(new Uint8Array(12)),cipher=await crypto.subtle.encrypt({name:'AES-GCM',iv},key,encoder.encode(JSON.stringify(session))),v=vault();
   localStorage.setItem(VAULT,JSON.stringify({...v,iv:b64(iv),cipher:b64(cipher)}));localStorage.removeItem('trts_token');localStorage.removeItem('trts_refresh');
  }else if(!vault()){localStorage.trts_token=session.access_token;if(session.refresh_token)localStorage.trts_refresh=session.refresh_token}
 }
 async function refresh(force=false){
  if(locked())throw Error('Застосунок заблоковано');if(!session)return;
  let expiry=0;try{expiry=JSON.parse(decoder.decode(fromURL(session.access_token.split('.')[1]))).exp||0}catch{}
  if(!force&&(!expiry||expiry*1000>Date.now()+60000))return;
  if(!session.refresh_token){if(expiry&&expiry*1000<=Date.now())throw Error('Сесія завершилась. Увійдіть через email і пароль');return}
  if(refreshing)return refreshing;const generation=epoch;
  refreshing=(async()=>{
   const r=await fetch(SB+'/auth/v1/token?grant_type=refresh_token',{method:'POST',headers:{apikey:KEY,'Content-Type':'application/json'},body:JSON.stringify({refresh_token:session.refresh_token})}),s=await r.json();if(!r.ok)throw Error('Сесія завершилась. Увійдіть через email і пароль');
   if(generation!==epoch)throw Error('Застосунок заблоковано');session=s;token=s.access_token;await saveSession();
  })();try{await refreshing}finally{refreshing=null}
 }
 const originalApi=window.api;
 window.api=async(path,options={})=>{if(locked())throw Error('Спочатку розблокуйте застосунок');const generation=epoch;await refresh();const result=await originalApi(path,options);if(generation!==epoch)throw Error('Сесію заблоковано');if(options.method&&options.method!=='GET')window.TRTS_DASHBOARD?.invalidate();return result};
 async function identify(){
  const u=await api('/auth/v1/user');if(!u?.id)throw Error('Не вдалося перевірити користувача');
  const rows=await api('/rest/v1/profiles?id=eq.'+encodeURIComponent(u.id)+'&select=id,full_name,role,active,allowed_waves');
  if(!rows?.[0]?.active)throw Error('Профіль вимкнений або не налаштований');userInfo=u;profile=rows[0];return profile;
 }
 window.signIn=async()=>{
  if(busy)return;busy=true;const err=$('#loginErr');if(err)err.textContent='';const button=$('#loginForm button');if(button)button.disabled=true;
  try{
   const r=await fetch(SB+'/auth/v1/token?grant_type=password',{method:'POST',headers:{apikey:KEY,'Content-Type':'application/json'},body:JSON.stringify({email:$('#email').value.trim(),password:$('#password').value})}),s=await r.json();
   $('#password').value='';if(!r.ok)throw Error(s.error_description||s.msg||'Помилка входу');
   const old=vault();session=s;token=s.access_token;window.TRTS_UNLOCKED=true;await identify();
   if(old){try{await security('disable')}catch{}localStorage.removeItem(VAULT);key=null}
   await saveSession();activity=Date.now();$('#v443-unlock')?.remove();await window.start();
  }catch(e){token='';session=null;if(err)err.textContent=e.message}finally{busy=false;if(button)button.disabled=false}
 };
 window.logout=async()=>{
  if(busy)return;busy=true;
  try{if(vault()&&token)await security('disable');if(token){const r=await fetch(SB+'/auth/v1/logout',{method:'POST',headers:{apikey:KEY,Authorization:'Bearer '+token}});if(!r.ok&&r.status!==401)throw Error('Сервер не підтвердив завершення сесії')}}
  catch(e){alert(e.message);busy=false;return}
  localStorage.removeItem(VAULT);localStorage.removeItem('trts_token');localStorage.removeItem('trts_refresh');session=null;key=null;token='';profile=null;++epoch;location.reload();
 };
 function showLock(){
  $('#app')?.classList.add('hide');$('#login')?.classList.add('hide');let el=$('#v443-unlock');if(!el){el=document.createElement('div');el.id='v443-unlock';el.className='v443-unlock v443-settings';document.body.append(el)}
  el.innerHTML='<section><img src="./icon.png" width="64" height="64" alt="Transport Report TS"><h1>Застосунок заблоковано</h1><p>Розблокуйте поточну сесію на цьому пристрої.</p><form onsubmit="event.preventDefault();v443UnlockPIN()"><label>4-значний PIN<input id="v443-unlock-pin" type="password" inputmode="numeric" pattern="[0-9]{4}" maxlength="4" autocomplete="off" required aria-label="PIN для розблокування"></label><button type="submit" class="primary">Розблокувати</button></form>'+(vault()?.biometric?'<button onclick="v443BiometricUnlock()">Face ID / Touch ID / захист пристрою</button>':'')+'<p id="v443-unlock-error" role="alert"></p><button onclick="v443PasswordRecovery()">Увійти через email і пароль</button></section>';
 }
 async function unlock(rawKey){
  key=await crypto.subtle.importKey('raw',un64(rawKey),'AES-GCM',false,['encrypt','decrypt']);const v=vault();
  session=JSON.parse(decoder.decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:un64(v.iv)},key,un64(v.cipher))));token=session.access_token;window.TRTS_UNLOCKED=true;
  try{await refresh(true);await identify();await saveSession();activity=Date.now();$('#v443-unlock')?.remove();await start()}catch(e){window.TRTS_UNLOCKED=false;token='';session=null;key=null;throw e}
 }
 window.v443UnlockPIN=async()=>{if(busy)return;busy=true;try{const result=await security('unlock',{pin:$('#v443-unlock-pin').value});$('#v443-unlock-pin').value='';await unlock(result.key)}catch(e){$('#v443-unlock-error').textContent=e.message}finally{busy=false}};
 function credentialJSON(c){
  if(c.toJSON)return c.toJSON();const response=c.response,result={id:c.id,rawId:url64(c.rawId),type:c.type,clientExtensionResults:c.getClientExtensionResults(),authenticatorAttachment:c.authenticatorAttachment,response:{clientDataJSON:url64(response.clientDataJSON)}};
  for(const field of ['attestationObject','authenticatorData','signature','userHandle'])if(response[field])result.response[field]=url64(response[field]);
  if(response.getTransports)result.response.transports=response.getTransports();return result;
 }
 function decodeOptions(options){const p={...options,challenge:fromURL(options.challenge)};if(options.user)p.user={...options.user,id:fromURL(options.user.id)};for(const name of ['allowCredentials','excludeCredentials'])if(options[name])p[name]=options[name].map(x=>({...x,id:fromURL(x.id)}));return p}
 window.v443BiometricUnlock=async()=>{if(busy)return;busy=true;try{const options=await security('authenticate-start'),credential=await navigator.credentials.get({publicKey:decodeOptions(options)});if(!credential)throw Error('Підтвердження скасовано');const result=await security('authenticate-finish',{response:credentialJSON(credential)});await unlock(result.key)}catch(e){$('#v443-unlock-error').textContent=e.name==='NotAllowedError'?'Підтвердження скасовано або пристрій недоступний':e.message}finally{busy=false}};
 window.v443PasswordRecovery=()=>{window.TRTS_UNLOCKED=true;token='';session=null;key=null;$('#v443-unlock')?.remove();$('#login')?.classList.remove('hide');if($('#login'))$('#login').style.display='';$('#email')?.focus()};
 function lock(reload=true){
  if(!vault()||locked())return;window.TRTS_UNLOCKED=false;++epoch;token='';session=null;key=null;profile=null;localStorage.removeItem('trts_token');localStorage.removeItem('trts_refresh');showLock();
  // Reload clears every old module's in-memory data and pending requests.
  if(reload)location.reload();
 }
 async function enroll(pin){
  if(!/^\d{4}$/.test(pin))throw Error('PIN має містити 4 цифри');
  await identify();await refresh();if(!session)session={access_token:token,refresh_token:localStorage.trts_refresh||null};
  const old=vault(),secret=url64(crypto.getRandomValues(new Uint8Array(32))),result=await security('enroll',{pin,secret});
  const oldKey=key,newKey=await crypto.subtle.importKey('raw',un64(result.key),'AES-GCM',false,['encrypt','decrypt']);
  try{key=newKey;localStorage.setItem(VAULT,JSON.stringify({id:result.id,secret,biometric:false}));await saveSession();window.TRTS_UNLOCKED=true;if(old)await security('disable',{deviceId:old.id,secret:old.secret})}
  catch(e){key=oldKey;if(old)localStorage.setItem(VAULT,JSON.stringify(old));else localStorage.removeItem(VAULT);throw e}
 }
 async function biometric(enable){
  if(!enable){await security('biometric-disable');localStorage.setItem(VAULT,JSON.stringify({...vault(),biometric:false}));return}
  if(!await supported())throw Error('Захист пристрою не підтримується цим браузером');
  const options=await security('register-start'),credential=await navigator.credentials.create({publicKey:decodeOptions(options)});if(!credential)throw Error('Налаштування скасовано');await security('register-finish',{response:credentialJSON(credential)});localStorage.setItem(VAULT,JSON.stringify({...vault(),biometric:true}));
 }
 const supported=async()=>Boolean(isSecureContext&&window.PublicKeyCredential&&await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable());
 document.addEventListener('visibilitychange',()=>{if(document.hidden&&config().leave)lock();else if(!document.hidden&&Date.now()-activity>config().minutes*60000)lock()});
 addEventListener('pagehide',()=>{if(vault())lock(false)});addEventListener('pageshow',e=>{if(e.persisted&&vault()){window.TRTS_UNLOCKED=false;showLock();location.reload()}});
 for(const event of ['pointerdown','keydown','touchstart'])addEventListener(event,()=>{activity=Date.now()},{passive:true});
 setInterval(()=>{if(vault()&&!locked()&&Date.now()-activity>=config().minutes*60000)lock()},10000);
 window.TRTS_SECURITY={identify,profile:()=>profile,user:()=>userInfo,isAdmin:()=>profile?.active&&profile.role==='admin',isLocked:locked,enroll,changePin:async(oldPin,pin)=>{if(vault())await security("unlock",{pin:oldPin});return enroll(pin)},biometric,supported,vault,config,lock,saveConfig:value=>localStorage.setItem(CONFIG,JSON.stringify(value))};
 const startOriginal=window.start;
 window.start=async()=>{if(locked()){showLock();return}if(!profile)await identify();return startOriginal()};
 if(locked())showLock();else if(typeof token!=='undefined'&&token){session={access_token:token,refresh_token:localStorage.trts_refresh||null};identify().catch(e=>{TRTS_OPS.view().innerHTML='<p class="v442-warning">'+E(e.message)+'</p>'})}
})();
