/* Retail Transport v2 guards: identity, cutoff, duplicate prevention, safe persistence. TTN out of scope. */
(()=>{'use strict';
const ORDER_KEY='tc_retail_orders_v1',ROUTE_KEY='tc_retail_routes_v1';
const read=(k)=>{try{const v=JSON.parse(localStorage.getItem(k)||'[]');return Array.isArray(v)?v:[]}catch{return[]}};
const write=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
const uniq=a=>[...new Set(a.filter(Boolean))];
function normalize(){
 const orders=read(ORDER_KEY),routes=read(ROUTE_KEY); let dirty=false;
 const routeByOrder=new Map();
 routes.forEach(r=>uniq(r.orderIds||r.orders||[]).forEach(id=>{if(!routeByOrder.has(id))routeByOrder.set(id,r.id)}));
 const seenDocs=new Map();
 orders.forEach(o=>{
   o.documentKeys=uniq(o.documentKeys||o.documents||[]);
   if(o.routeId && !routes.some(r=>r.id===o.routeId)){o.routeId=null;dirty=true}
   if(!o.routeId && routeByOrder.has(o.id)){o.routeId=routeByOrder.get(o.id);dirty=true}
   if(o.routeId && o.state!=='planning'){o.state='planning';dirty=true}
   o.documentKeys.forEach(k=>{if(!seenDocs.has(k))seenDocs.set(k,o.id)});
 });
 if(dirty)write(ORDER_KEY,orders);
}
function protectDoubleSubmit(){
 document.addEventListener('click',e=>{
   const b=e.target.closest('[data-rt-action="to-orders"],[data-rt-action="to-planning"],[data-rt-action="form-route"],[data-rt-action="save-draft"]');
   if(!b||b.dataset.rtBusy==='1')return;
   b.dataset.rtBusy='1';setTimeout(()=>{b.dataset.rtBusy='0'},900);
 },true);
}
function accessibility(){
 document.addEventListener('change',e=>{
  if(e.target.matches('[data-all-day]')){
   const id=e.target.dataset.allDay,on=e.target.checked;
   document.querySelector(`[data-delivery-from="${CSS.escape(id)}"]`)?.toggleAttribute('disabled',on);
   document.querySelector(`[data-delivery-to="${CSS.escape(id)}"]`)?.toggleAttribute('disabled',on);
  }
 });
}
function routeValidation(){
 document.addEventListener('click',e=>{
  const b=e.target.closest('[data-rt-action="form-route"]');if(!b)return;
  const stops=[...document.querySelectorAll('[data-stop]')];
  if(!stops.length){e.stopImmediatePropagation();alert('Оберіть щонайменше одне замовлення для маршруту.');return}
  const missing=stops.filter(s=>!s.querySelector('[data-delivery-date]')?.value);
  if(missing.length){e.stopImmediatePropagation();alert('Вкажіть планову дату доставки для кожної ТТ.');return}
  const bad=stops.filter(s=>{const id=s.dataset.stop,all=s.querySelector(`[data-all-day="${CSS.escape(id)}"]`)?.checked,f=s.querySelector(`[data-delivery-from="${CSS.escape(id)}"]`)?.value,t=s.querySelector(`[data-delivery-to="${CSS.escape(id)}"]`)?.value;return !all&&(!f||!t||f>=t)});
  if(bad.length){e.stopImmediatePropagation();alert('Для кожної ТТ задайте коректний інтервал доставки або «Протягом дня».');}
 },true);
}
normalize();protectDoubleSubmit();accessibility();routeValidation();window.addEventListener('storage',normalize);
})();
