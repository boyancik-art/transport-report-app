(()=>{
const esc=s=>E(s);
const style=document.createElement('style');style.textContent=`
.r13selectwrap{display:grid;grid-template-columns:1fr 38px;gap:6px}.r13plus{border:1px solid #31534d;border-radius:10px;background:#10231f;color:#67dfcc;font-weight:950;font-size:18px}.r13hint{font-size:7px;color:#78928c;margin-top:4px}.r12field input[type="date"]{cursor:pointer}
`;document.head.appendChild(style);
let carriers=[],locations=[];
const uniq=a=>[...new Set(a.filter(Boolean).map(x=>String(x).trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'uk'));
async function refs(){
 try{
  const [c,l]=await Promise.all([
   api('/rest/v1/transport_reference_carriers?select=carrier_name&is_active=eq.true&order=carrier_name').catch(()=>[]),
   api('/rest/v1/retail_location_options?select=name&is_active=eq.true&order=name').catch(()=>[])
  ]);
  carriers=uniq(c.map(x=>x.carrier_name));locations=uniq(l.map(x=>x.name));
 }catch(e){console.warn('retail refs',e)}
}
refs();
function optionHtml(list,current,placeholder){const a=[...list];if(current&&!a.includes(current))a.unshift(current);return `<option value="">${placeholder}</option>`+a.map(x=>`<option value="${esc(x)}" ${x===current?'selected':''}>${esc(x)}</option>`).join('')}
async function addLocation(select){
 const name=(prompt('Нова точка / склад')||'').trim();if(!name)return;
 try{await api('/rest/v1/retail_location_options?on_conflict=name',{method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify([{name,is_active:true}])})}catch(e){console.warn(e)}
 if(!locations.includes(name))locations.push(name);locations=uniq(locations);
 select.innerHTML=optionHtml(locations,name,'Оберіть точку');select.value=name;
}
function upgradeField(input,list,placeholder,allowAdd=false){
 if(!input||input.dataset.r13==='1')return;const current=input.value||'';const select=document.createElement('select');select.id=input.id;select.dataset.r13='1';select.innerHTML=optionHtml(list,current,placeholder);select.value=current;input.replaceWith(select);
 if(allowAdd){const wrap=document.createElement('div');wrap.className='r13selectwrap';select.replaceWith(wrap);wrap.appendChild(select);const plus=document.createElement('button');plus.type='button';plus.className='r13plus';plus.textContent='＋';plus.title='Додати нову точку';plus.onclick=()=>addLocation(select);wrap.appendChild(plus);const hint=document.createElement('div');hint.className='r13hint';hint.style.gridColumn='1/-1';hint.textContent='Немає потрібної точки? Натисніть ＋ і додайте її.';wrap.appendChild(hint)}
}
function upgradeModal(modal){if(!modal||modal.dataset.r13==='1')return;modal.dataset.r13='1';
 const date=modal.querySelector('#r12Date');if(date){date.addEventListener('click',()=>{try{date.showPicker?.()}catch{}});date.addEventListener('focus',()=>{try{date.showPicker?.()}catch{}})}
 upgradeField(modal.querySelector('#r12Carrier'),carriers,'Оберіть перевізника',false);
 upgradeField(modal.querySelector('#r12From'),locations,'Оберіть точку відправлення',true);
 upgradeField(modal.querySelector('#r12To'),locations,'Оберіть точку призначення',true);
}
const obs=new MutationObserver(ms=>{for(const m of ms)for(const n of m.addedNodes)if(n.nodeType===1){if(n.id==='r12Modal')setTimeout(()=>upgradeModal(n),30);else{const modal=n.querySelector?.('#r12Modal');if(modal)setTimeout(()=>upgradeModal(modal),30)}}});obs.observe(document.body,{childList:true,subtree:true});
document.addEventListener('click',e=>{if(e.target.closest('#r12Route,#r12Task,[data-edit]'))setTimeout(()=>{refs().then(()=>upgradeModal(document.getElementById('r12Modal')))},50)},true);
})();