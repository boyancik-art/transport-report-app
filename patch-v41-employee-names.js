(()=>{
const t=v=>String(v??'').trim();
const data=()=>typeof D!=='undefined'?D:window.D||{};
let people=new Map(),loading=null;
async function loadPeople(){
  if(people.size)return people;
  if(loading)return loading;
  loading=(async()=>{try{const rows=await api('/rest/v1/employee_directory?select=employee_id,employee_name');people=new Map((rows||[]).map(x=>[t(x.employee_id),t(x.employee_name)]));}catch(e){}return people})();
  return loading;
}
function pointDocs(r,p){
  const loc=(data().locations||[]).find(x=>+x.id===+p.location_id);
  return(data().docs||[]).filter(d=>String(d.route_delivery_id)===String(r.route_delivery_id)&&t(d.customer_id)===t(p.customer_id)&&(!loc?.address_id||t(d.address_id)===t(loc.address_id)));
}
function taName(r,p){const d=pointDocs(r,p).find(x=>t(x.employee_id));const id=t(d?.employee_id);return people.get(id)||'—';}
const old=window.v412Route;
if(typeof old==='function')window.v412Route=async function(id){
  const r=(data().routes||[]).find(x=>+x.id===+id);
  old(id);
  if(!r)return;
  await loadPeople();
  setTimeout(()=>{
    const points=(data().points||[]).filter(x=>+x.route_id===+r.id),cards=[...document.querySelectorAll('.pk-address')];
    cards.forEach((card,i)=>{const p=points[i];if(!p)return;const vals=card.querySelectorAll('.pk-meta .pk-val');if(vals[1])vals[1].textContent=taName(r,p);});
  },0);
};
loadPeople();
const up=document.getElementById('trts-update');if(up){const s=up.querySelector('span');if(s)s.textContent='TEST · v41.3'}document.documentElement.dataset.trtsBuild='v41.3';
})();