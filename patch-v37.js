(()=>{
  const BUILD='v38';
  const style=document.createElement('style');
  style.textContent=`
    #trts-update{position:fixed;right:14px;bottom:82px;z-index:99999;display:flex;align-items:center;gap:8px;padding:10px 13px;border:1px solid rgba(255,255,255,.12);border-radius:16px;background:rgba(15,22,32,.94);color:#f5f7fb;box-shadow:0 12px 32px rgba(0,0,0,.35);backdrop-filter:blur(16px);font:800 12px/1 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;cursor:pointer}
    #trts-update span{color:#8f9bad;font-weight:700;font-size:10px}
    #trts-update:active{transform:scale(.98)}
    #trts-update.busy{opacity:.72;pointer-events:none}
    @media(max-width:430px){#trts-update{right:12px;bottom:76px;padding:9px 11px;border-radius:14px}}
  `;
  document.head.appendChild(style);
  const btn=document.createElement('button');
  btn.id='trts-update';
  btn.type='button';
  btn.innerHTML='↻ Оновити <span>TEST · '+BUILD+'</span>';
  btn.addEventListener('click',async()=>{
    btn.classList.add('busy');
    btn.innerHTML='↻ Оновлюю… <span>TEST · '+BUILD+'</span>';
    try{
      if('serviceWorker' in navigator){
        const regs=await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map(r=>r.unregister()));
      }
      if('caches' in window){
        const keys=await caches.keys();
        await Promise.all(keys.map(k=>caches.delete(k)));
      }
    }catch(e){}
    const u=new URL(location.href);
    u.searchParams.set('refresh',Date.now());
    location.replace(u.toString());
  });
  document.body.appendChild(btn);
})();