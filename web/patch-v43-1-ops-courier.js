(()=>{
const $=s=>document.querySelector(s), T=v=>String(v??'').trim(), N=v=>{const n=Number(String(v??'').replace(',','.'));return Number.isFinite(n)?n:0}, E=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])), M=v=>new Intl.NumberFormat('uk-UA',{maximumFractionDigits:0}).format(N(v))+' ₴', P=v=>N(v).toLocaleString('uk-UA',{minimumFractionDigits:2,maximumFractionDigits:2})+'%';
const dat=()=>typeof D!=='undefined'?D:(window.D||{});
const cov=r=>window.v436Coverage?.(r)||window.TRTS_V39_EXPEDITOR_COVERAGE?.[T(r?.expeditor_name)]||'';
const isCourier=r=>/кур.?єр/i.test(cov(r));
const points=r=>(dat().points||[]).filter(p=>+p.route_id===+r.id);
const docs=r=>(dat().docs||[]).filter(d=>T(d.route_delivery_id)===T(r.route_delivery_id));
const loc=p=>(dat().locations||[]).find(l=>+l.id===+p.location_id)||{};
const pointSales=(r,p)=>{const a=loc(p),ds=docs(r).filter(d=>T(d.customer_id)===T(p.customer_id)&&(!a.address_id||T(d.address_id)===T(a.address_id)));return ds.reduce((s,d)=>s+N(d.order_amount),0)||N(p.order_amount)};
const pointWeight=(r,p)=>{const a=loc(p),ds=docs(r).filter(d=>T(d.customer_id)===T(p.customer_id)&&(!a.address_id||T(d.address_id)===T(a.address_id)));return ds.reduce((s,d)=>s+N(d.weight),0)||N(p.weight)};

function showModal(title,body,actions=''){let m=$('#v431-modal');if(!m){m=document.createElement('div');m.id='v431-modal';document.body.appendChild(m)}m.innerHTML=`<div class="v431-modal-bg"><div class="v431-modal"><div class="v431-modal-head"><h3>${E(title)}</h3><button onclick="v431CloseModal()">×</button></div><div class="v431-modal-body">${body}</div><div class="v431-modal-actions">${actions}</div></div></div>`;m.style.display='block';document.body.classList.add('trts-modal-open')}
window.v431CloseModal=()=>{const m=$('#v431-modal');if(m)m.style.display='none';document.body.classList.remove('trts-modal-open')};

// FAST collapse: no full dashboard re-render.
const blockState={pickup:localStorage.v431_fast_pickup!=='0',fop:localStorage.v431_fast_fop!=='0',replen:localStorage.v431_fast_replen!=='0',courier:localStorage.v431_fast_courier!=='0',stv:localStorage.v431_fast_stv==='1',sav:localStorage.v431_fast_sav==='1',bakery:localStorage.v431_fast_bakery==='1',other:localStorage.v431_fast_other==='1'};
function findBlock(key){return key==='courier'?$('#v431-courier'):document.querySelector('[data-section="'+key+'"]')}
function applyBlock(key){const b=findBlock(key);if(!b)return;const open=blockState[key],head=b.querySelector(':scope > .v431-block-head,.v431-courier-head');[...b.children].forEach(x=>{if(x!==head)x.style.display=open?'':'none'});const sp=head?.querySelector(':scope > span,.v431-toggle-label');const label=open?'⌃':'⌄';if(head)head.setAttribute('aria-expanded',String(open));if(sp&&sp.textContent!==label)sp.textContent=label}
window.v431Toggle=key=>{if(!(key in blockState))return;blockState[key]=!blockState[key];localStorage['v431_fast_'+key]=blockState[key]?'1':'0';applyBlock(key)};
window.v431CourierToggle=()=>window.v431Toggle('courier');

// Edit the same facts from the list and the opened route.
window.v431EditTransport=id=>window.v433EditRoute(id);
function addFopEditors(){document.querySelectorAll('.v431-fop .v43-route:not(.manual)').forEach(card=>{if(card.querySelector('.v431-edit-transport'))return;const m=(card.getAttribute('onclick')||'').match(/v43OpenRoute\((\d+)\)/);if(!m)return;const b=document.createElement('button');b.className='v431-edit-transport';b.textContent='Перевізник · хвиля · тариф';b.onclick=e=>{e.stopPropagation();v431EditTransport(+m[1])};card.appendChild(b)})}

let cdata={shipments:[],links:[],carriers:[]},loading=false;
async function loadCourier(){if(loading)return loading;loading=(async()=>{const cr=(dat().routes||[]).filter(isCourier),ids=cr.map(r=>r.id),rid=ids.length?`(${ids.join(',')})`:'(0)';const dates=cr.map(r=>r.route_date).filter(Boolean).sort(),period=window.v435ReportPeriod?.(),from=period?.from||dates[0]||new Date().toISOString().slice(0,10),to=period?.to||dates.at(-1)||from,read=window.v435ReadRange||api;const [s,l,c]=await Promise.all([read(`/rest/v1/courier_shipments?select=*&shipment_date=gte.${from}&shipment_date=lte.${to}&order=created_at.desc`),read(`/rest/v1/courier_shipment_points?select=*&route_id=in.${rid}`),api('/rest/v1/courier_carriers?select=*&active=eq.true&order=name')]);cdata={shipments:s||[],links:l||[],carriers:c||[]}})();try{await loading}finally{loading=false}}

const routeFact=r=>(dat().facts||[]).find(f=>+f.route_id===+r.id)||{};
const linkFor=p=>cdata.links.find(l=>+l.route_point_id===+p.id);
function defaultCarrier(r){
 const explicit=T(routeFact(r).carrier_name);if(explicit)return explicit;
 const names=[...new Set(points(r).map(p=>cdata.shipments.find(s=>T(s.id)===T(linkFor(p)?.shipment_id))?.carrier_name).filter(Boolean))];
 return names.length===1?names[0]:'';
}
window.v439CourierDefault=defaultCarrier;
window.v439CourierPointCarrier=(r,p)=>T(linkFor(p)?.carrier_override)||defaultCarrier(r)||'';
window.v439CourierPointCost=p=>N(linkFor(p)?.delivery_cost);
window.v439CourierRouteCost=r=>points(r).reduce((sum,p)=>sum+N(linkFor(p)?.delivery_cost),0);
async function saveDefaultCarrier(r,name){
 const f=routeFact(r),exists=(dat().facts||[]).some(x=>+x.route_id===+r.id),payload={carrier_name:name};
 const saved=await api('/rest/v1/route_facts'+(exists?'?route_id=eq.'+r.id:''),{method:exists?'PATCH':'POST',headers:{Prefer:'return=representation'},body:JSON.stringify(exists?payload:{route_id:r.id,...payload})});
 if(!saved?.length)throw Error('Сервер не підтвердив перевізника доставки');
 if(exists)Object.assign(f,saved[0]);else (dat().facts??=[]).push(saved[0]);
}
let carrierEdit=null,carrierSaving=false;
window.v439EditCourierCarrier=async(rid,pid=null,backTT=false)=>{
 showModal('Перевізник доставки','<p>Завантаження…</p>');
 try{
  await loadCourier();const r=(dat().routes||[]).find(x=>+x.id===+rid),p=pid&&points(r).find(x=>+x.id===+pid);if(!r||(pid&&!p))throw Error('ТТ не знайдено');
  const value=p?T(linkFor(p)?.carrier_override):defaultCarrier(r),names=[...new Set([...cdata.carriers.map(x=>x.name),defaultCarrier(r),value].filter(Boolean))];
  carrierEdit={rid:+rid,pid:pid?+pid:null,backTT};
  const options=(p?'<option value="">За доставкою · '+E(defaultCarrier(r)||'не вказано')+'</option>':'<option value="">Оберіть перевізника</option>')+names.map(name=>'<option value="'+E(name)+'" '+(name===value?'selected':'')+'>'+E(name)+'</option>').join('');
  showModal(p?'Перевізник цієї ТТ':'Перевізник доставки','<form id="v439-carrier-form" class="v439-courier-form"><p>'+E(p?.customer_name||r.route_delivery_id)+'</p><label>Перевізник<select id="v439-carrier" '+(p?'':'required')+'>'+options+'</select></label><p class="v431-note">'+(p?'Вибір змінює лише цю ТТ. Тариф і склад спільної групи залишаються без змін.':'Цього перевізника успадкують усі ТТ без окремого вибору.')+'</p><p id="v439-carrier-error" class="v433-error" role="alert"></p></form>','<button onclick="v431CloseModal()">Скасувати</button><button id="v439-carrier-save" class="primary" onclick="v439SaveCourierCarrier()">Готово</button>');
 }catch(e){showModal('Перевізник','<p class="v433-error">'+E(e.message)+'</p>','<button onclick="v431CloseModal()">Закрити</button>')}
};
window.v439SaveCourierCarrier=async()=>{
 if(carrierSaving||!carrierEdit||!$('#v439-carrier-form')?.reportValidity())return;
 const {rid,pid,backTT}=carrierEdit,r=(dat().routes||[]).find(x=>+x.id===rid),p=pid&&points(r).find(x=>+x.id===pid),name=T($('#v439-carrier').value);
 carrierSaving=true;$('#v439-carrier-save').disabled=true;
 try{
  if(!p)await saveDefaultCarrier(r,name);
  else{
   const latest=await api('/rest/v1/courier_shipment_points?select=*&route_point_id=eq.'+pid),link=latest[0];
   if(link){const rows=await api('/rest/v1/courier_shipment_points?id=eq.'+link.id,{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify({carrier_override:name||null})});if(!rows?.length)throw Error('Сервер не підтвердив перевізника ТТ')}
   else if(name){
    if(!carrierEdit.sid){const made=await api('/rest/v1/courier_shipments',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify({shipment_date:r.route_date,carrier_name:defaultCarrier(r)||name})});carrierEdit.sid=made?.[0]?.id;if(!carrierEdit.sid)throw Error('Доставку не створено')}
    const made=await api('/rest/v1/courier_shipment_points',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify({shipment_id:carrierEdit.sid,route_id:rid,route_point_id:pid,delivery_cost:0,carrier_override:name})});if(!made?.length)throw Error('Перевізника ТТ не збережено');
   }
  }
  await loadCourier();v431CloseModal();carrierEdit=null;if(backTT&&pid)v43OpenTT(rid,pid);else v43OpenRoute(rid);
 }catch(e){$('#v439-carrier-error').textContent='Не збережено: '+e.message}
 finally{carrierSaving=false;if($('#v439-carrier-save'))$('#v439-carrier-save').disabled=false}
};

function cPointRow(r,p){const lnk=cdata.links.find(x=>+x.route_point_id===+p.id),sale=pointSales(r,p),cost=N(lnk?.delivery_cost),log=sale?cost/sale*100:0,name=T(p.customer_name)||T(docs(r)[0]?.customer_name)||'ТТ',addr=T(loc(p).delivery_address)||'';return`<div class="v431-cpt"><div><b>${E(name)}</b><small>${E(addr)}</small></div><div><small>Продажі</small><b>${M(sale)}</b></div><div><small>Доставка</small><b>${M(cost)}</b></div><div><small>% логістики</small><b>${P(log)}</b></div></div>`}
function courierRouteCard(r){return window.v436RouteCard(r)}
function shipmentRows(){return cdata.shipments.map(s=>{const ls=cdata.links.filter(x=>T(x.shipment_id)===T(s.id)),cost=ls.reduce((a,x)=>a+N(x.delivery_cost),0);return`<div class="v431-cshipment"><span>${E(s.carrier_name)}</span><b>${ls.length} ТТ</b><strong>${M(cost)}</strong></div>`}).join('')}
let renderingCourier=false;
async function renderCourier(){if(renderingCourier)return;const screen=$('.v43-screen');if(!screen?.querySelector('.v43-stack'))return;renderingCourier=true;try{await loadCourier();if(!screen.isConnected||screen!==$('.v43-screen'))return;let sec=$('#v431-courier');if(sec)sec.remove();const routes=(dat().routes||[]).filter(isCourier),totalTT=routes.reduce((s,r)=>s+points(r).length,0),sales=routes.reduce((s,r)=>s+points(r).reduce((a,p)=>a+pointSales(r,p),0),0),cost=cdata.links.reduce((s,x)=>s+N(x.delivery_cost),0),log=sales?cost/sales*100:0;sec=document.createElement('section');sec.id='v431-courier';sec.className='v431-block';sec.dataset.section='courier';sec.innerHTML=`<button class="v431-courier-head" onclick="v431CourierToggle()"><div><b>${window.TRTS_UI?.icon('box')||''}Кур’єрські відправлення · ${routes.length}</b><small>${totalTT} ТТ</small></div><span class="v431-toggle-label">Згорнути ︿</span></button><div class="v431-courier-body"><div class="v431-cactions"><button onclick="v431CourierCarriers()">Перевізники</button><button class="primary" onclick="v431CreateCourier()">Відкрити доставку</button></div><div class="v431-ckpi"><div><small>ТТ</small><b>${totalTT}</b></div><div><small>Накладних</small><b>${routes.reduce((sum,r)=>sum+points(r).reduce((n,p)=>n+(window.v436InvoiceCount?.(r,p)||0),0),0)}</b></div><div><small>Витрати</small><b>${M(cost)}</b></div><div><small>% логістики</small><b>${P(log)}</b></div></div>${routes.map(courierRouteCard).join('')||'<div class="v43-empty">Кур’єрських маршрутів за період немає</div>'}</div>`;const anchor=$('#v436-courier-anchor');if(anchor)anchor.after(sec);else screen.appendChild(sec);applyBlock('courier')}catch(e){console.error('courier',e);if(!$('#v433-courier-load-error')){const err=document.createElement('p');err.id='v433-courier-load-error';err.className='v433-error';err.textContent='Не вдалося завантажити кур’єрку: '+e.message;screen.appendChild(err)}}finally{renderingCourier=false;const current=$('.v43-screen');if(current!==screen&&current?.querySelector('.v43-stack')&&!$('#v431-courier')&&!$('#v433-courier-load-error'))setTimeout(renderCourier,0)}}
window.v431CourierCarriers=()=>showModal('Кур’єрські перевізники',`<div class="v431-directory">${cdata.carriers.map(x=>`<div>${E(x.name)}</div>`).join('')}<label>Новий перевізник<input id="v431-new-cc" placeholder="Назва"></label></div>`,'<button onclick="v431CloseModal()">Скасувати</button><button class="primary" onclick="v431AddCourierCarrier()">Додати</button>');
window.v431AddCourierCarrier=async()=>{const name=T($('#v431-new-cc')?.value);if(!name)return;await api('/rest/v1/courier_carriers',{method:'POST',headers:{Prefer:'return=minimal'},body:JSON.stringify({name,active:true})});v431CloseModal();cdata.carriers=[];await loadCourier();renderCourier()};
let draft=null,courierSaving=false;
const pointById=id=>(dat().points||[]).find(p=>+p.id===+id);
const routeByPoint=id=>(dat().routes||[]).find(r=>+r.id===+pointById(id)?.route_id);
const cents=value=>Math.round(Number(String(value).replace(',','.'))*100);
function shares(value,ids){const total=cents(value),base=Math.floor(total/ids.length),rest=total-base*ids.length;return ids.map((id,i)=>({id,cost:(base+(i<rest?1:0))/100}))}
const deliveryDate=()=>routeByPoint(draft.groups[0]?.ids[0])?.route_date||new Date().toISOString().slice(0,10);
window.v433OpenDelivery=async (rid,focusPid=null)=>{
 showModal('Кур’єрська доставка','<p>Завантаження…</p>');
 try{
 await loadCourier();const r=(dat().routes||[]).find(x=>+x.id===+rid);if(!r)throw Error('Доставку не знайдено');
 const seen=new Set(),groups=[];
 for(const p of points(r)){
  const link=cdata.links.find(l=>+l.route_point_id===+p.id),sid=link?.shipment_id;
  if(sid&&seen.has(T(sid)))continue;if(sid)seen.add(T(sid));
  const links=sid?cdata.links.filter(l=>T(l.shipment_id)===T(sid)):[];
  const ids=links.length?links.map(l=>+l.route_point_id):[+p.id];
  const tariff=links.length?(links.reduce((a,l)=>a+cents(l.delivery_cost),0)/100).toFixed(2):'';
  const carrier=cdata.shipments.find(s=>T(s.id)===T(sid))?.carrier_name||'';
  groups.push({key:+p.id,ids,sid: sid||null,tariff,original:{ids:[...ids],tariff,carrier}});
 }
 const prior=[...new Set(groups.map(g=>g.original.carrier).filter(Boolean))];
 draft={rid:+rid,groups,carrier:defaultCarrier(r)||(prior.length===1?prior[0]:''),date:r.route_date,backPid:focusPid};
 showModal('Кур’єрська доставка',`<div class="v433-delivery"><p>${E(r.route_delivery_id||r.id)} · ${E(r.expeditor_name)}</p><label>Перевізник<select id="v431-ccarrier" onchange="v433CourierCarrier(this.value)"><option value="">Оберіть перевізника</option>${[...new Set([...cdata.carriers.map(c=>c.name),...prior,draft.carrier])].map(n=>`<option ${n===draft.carrier?'selected':''}>${E(n)}</option>`).join('')}</select></label><p class="v431-note">Вкажіть тариф навпроти ТТ. Кнопка «+ ТТ під цей тариф» об’єднує точки в один тариф. Спільна сума ділиться порівну між точками, без повторного нарахування.</p><div id="v433-courier-rows"></div><p id="v433-courier-error" class="v433-error" role="alert"></p></div>`,'<button onclick="v431CloseModal()">Скасувати</button><button id="v433-courier-save" class="primary" onclick="v431SaveCourier()">Готово</button>');
 renderDraft();if(focusPid){const group=groups.find(g=>g.ids.includes(+focusPid));if(group)$('#v433-cost-'+group.key)?.focus()}
 }catch(e){showModal('Кур’єрська доставка','<p class="v433-error">'+E(e.message)+'</p>','<button onclick="v431CloseModal()">Закрити</button>')}
};
window.v433CourierCarrier=value=>{if(draft)draft.carrier=value};
window.v433CourierTariff=(key,value)=>{const g=draft?.groups.find(g=>g.key===+key);if(g)g.tariff=value};
function pointLabel(id){const p=pointById(id),r=routeByPoint(id);return `<b>${E(p?.customer_name||'ТТ '+id)}</b><small>${E(p&&r?window.v436PointAddress(r,p):'')} · ${E(r?.route_delivery_id||'')}</small>`}
function renderDraft(){const box=$('#v433-courier-rows');if(!box||!draft)return;
 box.innerHTML=draft.groups.map(g=>`<section class="v433-tariff-group" data-group="${g.key}"><div class="v433-tariff-row"><div>${pointLabel(g.ids[0])}</div><label>${g.ids.length>1?'Спільний тариф':'Тариф'}, грн<input id="v433-cost-${g.key}" type="number" min="0" step="0.01" inputmode="decimal" value="${E(g.tariff)}" placeholder="0,00" oninput="v433CourierTariff(${g.key},this.value)"></label></div>${window.v436InvoiceTable(routeByPoint(g.ids[0]),pointById(g.ids[0]))}${g.ids.length>1?`<div class="v433-members">${g.ids.slice(1).map(id=>`<div>${pointLabel(id)}<small>У спільному тарифі</small>${window.v436InvoiceTable(routeByPoint(id),pointById(id))}</div>`).join('')}</div>`:''}<button class="v433-add-shared" onclick="v433ChooseShared(${g.key})">+ ТТ під цей тариф${g.ids.length>1?' · '+g.ids.length+' ТТ':''}</button><div id="v433-shared-${g.key}"></div></section>`).join('')||'<p>У доставці немає ТТ.</p>';
}
window.v433ChooseShared=key=>{
 const g=draft?.groups.find(x=>x.key===+key),box=$('#v433-shared-'+key);if(!g||!box)return;
 const other=new Set(draft.groups.filter(x=>x!==g&&(x.sid||T(x.tariff)!==''||x.ids.length>1)).flatMap(x=>x.ids));
 const rows=(dat().routes||[]).filter(r=>isCourier(r)&&r.route_date===draft.date).flatMap(r=>points(r));
 const eligible=rows.filter(p=>!other.has(+p.id)&&(!cdata.links.some(l=>+l.route_point_id===+p.id)||g.ids.includes(+p.id)));
 box.innerHTML=`<div class="v433-shared-options">${eligible.map(p=>`<label><input type="checkbox" name="v433-shared-${g.key}" value="${p.id}" ${g.ids.includes(+p.id)?'checked':''} ${+p.id===g.ids[0]||(g.sid&&g.original.ids.includes(+p.id))?'disabled':''}><span>${pointLabel(+p.id)}</span></label>`).join('')}<button class="primary" onclick="v433ApplyShared(${g.key})">Готово</button></div>`;
};
window.v433ApplyShared=key=>{
 const g=draft?.groups.find(x=>x.key===+key);if(!g)return;
 const prev=[...g.ids],chosen=[...document.querySelectorAll('input[name="v433-shared-'+key+'"]:checked')].map(x=>+x.value);
 g.ids=[g.ids[0],...chosen.filter(id=>id!==g.ids[0])];
 draft.groups=draft.groups.filter(x=>x===g||!g.ids.includes(x.ids[0]));
 for(const id of prev){if(!g.ids.includes(id)&&+routeByPoint(id)?.id===draft.rid)draft.groups.push({key:id,ids:[id],sid:null,tariff:'',original:{ids:[id],tariff:'',carrier:''}})}
 renderDraft();
};
window.v431CreateCourier=()=>{
 const routes=(dat().routes||[]).filter(isCourier);
 showModal('Оберіть доставку',routes.map(r=>`<button class="v433-delivery-choice" onclick="v433OpenDelivery(${r.id})">${E(r.route_delivery_id||r.id)}<small>${E(r.expeditor_name)} · ${points(r).length} ТТ</small></button>`).join('')||'<p>Кур’єрських доставок за період немає.</p>','<button onclick="v431CloseModal()">Готово</button>');
};
window.v431SaveCourier=async()=>{
 if(courierSaving||!draft)return;const err=$('#v433-courier-error');err.textContent='';
 if(!draft.carrier){err.textContent='Оберіть перевізника';return}
 const groups=draft.groups.filter(g=>T(g.tariff)!=='');
 if(!groups.length){err.textContent='Вкажіть хоча б один тариф';return}
 if([...document.querySelectorAll('#v433-courier-rows input[type="number"]')].some(i=>!i.reportValidity()))return;
 if(groups.some(g=>!Number.isFinite(cents(g.tariff))||cents(g.tariff)<0)){err.textContent='Тариф має бути невід’ємним числом';return}
 const ids=groups.flatMap(g=>g.ids);
 if(new Set(ids).size!==ids.length){err.textContent='Одна ТТ не може входити до двох тарифів';return}
 courierSaving=true;$('#v433-courier-save').disabled=true;
 try{
 await saveDefaultCarrier((dat().routes||[]).find(r=>+r.id===draft.rid),draft.carrier);
 const latest=await api('/rest/v1/courier_shipment_points?select=*&route_point_id=in.('+ids.join(',')+')');
 for(const g of groups){for(const id of g.ids){const link=latest.find(l=>+l.route_point_id===id);if(link&&T(link.shipment_id)!==T(g.sid))throw Error('ТТ уже прив’язана до іншого тарифу. Відкрийте доставку знову')}}
 for(const g of groups){
  const unchanged=g.sid&&g.tariff===g.original.tariff&&draft.carrier===g.original.carrier&&g.ids.join(',')===g.original.ids.join(',');
  if(unchanged)continue;
  if(!g.sid){const made=await api('/rest/v1/courier_shipments',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify({shipment_date:draft.date||deliveryDate(),carrier_name:draft.carrier})});g.sid=made?.[0]?.id;if(!g.sid)throw Error('Сервер не підтвердив створення доставки')}
  else if(draft.carrier!==g.original.carrier){await api('/rest/v1/courier_shipments?id=eq.'+encodeURIComponent(g.sid),{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify({carrier_name:draft.carrier})})}
  const allocation=shares(g.tariff,g.ids),add=[];
  for(const item of allocation){const link=latest.find(l=>+l.route_point_id===item.id);if(link){await api('/rest/v1/courier_shipment_points?shipment_id=eq.'+encodeURIComponent(g.sid)+'&route_point_id=eq.'+item.id,{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify({delivery_cost:item.cost})})}else add.push({shipment_id:g.sid,route_id:routeByPoint(item.id).id,route_point_id:item.id,delivery_cost:item.cost})}
  if(add.length)await api('/rest/v1/courier_shipment_points',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify(add)});
  g.original={ids:[...g.ids],tariff:g.tariff,carrier:draft.carrier};
 }
 const rid=draft.rid,pid=draft.backPid;v431CloseModal();draft=null;await loadCourier();if(pid)v43OpenTT(rid,pid);else v43OpenRoute(rid);
 }catch(e){err.textContent='Не завершено: '+e.message+'. Введені тарифи збережені у формі; можна повторити «Готово».'}
 finally{courierSaving=false;if($('#v433-courier-save'))$('#v433-courier-save').disabled=false}
};

function enhance(){addFopEditors();['fop','pickup','stv','sav','bakery','other','replen'].forEach(applyBlock);const pick=findBlock('pickup');if(pick)pick.classList.add('v431-pickup-purple');if($('.v43-stack')&&!$('#v431-courier')&&!$('#v433-courier-load-error'))renderCourier()}
const css=`.v431-pickup-purple .v431-exp{background:linear-gradient(135deg,#5220a6,#7d31ce)!important}.v431-edit-transport{border:1px solid #6847a5;background:#191429;color:#c7a8ff;border-radius:9px;padding:6px 8px;font-size:9px;font-weight:800}.v431-modal-bg{position:fixed;inset:0;background:#000b;z-index:10050;display:flex;align-items:flex-end;justify-content:center}.v431-modal{width:min(680px,100%);max-height:90vh;overflow:auto;background:#101722;border:1px solid #2c3749;border-radius:24px 24px 0 0;padding:16px}.v431-modal-head,.v431-modal-actions{display:flex;justify-content:space-between;align-items:center;gap:8px}.v431-modal-head h3{margin:0}.v431-modal-head button,.v431-modal-actions button,.v431-cactions button{border:1px solid #303a4a;background:#111824;color:#fff;border-radius:11px;padding:10px 12px}.v431-modal-actions{justify-content:flex-end;margin-top:14px}.v431-form{display:grid;gap:10px}.v431-form label{font-size:11px;color:#aab3c2}.v431-form input,.v431-form select{width:100%;margin-top:5px;background:#0d131d;border:1px solid #303a4a;color:#fff;border-radius:11px;padding:11px;box-sizing:border-box}.v431-directory{display:grid;gap:8px}.v431-directory>div{border:1px solid #2a3444;border-radius:11px;padding:10px}.v431-courier-head{width:100%;display:flex;justify-content:space-between;align-items:center;border:1px solid #2b3546;background:linear-gradient(135deg,#141b29,#0d131e);color:#fff;border-radius:16px;padding:14px 15px;margin:0 0 10px;text-align:left}.v431-courier-head>div{display:grid;gap:3px}.v431-courier-head small{font-size:9px;color:#818da0}.v431-courier-head>span{font-size:10px;color:#a98aff}.v431-cactions{display:flex;justify-content:flex-end;gap:8px;margin:8px 0}.v431-ckpi{display:grid;grid-template-columns:repeat(4,1fr);gap:7px;margin:8px 0}.v431-ckpi>div{background:#0d141f;border:1px solid #222d3e;border-radius:11px;padding:9px}.v431-ckpi small,.v431-croute small,.v431-cpt small{display:block;color:#7f8a9d;font-size:9px}.v431-ckpi b{font-size:12px}.v431-croute{border:1px solid #253044;background:linear-gradient(145deg,#121a28,#0c121c);border-radius:18px;padding:14px;margin:10px 0}.v431-croute-top{display:flex;justify-content:space-between;gap:10px}.v431-croute-top>div{display:grid}.v431-cpt{display:grid;grid-template-columns:2fr repeat(3,1fr);gap:7px;align-items:center;border-top:1px solid #222d3e;padding:9px 0}.v431-cpt>div:first-child{min-width:0}.v431-cpt b{font-size:11px}.v431-cshipment{display:grid;grid-template-columns:1fr auto auto;gap:12px;align-items:center;border:1px solid #293446;border-radius:11px;padding:10px;margin:7px 0}.v431-cshipment strong{color:#c08bff}.v431-ttselect{display:grid;gap:7px;max-height:48vh;overflow:auto}.v431-selectrow{display:grid!important;grid-template-columns:auto 1fr 150px;gap:8px;align-items:center;border:1px solid #293446;border-radius:12px;padding:9px}.v431-selectrow>input[type=checkbox]{width:auto;margin:0}.v431-selectrow span{min-width:0}.v431-selectrow small{display:block;color:#7f8a9d;margin-top:3px}.v431-note{color:#8d98aa;line-height:1.45}.primary{background:linear-gradient(135deg,#7848ff,#9a4dff)!important;border-color:#8c55ff!important;color:#fff!important}@media(max-width:520px){.v431-ckpi{grid-template-columns:repeat(2,1fr)}.v431-cpt{grid-template-columns:1fr 1fr}.v431-selectrow{grid-template-columns:auto 1fr}.v431-selectrow .v431-cost{grid-column:2}.v431-edit-transport{font-size:8px;padding:5px 6px}}`;
const st=document.createElement('style');st.textContent=css;document.head.appendChild(st);
let enhanceScheduled=false;const obs=new MutationObserver(()=>{if(enhanceScheduled)return;enhanceScheduled=true;setTimeout(()=>{enhanceScheduled=false;enhance()},40)});obs.observe(document.body,{childList:true,subtree:true});setTimeout(enhance,700);
})();
