(()=>{
const V2='tc_retail_docs_v2',V3='tc_retail_docs_v3',X='tc_retail_interwarehouse_v1';
const get=(k,d=[])=>{try{return JSON.parse(localStorage.getItem(k)||JSON.stringify(d))}catch{return d}},set=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
function repairAmounts(){
 const old=get(V2),cur=get(V3); if(!old.length||!cur.length)return false;
 const byKey=new Map(old.map(d=>[String(d.key||''),d])),byId=new Map(old.map(d=>[String(d.id||''),d])); let changed=false;
 const out=cur.map(d=>{const s=byKey.get(String(d.key||''))||byId.get(String(d.id||''));if(!s)return d;let q=d;
   if(!(Number(d.amount)>0)&&Number(s.amount)>0){q={...q,amount:Number(s.amount)};changed=true}
   if(Array.isArray(q.lines)&&Array.isArray(s.lines)){const sm=new Map(s.lines.map(l=>[String(l.sku||'')+'|'+String(l.barcode||''),l]));const nl=q.lines.map(l=>{const z=sm.get(String(l.sku||'')+'|'+String(l.barcode||''));if(z&&!(Number(l.amount)>0)&&Number(z.amount)>0){changed=true;return{...l,amount:Number(z.amount)}}return l});if(changed)q={...q,lines:nl}}
   return q});
 if(changed)set(V3,out);return changed;
}
function cleanEmptyDuplicates(){const a=get(X);if(a.length<2)return false;const empty=a.filter(x=>!(x.docKeys||[]).length&&x.status==='Чернетка');if(empty.length<2)return false;const keep=empty[0].id,drop=new Set(empty.slice(1).map(x=>x.id));set(X,a.filter(x=>!drop.has(x.id)));return true}
function enhance(){if(location.hash!=='#interwarehouse')return;const host=document.getElementById('ops-documents');if(!host)return;host.querySelectorAll('.iw-card[data-id]').forEach(card=>{if(card.querySelector('[data-iw-delete]'))return;const id=card.dataset.id,actions=card.querySelector('.iw-actions');if(!actions)return;const b=document.createElement('button');b.dataset.iwDelete='1';b.textContent='Видалити рейс';b.style.marginRight='auto';b.onclick=()=>{if(!confirm(`Видалити ${id}?`))return;set(X,get(X).filter(x=>x.id!==id));location.hash='#routes-page';setTimeout(()=>location.hash='#interwarehouse',40)};actions.prepend(b)})}
function boot(){const repaired=repairAmounts(),cleaned=cleanEmptyDuplicates();if((repaired||cleaned)&&location.hash==='#interwarehouse'){location.hash='#routes-page';setTimeout(()=>location.hash='#interwarehouse',50);return}setTimeout(enhance,120)}
window.addEventListener('hashchange',boot);document.addEventListener('DOMContentLoaded',boot);setTimeout(boot,300);
})();