(()=>{
  const X='tc_retail_interwarehouse_v1';
  const get=()=>{try{return JSON.parse(localStorage.getItem(X)||'[]')}catch{return[]}};
  const set=v=>localStorage.setItem(X,JSON.stringify(v));
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function nextId(){const nums=get().map(x=>Number(String(x.id||'').replace(/\D/g,''))||0);return 'IW-'+String(Math.max(0,...nums)+1).padStart(4,'0')}
  function create(){const a=get(),id=nextId();a.unshift({id,from:'Склад центральний КОРПОРАТУРА, Львів',to:'Тест — Розумовського 27',date:new Date().toISOString().slice(0,10),docKeys:[],carrier:'Тест — Перевізник',driver:'Тест — Водій',vehicle:'AA 0001 XX',trailer:'Тест — без причепа',status:'Чернетка',createdAt:new Date().toISOString()});set(a);location.hash='#interwarehouse'}
  function mount(){
    if(location.hash!=='#routes-page')return;
    const host=document.getElementById('ops-documents'); if(!host)return;
    const title=host.querySelector('.ops-page-title'); if(!title)return;
    let bar=host.querySelector('#iw-route-entry');
    if(bar)return;
    bar=document.createElement('div');bar.id='iw-route-entry';
    bar.style.cssText='display:flex;gap:10px;align-items:center;margin-left:auto;margin-right:10px;flex-wrap:wrap';
    const count=get().length;
    bar.innerHTML=`<button data-iw-open style="height:40px;padding:0 16px;border:1px solid #405269;border-radius:8px;background:#152538;color:#eef5fc;font-weight:700;cursor:pointer">Міжскладські рейси · ${count}</button><button data-iw-new style="height:40px;padding:0 16px;border:1px solid #a51849;border-radius:8px;background:#a20f43;color:white;font-weight:750;cursor:pointer">+ Міжскладський рейс</button>`;
    const primary=title.querySelector('.ops-primary');
    if(primary)title.insertBefore(bar,primary);else title.appendChild(bar);
    bar.querySelector('[data-iw-open]').onclick=()=>location.hash='#interwarehouse';
    bar.querySelector('[data-iw-new]').onclick=create;
  }
  let busy=false;
  const observer=new MutationObserver(()=>{if(busy)return;busy=true;requestAnimationFrame(()=>{busy=false;mount()})});
  function start(){const host=document.getElementById('ops-documents');if(host)observer.observe(host,{childList:true,subtree:false});mount()}
  window.addEventListener('hashchange',()=>setTimeout(mount,20));
  document.addEventListener('DOMContentLoaded',()=>setTimeout(start,80));
  setTimeout(start,300);
})();