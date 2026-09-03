(()=>{
 try{
  const build='v44.7',previous=localStorage.trts_seen_build;
  if(previous!==build&&(previous||localStorage.trts_token||localStorage.trts_vault)){
   const access=localStorage.trts_token;let device;try{device=JSON.parse(localStorage.trts_vault||'null')}catch{}
   localStorage.trts_update_notice=build;
   for(const storage of [localStorage,sessionStorage])for(const name of ['trts_token','trts_refresh','trts_vault'])storage.removeItem(name);
   window.TRTS_UNLOCKED=false;
   // Old plaintext sessions can be revoked immediately. Encrypted sessions are discarded,
   // never decrypted just to update the application.
   if(access)for(const [path,body] of [['/auth/v1/logout?scope=global',null],...(device?[['/functions/v1/transport-security',{action:'disable',deviceId:device.id,secret:device.secret}]]:[])]){
    fetch('https://ccmwhtojyofefyzespty.supabase.co'+path,{method:'POST',keepalive:true,signal:AbortSignal.timeout(1500),headers:{apikey:'sb_publishable_a5gJ8rAw7dFcJV_iPg4TJg_glZIwMgh',Authorization:'Bearer '+access,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})}).then(r=>{if(!r.ok)console.warn('[auth.update] revocation status',r.status)}).catch(e=>console.warn('[auth.update] revocation unavailable',e.name));
   }
  }
  localStorage.trts_seen_build=build;
  if(localStorage.trts_vault){localStorage.removeItem('trts_token');localStorage.removeItem('trts_refresh');window.TRTS_UNLOCKED=false}
  const choice=localStorage.trts_theme==='light'?'light':'dark';localStorage.trts_theme=choice;document.documentElement.dataset.theme=choice;
 }catch{}
})();
