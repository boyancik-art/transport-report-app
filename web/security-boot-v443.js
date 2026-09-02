(()=>{
 try{
  if(localStorage.trts_vault){localStorage.removeItem('trts_token');localStorage.removeItem('trts_refresh');window.TRTS_UNLOCKED=false}
  const choice=localStorage.trts_theme||'dark';document.documentElement.dataset.theme=choice==='system'?(matchMedia('(prefers-color-scheme: light)').matches?'light':'dark'):choice;
 }catch{}
})();
