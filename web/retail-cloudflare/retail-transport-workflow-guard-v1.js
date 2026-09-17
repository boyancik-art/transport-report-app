/* Retail transport workflow guard v1 — validates state transitions without implementing TTN. */
(()=>{'use strict';
const S=window.RetailState;if(!S)return;
const OK='tc_retail_orders_v1',RK='tc_retail_routes_v1';
const read=(k)=>S.read(k,[]),write=(k,v)=>S.write(k,v),docs=()=>S.documents(),dkey=d=>S.docKey(d);
function repair(){const ds=docs(),validDocs=new Set(ds.map(dkey)),routes=read(RK),validRoutes=new Set(routes.map(r=>String(r.id))),seen=new Set();let changed=false;
const orders=read(OK).map(o=>{const n={...o};n.documentKeys=[...new Set((n.documentKeys||[]).filter(k=>validDocs.has(k)))];if(n.documentKeys.length!==(o.documentKeys||[]).length)changed=true;
if(n.routeId&&!validRoutes.has(String(n.routeId))){delete n.routeId;n.state='planning';changed=true}
if(n.routeId){const sig=String(n.id)+'|'+String(n.routeId);if(seen.has(sig)){delete n.routeId;n.state='planning';changed=true}else seen.add(sig)}
return n});if(changed)write(OK,orders);
const ids=new Set(orders.map(o=>String(o.id)));const fixedRoutes=routes.map(r=>{const stops=(r.stops||[]).filter(s=>ids.has(String(s.orderId)));if(stops.length!==(r.stops||[]).length){changed=true;return{...r,stops}}return r});if(changed)write(RK,fixedRoutes)}
function validateRoute(){const selected=[...document.querySelectorAll('[data-plan]:checked')];if(!selected.length)return 'Оберіть хоча б одне замовлення.';for(const c of selected){const id=c.dataset.plan,dd=document.querySelector(`[data-delivery-date="${CSS.escape(id)}"]`),all=document.querySelector(`[data-all-day="${CSS.escape(id)}"]`),from=document.querySelector(`[data-delivery-from="${CSS.escape(id)}"]`),to=document.querySelector(`[data-delivery-to="${CSS.escape(id)}"]`);if(!dd?.value)return 'Для кожної ТТ вкажіть планову дату доставки.';if(!all?.checked&&(!from?.value||!to?.value))return 'Вкажіть інтервал доставки або «Протягом дня».';if(!all?.checked&&from.value>=to.value)return 'Час «до» має бути пізніше часу «з».'}return ''}
document.addEventListener('change',e=>{const a=e.target.closest('[data-all-day]');if(a){const id=a.dataset.allDay,from=document.querySelector(`[data-delivery-from="${CSS.escape(id)}"]`),to=document.querySelector(`[data-delivery-to="${CSS.escape(id)}"]`);[from,to].forEach(x=>{if(x){x.disabled=a.checked;if(a.checked)x.value=''}})}});
document.addEventListener('click',e=>{const b=e.target.closest('[data-rt-action="create-route"]');if(!b)return;const msg=validateRoute();if(msg){e.preventDefault();e.stopImmediatePropagation();alert(msg);return}b.disabled=true;setTimeout(()=>{b.disabled=false},1200)},true);
window.addEventListener('hashchange',repair);repair();window.RetailTransportGuard={repair,validateRoute};
})();