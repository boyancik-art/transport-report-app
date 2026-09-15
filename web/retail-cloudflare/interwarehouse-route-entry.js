(()=>{
  const X='tc_retail_interwarehouse_v1';
  const get=(k,d=[])=>{try{return JSON.parse(localStorage.getItem(k)||JSON.stringify(d))}catch{return d}};
  const set=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
  function make(){
    const a=get(X), id='IW-'+String(a.length+1).padStart(4,'0');
    a.unshift({id,from:'Склад центральний КОРПОРАТУРА, Львів',to:'Тест — Розумовського 27',date:new Date().toISOString().slice(0,10),docKeys:[],carrier:'Тест — Перевізник 1',driver:'Тест — Водій 1',vehicle:'AA 0001 XX',trailer:'Тест — причіп 1',status:'Чернетка',createdAt:new Date().toISOString()});
    set(X,a); location.hash='#interwarehouse';
  }
  function inject(){
    if(location.hash!=='#routes-page') return;
    const host=document.getElementById('ops-documents'); if(!host) return;
    const title=host.querySelector('.ops-page-title'); if(!title) return;
    let bar=host.querySelector('#iw-route-entry');
    if(!bar){
      bar=document.createElement('div'); bar.id='iw-route-entry';
      bar.style.cssText='display:flex;gap:10px;justify-content:flex-end;flex-wrap:wrap;margin:0 0 14px';
      bar.innerHTML='<button data-iw-list style="height:42px;padding:0 18px;border:1px solid #405269;border-radius:8px;background:#152538;color:#fff;font-weight:700;cursor:pointer">Міжскладські рейси</button><button data-iw-new style="height:42px;padding:0 18px;border:1px solid #b62052;border-radius:8px;background:#9b1242;color:#fff;font-weight:800;cursor:pointer">+ Створити міжскладський рейс</button>';
      title.insertAdjacentElement('afterend',bar);
      bar.querySelector('[data-iw-list]').onclick=()=>location.hash='#interwarehouse';
      bar.querySelector('[data-iw-new]').onclick=make;
    }
  }
  setInterval(inject,350); window.addEventListener('hashchange',()=>setTimeout(inject,100)); setTimeout(inject,250);
})();