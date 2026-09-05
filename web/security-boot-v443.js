(()=>{
 try{
  const build='v44.8',previous=localStorage.trts_seen_build;
  if(previous!==build&&(previous||localStorage.trts_token||localStorage.trts_vault)){
   localStorage.trts_update_notice=build;
   for(const storage of [localStorage,sessionStorage])for(const name of ['trts_session_v1','trts_token','trts_refresh','trts_vault'])storage.removeItem(name);
   window.TRTS_UNLOCKED=false;
   // Never race a new login with an asynchronous global logout from an old build.
   // The obsolete local pair is discarded; explicit user logout handles revocation.
  }
  localStorage.trts_seen_build=build;
  if(localStorage.trts_vault){localStorage.removeItem('trts_session_v1');localStorage.removeItem('trts_token');localStorage.removeItem('trts_refresh');window.TRTS_UNLOCKED=false}
  const choice=localStorage.trts_theme==='light'?'light':'dark';localStorage.trts_theme=choice;document.documentElement.dataset.theme=choice;
 }catch{}
})();
