(()=>{
const originalApi=api;
api=async function(path,opt={}){
  const r=await fetch(SB+path,{...opt,headers:{apikey:KEY,Authorization:'Bearer '+token,'Content-Type':'application/json',...(opt.headers||{})}});
  if(r.status===401){
    localStorage.removeItem('trts_token');
    token='';
    document.getElementById('app')?.classList.add('hide');
    document.getElementById('login')?.classList.remove('hide');
    const err=document.getElementById('loginErr');if(err)err.textContent='Сесія завершилась. Увійдіть ще раз.';
    throw Error('Сесія завершилась');
  }
  if(!r.ok)throw Error(await r.text());
  const t=await r.text();return t?JSON.parse(t):null;
};
window.addEventListener('unhandledrejection',e=>{
  if(String(e.reason?.message||e.reason||'').includes('Сесія завершилась'))e.preventDefault();
});
})();