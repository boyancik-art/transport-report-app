(()=>{
const BUILD=window.TRTS_BUILD||'v43.9';
const $=s=>document.querySelector(s), E=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const T=v=>String(v??'').trim(), N=v=>{const x=Number(String(v??'').replace(',','.'));return Number.isFinite(x)?x:0};
const F=(v,d=0)=>new Intl.NumberFormat('uk-UA',{maximumFractionDigits:d}).format(N(v));
const M=v=>new Intl.NumberFormat('uk-UA',{maximumFractionDigits:0}).format(N(v))+' ₴';
const M2=v=>new Intl.NumberFormat('uk-UA',{minimumFractionDigits:2,maximumFractionDigits:2}).format(N(v))+' ₴';
const P=v=>Number.isFinite(+v)?new Intl.NumberFormat('uk-UA',{minimumFractionDigits:2,maximumFractionDigits:2}).format(+v)+'%':'—';
const today=()=>new Date().toISOString().slice(0,10);
const monday=d=>{const x=new Date(d+'T12:00:00'),n=x.getDay()||7;x.setDate(x.getDate()-n+1);return x.toISOString().slice(0,10)};
const addDays=(d,k)=>{const x=new Date(d+'T12:00:00');x.setDate(x.getDate()+k);return x.toISOString().slice(0,10)};
let mode='today',from=today(),to=today(),filter='all',groupExp=false,selectGroup=false,selected=new Set();
let meta={people:new Map(),carriers:[],warehouses:[],whMap:[],extras:[],manual:[],groups:[],replenishments:[],rules:new Map()};
const dat=()=>typeof D!=='undefined'?D:(window.D||{}), v=()=>document.getElementById('view')||document.getElementById('content');
function norm(s){return T(s).toLocaleLowerCase('uk-UA').replace(/[’']/g,'').replace(/[\s.,;:()\-\/\\]+/g,' ').replace(/\b(обл|область|р н|район)\b/g,' ').replace(/\s+/g,' ').trim()}
function coverage(r){return T(facts(r).section_override)||meta.rules.get(norm(r?.expeditor_name))||window.TRTS_V39_EXPEDITOR_COVERAGE?.[T(r?.expeditor_name)]||''}
function isFop(r){return /^(фоп|ts|тс)$/i.test(T(coverage(r)))}
const BAKERY_OPTIONS=['Пекарня','Пекарня Заморозка','Фреш','ОЗ'];
const FOP_WAVES=['24','48','Мережа','ОЗ'];
const VT_STORES=['Стоянка','Палладіна','Філатова','Маккейна','Верхогляда','Голосіївська','Здановської','Мокра','Бажана','Дмитріська'];
const isBakery=r=>/пекар|фреш|fresh/i.test(coverage(r));
const isTariff=r=>isFop(r)||isBakery(r);
let groupSection='fop';
function isPickup(r){return /самовивіз/i.test(T(coverage(r)))}
const points=r=>(dat().points||[]).filter(p=>+p.route_id===+r.id), facts=r=>(dat().facts||[]).find(x=>+x.route_id===+r.id)||{};
const docs=r=>(dat().docs||[]).filter(x=>T(x.route_delivery_id)===T(r.route_delivery_id));
const loc=p=>(dat().locations||[]).find(x=>+x.id===+p.location_id)||{};
function pointDocs(r,p){const l=loc(p);return docs(r).filter(x=>T(x.customer_id)===T(p.customer_id)&&(!l.address_id||T(x.address_id)===T(l.address_id)))}
function pointAddress(r,p){return T(loc(p).delivery_address)||T(pointDocs(r,p).find(d=>T(d.delivery_address))?.delivery_address)||'Адреса не вказана'}
function invoiceGroups(ds){
 const groups=new Map();
 for(const d of ds){
  const no=T(d.sale_code)||T(d.operation_group_id)||T(d.id),x=groups.get(no)||{no,pals:0,bottles:0,weight:0,sum:0};
  x.pals+=N(d.pallets);x.bottles+=N(d.bottles);x.weight+=N(d.weight);x.sum+=N(d.order_amount);groups.set(no,x);
 }
 return [...groups.values()];
}
// Keep the imported total when document details have not all been loaded.
function invoiceCount(p,ds){return Math.max(invoiceGroups(ds).length,Math.max(0,Math.trunc(N(p.documents_count))))}
function invoiceCountRow(p,ds){return `<div class="v43-sales v434-doc-count"><small>К-ть накладних</small><b>${F(invoiceCount(p,ds))}</b></div>`}
function displayWh(raw){
 const q=norm(raw);if(!q)return '—';
 const exact=meta.whMap.find(w=>norm(w.source_warehouse)===q);
 if(exact)return exact.display_name;
 const candidates=meta.whMap.filter(w=>norm(w.source_warehouse)&&q.includes(norm(w.source_warehouse)));
 if(candidates.length){candidates.sort((a,b)=>T(b.source_warehouse).length-T(a.source_warehouse).length);return candidates[0].display_name}
 const cities=[[/хмельницьк/i,'Хмельницький'],[/біл.*церк/i,'Біла Церква'],[/білогород/i,'Білогородка'],[/розумов/i,'Київ'],[/малех|львів/i,'Львів'],[/чайк/i,'Чайки'],[/дніпр/i,'Дніпро'],[/полтав/i,'Полтава'],[/одес/i,'Одеса'],[/черкас/i,'Черкаси'],[/чернів/i,'Чернівці'],[/луцьк/i,'Луцьк'],[/терноп/i,'Тернопіль'],[/київ/i,'Київ']];
 const city=cities.find(([re])=>re.test(q))?.[1];
 if(!city)return T(raw).split(/[,;]|(?:вул\.|пр-т)/)[0]||'—';
 const options=meta.warehouses.filter(w=>norm(w).startsWith(norm(city)));
 const provider=T(raw).match(/\b(STV|SAV|Ecol|TS)\b/i)?.[1];
 const match=provider?options.find(w=>norm(w).endsWith(norm(provider))):options.length===1?options[0]:null;
 return match||city+(provider?' '+provider:'');
}
window.v433Warehouse=displayWh;
function extraFor(r){return meta.extras.filter(x=>+x.route_id===+r.id)}
function systemMetrics(r){const ds=docs(r),ps=points(r);return{sales:ds.reduce((s,x)=>s+N(x.order_amount),0)||N(r.total_order_amount),pals:ds.reduce((s,x)=>s+N(x.pallets),0)||ps.reduce((s,x)=>s+N(x.pallets),0),bottles:ds.reduce((s,x)=>s+N(x.bottles),0)||ps.reduce((s,x)=>s+N(x.bottles),0),weight:ds.reduce((s,x)=>s+N(x.weight),0)||ps.reduce((s,x)=>s+N(x.weight),0),tt:ps.length}}
function baseMetrics(r){const s=systemMetrics(r),ex=extraFor(r);return{sales:s.sales+ex.reduce((a,x)=>a+N(x.order_amount),0),pals:s.pals+ex.reduce((a,x)=>a+N(x.pallets),0),bottles:s.bottles+ex.reduce((a,x)=>a+N(x.bottles),0),weight:s.weight+ex.reduce((a,x)=>a+N(x.weight),0),tt:s.tt+ex.reduce((a,x)=>a+(N(x.tt_count)||1),0),extra:ex.reduce((a,x)=>a+(N(x.tt_count)||1),0)}}
function extraAllocation(r,x){const s=systemMetrics(r),tt=N(x.tt_count)||1,avg=k=>s.tt?s[k==='pallets'?'pals':k]/s.tt:0,value=k=>N(x[k])>0?N(x[k]):avg(k)*tt;return{pals:value('pallets'),bottles:value('bottles'),weight:value('weight'),tt}}
function allocationMetrics(r){const s=systemMetrics(r);return extraFor(r).reduce((a,x)=>{const q=extraAllocation(r,x);a.pals+=q.pals;a.bottles+=q.bottles;a.weight+=q.weight;a.tt+=q.tt;return a},{pals:s.pals,bottles:s.bottles,weight:s.weight,tt:s.tt})}
function weightedShare(m,total){let parts=[];if(total.pals>0)parts.push(.3*m.pals/total.pals);if(total.bottles>0)parts.push(.5*m.bottles/total.bottles);if(total.weight>0)parts.push(.2*m.weight/total.weight);let raw=parts.reduce((a,b)=>a+b,0),active=(total.pals>0?.3:0)+(total.bottles>0?.5:0)+(total.weight>0?.2:0);return active?raw/active:0}
function allocationShare(m,total){const physical=weightedShare(m,total);return physical||(total.pals<=0&&total.bottles<=0&&total.weight<=0&&total.tt>0?N(m.tt)/total.tt:0)}
function routeCost(r){const f=facts(r),m=allocationMetrics(r);if(/ТОВ ТС ПЛЮС/i.test(T(f.carrier_name)))return 0;if(f.tariff_group_id){const g=meta.groups.find(x=>T(x.id)===T(f.tariff_group_id));if(g){const members=(dat().routes||[]).filter(z=>T(facts(z).tariff_group_id)===T(g.id)),tot=members.reduce((a,z)=>{const q=allocationMetrics(z);a.pals+=q.pals;a.bottles+=q.bottles;a.weight+=q.weight;a.tt+=q.tt;return a},{pals:0,bottles:0,weight:0,tt:0});return N(g.tariff)*allocationShare(m,tot)}}return N(f.corrected_tariff??f.tariff)}
function metrics(r){const m=baseMetrics(r),cost=routeCost(r),f=facts(r);return{...m,cost,costTT:m.tt?cost/m.tt:0,log:m.sales?cost/m.sales*100:0,del:N(f.delivered_points)}}
function taName(r,p){const alloc=(dat().alloc||[]).filter(x=>+x.route_point_id===+p.id),ids=[...new Set([...alloc,...pointDocs(r,p)].map(x=>T(x.employee_id)).filter(Boolean))];return [...new Set(ids.map(id=>meta.people.get(id)).filter(Boolean))].join(' / ')||'ПІБ не знайдено'}
window.v439TA=taName;
function biz(r,p){const a=(dat().alloc||[]).filter(x=>+x.route_point_id===+p.id),raw=(a.length?a.map(x=>x.business_unit):pointDocs(r,p).map(x=>x.business_unit)).filter(Boolean);return [...new Set(raw.map(x=>window.TRTS_V39_BUSINESS?.[T(x)]||T(x)))].join(' / ')||'—'}
function statusText(){return `Реальні дані · ${from===to?from:from+' — '+to} · оновлено ${new Date().toLocaleTimeString('uk-UA',{hour:'2-digit',minute:'2-digit'})}`}
const displayDate=d=>d.split('-').reverse().join('.');
function periodBar(){
 let el=$('#v43-period');if(!el){el=document.createElement('div');el.id='v43-period';const target=v();target?.parentNode?.insertBefore(el,target)}if(!el)return;
 el.innerHTML=`<div class="v43-period-inner"><div class="v43-period-buttons" aria-label="Період звіту"><button class="${mode==='today'?'on':''}" onclick="v43SetPeriod('today')">Сьогодні</button><button class="${mode==='week'?'on':''}" onclick="v43SetPeriod('week')">Тиждень</button><button class="${mode==='custom'?'on':''}" onclick="v43SetPeriod('custom')">Свій період</button></div><form id="v435-period-form" class="v43-custom ${mode==='custom'?'':'hide'}" onsubmit="event.preventDefault();v43ApplyCustom()"><label>З${window.TRTS_UI.dateField('v43-from',from)}</label><label>По${window.TRTS_UI.dateField('v43-to',to)}</label><button type="submit">Застосувати</button></form><div class="v435-period-status"><small id="v435-period-range">${E(displayDate(from))}${from===to?'':' — '+E(displayDate(to))}</small><button onclick="v435Refresh()">Оновити</button></div></div>`;
}
window.v435Refresh=()=>loadRange();
window.v43SetPeriod=async m=>{mode=m;if(m==='today'){from=to=today()}else if(m==='week'){from=monday(today());to=addDays(from,6)}periodBar();if(m!=='custom')await loadRange()};
window.v43ApplyCustom=async()=>{if(!$('#v435-period-form')?.reportValidity())return;const a=$('#v43-from').value,b=$('#v43-to').value;if(!window.TRTS_UI.validDate(a)||!window.TRTS_UI.validDate(b))return;from=a<=b?a:b;to=a<=b?b:a;periodBar();await loadRange()};
async function apiSafe(path){try{return await api(path)}catch(e){console.warn('v43',path,e);return[]}}
async function apiRange(path){
 const rows=[],ordered=/[?&]order=/.test(path)?path:path+'&order=id';
 for(let offset=0;;offset+=1000){
  const batch=await api(ordered+'&limit=1000&offset='+offset);
  if(!Array.isArray(batch))throw Error('Сервер не повернув дані звіту');
  rows.push(...batch);if(batch.length<1000)return rows;
 }
}
let rangeSequence=0;
window.v435ReportPeriod=()=>({from,to});
window.v435ReadRange=apiRange;
function screenLayout(detail=false){document.body.classList.add('pk-only');document.body.classList.toggle('trts-route-view',detail)}
async function loadRange(){
 screenLayout();
 const request=++rangeSequence,rangeFrom=from,rangeTo=to,vv=v();
 if(vv)vv.innerHTML='<div class="v43-loading">Оновлення реальних даних…</div>';
 try{
  const routes=await apiRange(`/rest/v1/routes?select=*&route_date=gte.${rangeFrom}&route_date=lte.${rangeTo}&order=route_date,route_delivery_id,id`),ids=routes.map(x=>x.id),rid=ids.length?`(${ids.join(',')})`:'(0)';
  const [pts,ff,dd,ee,pp,cc,wm,gg,mm,rr,ru]=await Promise.all([
   apiRange(`/rest/v1/route_points?select=*&route_id=in.${rid}`),
   apiRange(`/rest/v1/route_facts?select=*&route_id=in.${rid}`),
   apiRange(`/rest/v1/source_documents?select=*&document_date=gte.${rangeFrom}&document_date=lte.${rangeTo}`),
   apiRange(`/rest/v1/route_extra_points?select=*&route_id=in.${rid}`),
   apiRange('/rest/v1/employee_directory?select=employee_id,employee_name&order=employee_id'),
   apiRange('/rest/v1/transport_carriers?select=id,name,carrier_type&active=eq.true&order=name'),
   apiRange('/rest/v1/warehouse_display_map?select=source_warehouse,display_name&active=eq.true&order=id'),
   apiRange(`/rest/v1/tariff_groups?select=*&group_date=gte.${rangeFrom}&group_date=lte.${rangeTo}`),
   apiRange(`/rest/v1/fop_manual_routes?select=*&route_date=gte.${rangeFrom}&route_date=lte.${rangeTo}&order=route_date,id`),
   apiRange(`/rest/v1/branch_replenishments?select=*&shipment_date=gte.${rangeFrom}&shipment_date=lte.${rangeTo}&order=shipment_date.desc,id`),
   apiSafe('/rest/v1/expeditor_section_rules?select=expeditor_name,coverage&active=eq.true')
  ]);
  const lids=[...new Set(pts.map(x=>x.location_id).filter(Boolean))],lid=lids.length?`(${lids.join(',')})`:'(0)',pids=pts.map(x=>x.id),pid=pids.length?`(${pids.join(',')})`:'(0)';
  const [ll,aa]=await Promise.all([apiRange(`/rest/v1/locations?select=*&id=in.${lid}`),apiRange(`/rest/v1/route_business_allocations?select=*&route_point_id=in.${pid}`)]);
  if(request!==rangeSequence)return;
  if(typeof D!=='undefined'){D.routes=routes;D.points=pts;D.facts=ff;D.docs=dd;D.locations=ll;D.alloc=aa}else window.D={routes,points:pts,facts:ff,docs:dd,locations:ll,alloc:aa};
  meta.people=new Map(pp.map(x=>[T(x.employee_id),T(x.employee_name)]));meta.carriers=cc.filter(x=>!['stv','sav'].includes(x.carrier_type));meta.whMap=wm;meta.warehouses=[...new Set(wm.map(x=>T(x.display_name)).filter(Boolean))].sort();meta.extras=ee;meta.groups=gg;meta.manual=mm;meta.replenishments=rr;meta.rules=new Map(ru.map(x=>[norm(x.expeditor_name),T(x.coverage)]));periodBar();renderDashboard();
 }catch(e){
  if(request!==rangeSequence)return;
  if(vv)vv.innerHTML='<div class="v43-empty" role="alert">Не вдалося завантажити вибраний період. '+E(e.message)+'<br><button onclick="v435Refresh()">Спробувати ще раз</button></div>';
 }
}
function pill(t,c=''){return`<span class="v43-pill ${c}">${E(t)}</span>`}
function routeCard(r){return routeSummary(r,false)}
function manualCard(x){return`<article class="v43-route manual"><div class="v43-route-top"><div><small>${E(x.route_date)}</small><b>Створено вручну</b></div>${pill(x.purpose,'group')}</div><div class="v43-four"><div><small>ТТ</small><b>${N(x.tt_count)}</b></div><div><small>Перевізник</small><b>${E(x.carrier_name||'—')}</b></div><div><small>Водій</small><b>${E(x.driver_name||'—')}</b></div><div><small>Авто</small><b>${E(x.vehicle_number||'—')}</b></div></div><div class="v43-sales"><small>Тариф</small><b>${M(x.tariff)}</b></div></article>`}
window.v433Dashboard=()=>renderDashboard();
function renderDashboard(){const vv=v();if(!vv)return;screenLayout();let rs=(dat().routes||[]).filter(isFop);if(filter==='notariff')rs=rs.filter(r=>!/ТОВ ТС ПЛЮС/i.test(T(facts(r).carrier_name))&&routeCost(r)<=0);let cards='';if(groupExp){const groups=new Map();rs.forEach(r=>{const k=T(r.expeditor_name)||'Без експедитора';if(!groups.has(k))groups.set(k,[]);groups.get(k).push(r)});cards=[...groups].map(([k,a])=>`<div class="v43-exp-group"><h3>${E(k)} <span>${a.length}</span></h3>${a.map(routeCard).join('')}</div>`).join('')}else cards=rs.map(routeCard).join('');const pick=(dat().routes||[]).filter(isPickup);vv.innerHTML=`<div class="v43-screen"><section class="v43-head"><div><h2>ФОП / TS</h2><small>${E(statusText())}</small></div><div class="v43-actions"><button onclick="v43CarrierDirectory()">Перевізники</button><button class="primary" onclick="v43ManualRoute()">+ Створити маршрут</button></div></section><div class="v43-filters"><button class="${filter==='all'?'on':''}" onclick="v43Filter('all')">Усі · ${rs.length}</button><button class="${filter==='notariff'?'on':''}" onclick="v43Filter('notariff')">Авто без тарифу</button><button class="${groupExp?'on':''}" onclick="v43GroupExp()">Групувати по експедиторам</button></div><div class="v43-groupbar"><button onclick="v43StartGroup()">${selectGroup?'Скасувати групування':'Об’єднати експедиторів · 1 тариф'}</button>${selectGroup?`<button class="primary" ${selected.size<2?'disabled':''} onclick="v43FinishGroup()">Об’єднати експедиторів (${selected.size})</button>`:''}</div><div class="v43-stack">${cards||'<div class="v43-empty">Маршрутів за вибраний період немає</div>'}${meta.manual.map(manualCard).join('')}</div><section class="v43-section"><div class="v43-section-title"><div><h2>Поповнення філій</h2><small>${meta.replenishments.length} за період</small></div><button class="primary" onclick="v43Replenishment()">+ Додати поповнення</button></div>${meta.replenishments.map(replenCard).join('')||'<div class="v43-empty">Поповнень за період немає</div>'}</section><section class="v43-section"><div class="v43-section-title"><h2>Самовивіз</h2><small>${pick.length}</small></div></section></div>`;badge()}
window.v43Filter=x=>{filter=x==='notariff'?'notariff':'all';renderDashboard()};window.v43GroupExp=()=>{groupExp=!groupExp;renderDashboard()};window.v43StartGroup=(section='fop')=>{selectGroup=groupSection!==section||!selectGroup;groupSection=section;selected.clear();renderDashboard()};window.v43SelectRoute=(id,on)=>{on?selected.add(id):selected.delete(id);renderDashboard()};
function modal(title,body,actions=''){let m=$('#v43-modal');if(!m){m=document.createElement('div');m.id='v43-modal';document.body.appendChild(m)}m.innerHTML=`<div class="v43-modal-bg" onclick="if(event.target===this)v43CloseModal()"><div class="v43-modal"><div class="v43-modal-head"><h3>${E(title)}</h3><button onclick="v43CloseModal()">×</button></div><div class="v43-modal-body">${body}</div><div class="v43-modal-actions">${actions}</div></div></div>`;m.style.display='block';document.body.classList.add('trts-modal-open')}window.v43CloseModal=()=>{const m=$('#v43-modal');if(m)m.style.display='none';document.body.classList.remove('trts-modal-open')};
window.v43CarrierDirectory=()=>modal('Перевізники',`<div class="v43-directory">${meta.carriers.map(x=>`<div>${E(x.name)}</div>`).join('')}<button onclick="v43AddCarrier()">+ Додати перевізника</button></div>`);
window.v43AddCarrier=()=>modal('Новий перевізник','<label>Назва<input id="v43-new-carrier" placeholder="Назва перевізника"></label>','<button onclick="v43CloseModal()">Скасувати</button><button class="primary" onclick="v43SaveCarrier()">Зберегти</button>');
window.v43SaveCarrier=async()=>{const name=T($('#v43-new-carrier')?.value);if(!name)return;await api('/rest/v1/transport_carriers',{method:'POST',headers:{Prefer:'return=minimal'},body:JSON.stringify({name,carrier_type:'route',active:true})});v43CloseModal();await loadRange()};
function carrierOptions(sel='',bakery=false){return (bakery?BAKERY_OPTIONS.map(name=>({name})):meta.carriers.filter(c=>c.name!=='ФМ Ложістік'||!meta.carriers.some(x=>x.name==='ФМ Ложистік'))).map(x=>`<option ${T(x.name)===T(sel)?'selected':''}>${E(x.name)}</option>`).join('')}
window.v43ManualRoute=()=>modal('Створити маршрут вручну',`<div class="v43-form"><label>Дата${window.TRTS_UI.dateField('mr-date',today())}</label><label>Мета<select id="mr-purpose" onchange="document.getElementById('mr-other').classList.toggle('hide',this.value!=='Інше')"><option>Повернення</option><option>Доставка ОЗ</option><option>Інше</option></select></label><label id="mr-other" class="hide">Вкажіть що саме<input id="mr-purpose-other"></label><label>К-ть ТТ<input id="mr-tt" type="number" min="1" value="1"></label><label>Перевізник<select id="mr-carrier">${carrierOptions()}</select></label><label>Водій<input id="mr-driver"></label><label>Авто<input id="mr-vehicle"></label><label>Тариф<input id="mr-tariff" type="number" min="0"></label></div>`,'<button onclick="v43CloseModal()">Скасувати</button><button class="primary" onclick="v43SaveManual()">Зберегти</button>');
window.v43SaveManual=async()=>{let purpose=$('#mr-purpose').value;if(purpose==='Інше')purpose=T($('#mr-purpose-other').value);const tt=N($('#mr-tt').value);if(!purpose||tt<1)return alert('Вкажіть мету та к-ть ТТ');await api('/rest/v1/fop_manual_routes',{method:'POST',headers:{Prefer:'return=minimal'},body:JSON.stringify({route_date:$('#mr-date').value,purpose,tt_count:tt,carrier_name:$('#mr-carrier').value,driver_name:T($('#mr-driver').value),vehicle_number:T($('#mr-vehicle').value),tariff:N($('#mr-tariff').value)})});v43CloseModal();await loadRange()};
window.v43FinishGroup=()=>{if(selected.size<2)return;pendingGroup=null;modal('Один тариф на декілька експедиторів',`<div class="v43-form"><div class="v43-info">Вибрано маршрутів експедиторів: <b>${selected.size}</b>. Тариф буде розподілений між усіма ТТ цих маршрутів за 30% палети / 50% пляшки / 20% кг.</div><label>Перевізник<select id="tg-carrier">${carrierOptions('',groupSection==='bakery')}</select></label><label>Водій<input id="tg-driver"></label><label>Авто<input id="tg-vehicle"></label><label>Загальний тариф<input id="tg-tariff" type="number" min="0" step="0.01" required></label><p id="tg-error" class="v433-error" role="alert"></p></div>`,'<button onclick="v43CloseModal()">Скасувати</button><button id="tg-save" class="primary" onclick="v43SaveGroup()">Об’єднати</button>')};
let groupSaving=false,pendingGroup=null;
window.v43SaveGroup=async()=>{
 if(groupSaving||selected.size<2)return;
 const ids=[...selected],routes=(dat().routes||[]).filter(r=>ids.includes(+r.id)),dates=[...new Set(routes.map(r=>r.route_date))],err=$('#tg-error');
 if(dates.length!==1){err.textContent='Об’єднайте маршрути однієї дати';return}
 if(!$('#tg-tariff').reportValidity()||!T($('#tg-carrier').value))return;
 const payload={group_date:dates[0],carrier_name:$('#tg-carrier').value,driver_name:T($('#tg-driver').value),vehicle_number:T($('#tg-vehicle').value),tariff:N($('#tg-tariff').value)};
 groupSaving=true;$('#tg-save').disabled=true;
 try{
  const groups=await api('/rest/v1/tariff_groups'+(pendingGroup?'?id=eq.'+encodeURIComponent(pendingGroup):''),{method:pendingGroup?'PATCH':'POST',headers:{Prefer:'return=representation'},body:JSON.stringify(payload)});
  if(!groups?.[0]?.id)throw Error('Сервер не підтвердив спільний тариф');pendingGroup=groups[0].id;
  for(const id of ids){
   const existing=(dat().facts||[]).find(f=>+f.route_id===id),fields={tariff_group_id:pendingGroup,carrier_name:payload.carrier_name,driver_name:payload.driver_name,vehicle_number:payload.vehicle_number};
   const saved=await api('/rest/v1/route_facts'+(existing?'?route_id=eq.'+id:''),{method:existing?'PATCH':'POST',headers:{Prefer:'return=representation'},body:JSON.stringify(existing?fields:{route_id:id,...fields})});
   if(!saved?.length)throw Error('Не підтверджено маршрут '+id);
   if(existing)Object.assign(existing,saved[0]);else (dat().facts??=[]).push(saved[0]);
  }
  pendingGroup=null;selected.clear();selectGroup=false;await loadRange();v43CloseModal();
 }catch(e){err.textContent='Не завершено: '+e.message+'. Повторіть «Об’єднати».'}
 finally{groupSaving=false;if($('#tg-save'))$('#tg-save').disabled=false}
};
function pointCost(r,p){const rm=allocationMetrics(r),pm={pals:N(p.pallets),bottles:N(p.bottles),weight:N(p.weight),tt:1},ds=pointDocs(r,p);pm.pals=ds.reduce((s,x)=>s+N(x.pallets),0)||pm.pals;pm.bottles=ds.reduce((s,x)=>s+N(x.bottles),0)||pm.bottles;pm.weight=ds.reduce((s,x)=>s+N(x.weight),0)||pm.weight;const sum=ds.reduce((s,x)=>s+N(x.order_amount),0)||N(p.order_amount),cost=sectionKey(r)==='courier'?N(window.v439CourierPointCost?.(p)):routeCost(r)*allocationShare(pm,rm);return{...pm,sum,cost,log:sum?cost/sum*100:0}}
function extraCost(r,x){const q=extraAllocation(r,x),cost=routeCost(r)*allocationShare(q,allocationMetrics(r));return{...q,cost,costTT:q.tt?cost/q.tt:0}}
window.v437AllocationSnapshot=id=>{const r=(dat().routes||[]).find(x=>+x.id===+id);if(!r)return null;const m=metrics(r);return{tt:m.tt,routeCost:m.cost,costTT:m.costTT,points:points(r).map(p=>({id:p.id,cost:pointCost(r,p).cost})),extras:extraFor(r).map(x=>({id:x.id,...extraCost(r,x)}))}}
const uiIcon=name=>window.TRTS_UI?.icon(name)||'';
function sectionKey(r){const c=coverage(r);if(/самовивіз/i.test(c))return'pickup';if(/^(STV|SAV)$/i.test(c))return c.toLowerCase();if(/^(фоп|ts|тс)$/i.test(c))return'fop';if(/кур.?єр/i.test(c))return'courier';if(/пекар|фреш|fresh/i.test(c))return'bakery';return'other'}
window.v436SectionKey=sectionKey;
window.v436Coverage=coverage;
function routeSummary(r,detail=false){
 const f=facts(r),m=metrics(r),pickup=isPickup(r),fop=isTariff(r),courier=sectionKey(r)==='courier',carrier=(courier?window.v439CourierDefault?.(r):T(f.carrier_name))||'Не вказано',wave=T(f.wave)||'Не вказано',bad=fop&&!/ТОВ ТС ПЛЮС/i.test(carrier)&&m.cost<=0;
 if(courier){m.cost=window.v439CourierRouteCost?.(r)||0;m.costTT=m.tt?m.cost/m.tt:0;m.log=m.sales?m.cost/m.sales*100:0}
 const edit=courier?`event.stopPropagation();v439EditCourierCarrier(${r.id})`:`event.stopPropagation();v431EditTransport(${r.id})`;
 const field=(icon,label,value,action='',cls='')=>`<${action?'button type="button"':'div'} class="v436-field ${cls}" ${action?`onclick="${action}"`:''}>${uiIcon(icon)}<span><small>${label}</small><b>${E(value)}</b></span>${action?uiIcon('chevron'):''}</${action?'button':'div'}>`;
 return `<article class="v436-route ${detail?'v43-route-detail':pickup?'v431-pickup-card':'v43-route'} ${bad?'warn':''}" ${detail?'':`onclick="v43OpenRoute(${r.id})"`} data-route-id="${r.id}"><div class="v436-route-top">${selectGroup&&fop&&sectionKey(r)===groupSection&&!detail?`<input type="checkbox" aria-label="Вибрати експедитора маршруту ${E(r.route_delivery_id)}" ${selected.has(r.id)?'checked':''} onclick="event.stopPropagation();v43SelectRoute(${r.id},this.checked)">`:''}<time>${E(displayDate(r.route_date||today()))}</time><b class="v436-route-id">${detail?'ID ':''}${E(r.route_delivery_id||r.id)}</b>${detail?`<button type="button" class="v436-change" onclick="v436ChangeSection(${r.id})">${uiIcon('edit')}<span>Змінити блок</span></button>`:bad?pill('Без тарифу','bad'):''}</div><div class="v436-exp">${uiIcon('person')}<div><small>Експедитор</small><b>${E(r.expeditor_name||'—')}</b></div><button type="button" class="v436-swap" aria-label="Змінити блок маршруту" onclick="event.stopPropagation();v436ChangeSection(${r.id})">${uiIcon('swap')}</button></div><div class="v436-route-fields ${!detail&&pickup?'compact':''}">${field('warehouse','Склад відвантаження',displayWh(r.warehouse),'','v431-cell')}${detail||!pickup?field('truck','Перевізник',carrier,edit):''}${!courier&&(detail||!pickup)?field('wave','Хвиля',/^\d+$/.test(wave)?wave+' год':wave,edit,'v436-wave'):''}<div class="v436-metrics"><div><small>ТТ</small><b>${m.tt}</b></div><div><small>Пал</small><b>${F(m.pals,3)}</b></div><div><small>Пляшки</small><b>${F(m.bottles)}</b></div><div><small>Вага</small><b>${F(m.weight,1)} кг</b></div></div></div>${fop||courier?`<div class="v436-finance"><div><small>${f.tariff_group_id?'Частка тарифу':'Тариф'}</small><b>${M(m.cost)}</b></div><div><small>% логістики</small><b>${P(m.log)}</b></div></div>`:''}<div class="v436-total"><small>Сума маршруту</small><b>${M(m.sales)}</b></div>${fop?`<button class="v431-edit-transport v433-edit" onclick="${edit}">Перевізник · хвиля · тариф</button>${deliveredButton(r,detail?'route':'dashboard')}`:''}</article>`;
}
window.v436RouteCard=r=>routeSummary(r,false);
function invoiceTable(r,p){
 const ds=pointDocs(r,p),invoices=invoiceGroups(ds),count=invoiceCount(p,ds);
 return `<div class="v436-invoices"><div class="v436-invoice-label">Накладні (${F(count)})</div>${invoices.length?`<table class="v436-invoice-table"><thead><tr><th>№ накладної</th><th>Пал</th><th>Пляшки</th><th>Вага</th><th>Сума</th></tr></thead><tbody>${invoices.map(x=>`<tr><td>№ ${E(x.no)}</td><td>${F(x.pals,3)}</td><td>${F(x.bottles)}</td><td>${F(x.weight,1)} кг</td><td>${M(x.sum)}</td></tr>`).join('')}</tbody></table>`:count===0?'<p class="v436-empty">Накладних немає</p>':''}${invoices.length<count?`<p class="v436-empty">Завантажено ${invoices.length} із ${count} накладних. Оновіть дані.</p>`:''}</div>`;
}
window.v436InvoiceTable=invoiceTable;
window.v436InvoiceCount=(r,p)=>invoiceCount(p,pointDocs(r,p));
window.v436PointAddress=pointAddress;
function addressCard(r,p,i){
 const ds=pointDocs(r,p),customer=T(p.customer_name)||T(ds[0]?.customer_name)||'Клієнт',c=pointCost(r,p);
 return `<article class="v43-tt v436-address" data-point-id="${p.id}" onclick="v43OpenTT(${r.id},${p.id})"><button type="button" class="v436-address-head" onclick="event.stopPropagation();v43OpenTT(${r.id},${p.id})"><span class="v436-number">${i+1}</span><span><b>${E(customer)}</b><small>${E(pointAddress(r,p))}</small></span>${uiIcon('chevron')}</button><div class="v436-business"><div><small>Business</small><b>${E(biz(r,p))}</b></div><div><small>ТА</small><b>${E(taName(r,p))}</b></div></div><div class="v436-point-metrics"><span>Пал <b>${F(c.pals,3)}</b></span><span>Пляшки <b>${F(c.bottles)}</b></span><span>Вага <b>${F(c.weight,1)} кг</b></span><span class="v434-doc-count">К-ть накладних <b>${F(invoiceCount(p,ds))}</b></span></div>${isTariff(r)||sectionKey(r)==='courier'?`<div class="v437-point-finance"><span>Доставка ТТ <b>${M2(c.cost)}</b></span><span>% логістики <b>${P(c.log)}</b></span></div>`:''}${sectionKey(r)==='courier'?`<button class="v439-carrier-tt" onclick="event.stopPropagation();v439EditCourierCarrier(${r.id},${p.id})">Перевізник ТТ · ${E(window.v439CourierPointCarrier?.(r,p)||'Не вказано')}</button>`:''}${invoiceTable(r,p)}</article>`;
}
window.v436AddressCard=addressCard;
window.v43OpenRoute=id=>{
 const r=(dat().routes||[]).find(x=>+x.id===+id);if(!r)return;screenLayout(true);
 const ps=points(r);
 v().innerHTML=`<div class="v43-screen v436-detail"><div class="v436-detail-head"><button class="v43-back" aria-label="Назад до маршрутів" onclick="v433Dashboard()">${uiIcon('back')}</button><div><h2>Маршрут</h2><small>#${E(r.route_delivery_id||r.id)}</small></div></div>${routeSummary(r,true)}${sectionKey(r)==='courier'?`<button class="primary v433-open-delivery" onclick="v433OpenDelivery(${r.id})">Тарифи ТТ · об’єднання</button>`:''}<div class="v436-address-title"><h3>Адреси маршруту</h3>${sectionKey(r)!=='courier'?`<button type="button" onclick="v43AddTT(${r.id})">Додати ТТ ${uiIcon('plus')}</button>`:''}${isBakery(r)?`<button class="primary" onclick="v439SelectVT(${r.id})">ВТ по маршруту ${uiIcon('plus')}</button>`:''}</div>${ps.map((p,i)=>addressCard(r,p,i)).join('')}${extraFor(r).map(x=>{const c=extraCost(r,x),pickup=isPickup(r);return`<article class="v43-extra-row v437-extra-card"><div><small>${x.point_type==='vt'?'ВТ по маршруту':'Додаткова ТТ'}</small><b>${E(x.name)}</b></div><div class="v437-extra-metrics"><span>ТТ <b>${c.tt}</b></span><span>Пал <b>${F(N(x.pallets),3)}</b></span><span>Пляшки <b>${F(N(x.bottles))}</b></span><span>Вага <b>${F(N(x.weight),1)} кг</b></span>${pickup?'':`<span>Частка доставки <b>${M2(c.cost)}</b></span><span>Вартість 1 ТТ <b>${M2(c.costTT)}</b></span>`}</div></article>`}).join('')}<button type="button" class="v436-bottom primary" onclick="v436ChangeSection(${r.id})">${uiIcon('swap')} Змінити блок маршруту</button></div>`;
 window.scrollTo(0,0);
};
window.v412Route=id=>window.v43OpenRoute(id);
window.v436ChangeSection=id=>{
 const r=(dat().routes||[]).find(x=>+x.id===+id);if(!r)return;
 const choices=['Самовивіз','ФОП','TS','Кур’єр','Пекарня/Фреш'];
 modal('Змінити блок маршруту',`<form id="v436-section-form" class="v43-form" onsubmit="event.preventDefault();v436SaveSection(${id})"><p class="v433-full">Маршрут ${E(r.route_delivery_id||r.id)}</p><label class="v433-full">Блок<select id="v436-section"><option value="">За експедитором</option>${choices.map(c=>`<option ${c===facts(r).section_override?'selected':''}>${E(c)}</option>`).join('')}</select></label><p id="v436-section-error" class="v433-error" role="alert"></p></form>`,'<button onclick="v43CloseModal()">Скасувати</button><button id="v436-section-save" class="primary" onclick="v436SaveSection('+id+')">Готово</button>');
};
let sectionSaving=false;
window.v436SaveSection=async id=>{
 if(sectionSaving)return;const r=(dat().routes||[]).find(x=>+x.id===+id);if(!r)return;
 sectionSaving=true;$('#v436-section-save').disabled=true;
 try{
  const existing=(dat().facts||[]).find(x=>+x.route_id===+id),payload={section_override:$('#v436-section').value||null};
  const saved=await api('/rest/v1/route_facts'+(existing?'?route_id=eq.'+id:''),{method:existing?'PATCH':'POST',headers:{Prefer:'return=representation'},body:JSON.stringify(existing?payload:{route_id:id,...payload})});
  if(!saved?.length)throw Error('Сервер не підтвердив зміну блоку');
  if(existing)Object.assign(existing,saved[0]);else (dat().facts??=[]).push(saved[0]);
  v43CloseModal();renderDashboard();
 }catch(e){$('#v436-section-error').textContent='Не збережено: '+e.message}finally{sectionSaving=false;if($('#v436-section-save'))$('#v436-section-save').disabled=false}
};
window.v436AddAddress=id=>modal('Додати адресу',`<form id="v436-address-form" class="v43-form" onsubmit="event.preventDefault();v436SaveAddress(${id})"><label class="v433-full">Адреса або назва точки<input id="v436-address" required maxlength="500" placeholder="Місто, вулиця, будинок"></label><p id="v436-address-error" class="v433-error" role="alert"></p></form>`,'<button onclick="v43CloseModal()">Скасувати</button><button id="v436-address-save" class="primary" onclick="v436SaveAddress('+id+')">Готово</button>');
let addressSaving=false;
window.v436SaveAddress=async id=>{
 if(addressSaving||!$('#v436-address-form')?.reportValidity())return;const name=T($('#v436-address').value);if(!name)return;
 addressSaving=true;$('#v436-address-save').disabled=true;
 try{const saved=await api('/rest/v1/route_extra_points',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify({route_id:id,point_type:'extra_tt',name,tt_count:1})});if(!saved?.length)throw Error('Сервер не підтвердив адресу');meta.extras.push(saved[0]);v43CloseModal();v43OpenRoute(id)}catch(e){$('#v436-address-error').textContent='Не збережено: '+e.message}finally{addressSaving=false;if($('#v436-address-save'))$('#v436-address-save').disabled=false}
};
window.v43OpenTT=(rid,pid)=>{const r=(dat().routes||[]).find(x=>+x.id===+rid),p=r&&points(r).find(x=>+x.id===+pid);if(!r||!p)return;screenLayout(true);window.scrollTo(0,0);const c=pointCost(r,p),ds=pointDocs(r,p),inv=invoiceGroups(ds),count=invoiceCount(p,ds),tot=inv.reduce((a,x)=>{a.pals+=x.pals;a.bottles+=x.bottles;a.weight+=x.weight;return a},{pals:0,bottles:0,weight:0});v().innerHTML=`<div class="v43-screen"><button class="v43-back" onclick="v43OpenRoute(${r.id})">‹ Маршрут</button><section class="v43-route-detail"><h2>${E(p.customer_name||ds[0]?.customer_name||'ТТ')}</h2><p class="v435-tt-address">${E(pointAddress(r,p))}</p>${sectionKey(r)==='courier'?`<button class="v439-carrier-tt" onclick="v439EditCourierCarrier(${r.id},${p.id},true)">Перевізник ТТ · ${E(window.v439CourierPointCarrier?.(r,p)||'Не вказано')}</button><button class="primary" onclick="v433OpenDelivery(${r.id},${p.id})">Тариф ТТ · об’єднання</button>`:''}${invoiceCountRow(p,ds)}<div class="v43-two"><div><small>Business</small><b>${E(biz(r,p))}</b></div><div><small>ТА</small><b>${E(taName(r,p))}</b></div></div><div class="v43-four"><div><small>Пал</small><b>${F(c.pals,3)}</b></div><div><small>Пляшки</small><b>${F(c.bottles)}</b></div><div><small>КГ</small><b>${F(c.weight,1)}</b></div><div><small>% лог.</small><b>${P(c.log)}</b></div></div></section><h3 class="v43-subtitle">НАКЛАДНІ В ЦІЙ ТТ · ${F(count)}</h3>${inv.length<count?`<div class="v43-empty">Завантажено ${F(inv.length)} із ${F(count)} накладних. Оновіть дані, щоб побачити весь список.</div>`:count===0?'<div class="v43-empty">Накладних у цій ТТ немає.</div>':''}${inv.map(x=>{const cost=c.cost*weightedShare(x,tot),log=x.sum?cost/x.sum*100:0;return`<article class="v43-invoice v439-invoice"><header><span class="v439-invoice-icon">${uiIcon('box')}</span><div><small>ВИДАТКОВА НАКЛАДНА</small><b>№ ${E(x.no)}</b></div></header><div class="v43-four"><div><small>Пляшки</small><b>${F(x.bottles)}</b></div><div><small>КГ</small><b>${F(x.weight,1)}</b></div><div><small>Пал</small><b>${F(x.pals,3)}</b></div><div><small>% лог.</small><b>${P(log)}</b></div></div><div class="v43-two"><div><small>Сума</small><b>${M(x.sum)}</b></div><div><small>Доставка</small><b>${M2(cost)}</b></div></div></article>`}).join('')}</div>`};
window.v43AddTT=rid=>modal('Додати ТТ',`<div class="v43-form"><label>Тип ТТ<select id="et-type" onchange="document.getElementById('et-other').classList.toggle('hide',this.value!=='Інше')"><option>Бар</option><option>Повернення</option><option>ОЗ</option><option>Інше</option></select></label><label id="et-other" class="hide">Вкажіть що саме<input id="et-name"></label><label>К-ть ТТ<input id="et-count" type="number" min="1" value="1"></label><details><summary>Фізичні показники, якщо є</summary><label>Палети<input id="et-pal" type="number" min="0" step="0.001"></label><label>Пляшки<input id="et-bot" type="number" min="0"></label><label>Вага, кг<input id="et-weight" type="number" min="0" step="0.1"></label></details></div>`,'<button onclick="v43CloseModal()">Скасувати</button><button class="primary" onclick="v43SaveExtra('+rid+')">Додати</button>');
let extraSaving=false;
window.v43SaveExtra=async rid=>{if(extraSaving)return;let name=$('#et-type').value;if(name==='Інше')name=T($('#et-name').value);const count=N($('#et-count').value);if(!name||count<1)return alert('Тип і к-ть ТТ обов’язкові');extraSaving=true;const button=$('#v43-modal .primary');if(button)button.disabled=true;try{const saved=await api('/rest/v1/route_extra_points',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify({route_id:rid,point_type:'extra_tt',name,tt_count:count,pallets:N($('#et-pal')?.value),bottles:N($('#et-bot')?.value),weight:N($('#et-weight')?.value)})});if(!saved?.length)throw Error('Сервер не підтвердив додаткову ТТ');meta.extras.push(saved[0]);v43CloseModal();v43OpenRoute(rid)}catch(e){alert('Не збережено: '+e.message)}finally{extraSaving=false;if(button)button.disabled=false}};
function replenCard(x){return`<article class="v43-replen"><div><small>${E(x.shipment_date)}</small><b>${(x.sender_warehouses||[]).map(E).join(' + ')} → ${E(x.receiver_warehouse)}</b></div><div class="v43-four"><div><small>Пал</small><b>${F(x.pallets,3)}</b></div><div><small>Вага</small><b>${F(x.weight,1)} кг</b></div><div><small>Сума</small><b>${M(x.replenishment_amount)}</b></div><div><small>Авто</small><b>${E(x.vehicle_number||'—')}</b></div></div><small>${E(x.carrier_name||'—')} · Тариф ${M(x.tariff)}</small></article>`}
window.v433SenderChange=()=>{const a=[...document.querySelectorAll('input[name="rp-sender"]:checked')].map(x=>x.value);const t=$('#rp-sender-summary');if(t)t.textContent=a.join(' + ')||'Оберіть склади'};
window.v43Replenishment=()=>modal('Додати поповнення',`<form id="rp-form" class="v43-form" onsubmit="event.preventDefault();v43SaveReplenishment()"><div class="v433-full"><span class="v433-label">Склади відправлення</span><details id="rp-senders" class="v433-select"><summary id="rp-sender-summary">Оберіть склади</summary><div class="v43-checks">${meta.warehouses.map(w=>`<label><input type="checkbox" name="rp-sender" value="${E(w)}" onchange="v433SenderChange()">${E(w)}</label>`).join('')}</div><button type="button" class="primary" onclick="document.getElementById('rp-senders').open=false">Готово</button></details></div><label>Склад отримувача<select id="rp-receiver" required><option value="">Оберіть склад</option>${meta.warehouses.map(w=>`<option>${E(w)}</option>`).join('')}</select></label><label>Дата відвантаження${window.TRTS_UI.dateField('rp-date',today())}</label><label>К-ть палет<input id="rp-pal" type="number" min="0" step="0.001"></label><label>Вага, кг<input id="rp-weight" type="number" min="0" step="0.1"></label><label>Сума поповнення<input id="rp-amount" type="number" min="0" step="0.01"></label><label>Тариф, грн<input id="rp-tariff" type="number" min="0" step="0.01" inputmode="decimal" required></label><label>Перевізник<select id="rp-carrier" required><option value="">Оберіть перевізника</option>${carrierOptions()}</select></label><div class="v433-full"><label>Свій перевізник<input id="rp-new-carrier" placeholder="Назва нового перевізника"></label><button id="rp-add-carrier" type="button" onclick="v439AddReplenCarrier()">+ Додати свого</button></div><label>Авто<input id="rp-vehicle"></label><p id="rp-error" class="v433-error" role="alert"></p></form>`,'<button onclick="v43CloseModal()">Скасувати</button><button id="rp-save" class="primary" onclick="v43SaveReplenishment()">Готово</button>');
let replenSaving=false;
window.v43SaveReplenishment=async()=>{
 if(replenSaving)return;const form=$('#rp-form');if(!form?.reportValidity())return;
 const send=[...document.querySelectorAll('input[name="rp-sender"]:checked')].map(x=>x.value),recv=$('#rp-receiver').value,err=$('#rp-error');
 err.textContent='';if(!send.length){err.textContent='Оберіть склад відправлення';$('#rp-senders').open=true;return}
 replenSaving=true;$('#rp-save').disabled=true;
 try{await api('/rest/v1/branch_replenishments',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify({shipment_date:$('#rp-date').value,sender_warehouses:send,receiver_warehouse:recv,pallets:N($('#rp-pal').value),weight:N($('#rp-weight').value),replenishment_amount:N($('#rp-amount').value),tariff:N($('#rp-tariff').value),carrier_name:$('#rp-carrier').value,vehicle_number:T($('#rp-vehicle').value)})});v43CloseModal();await loadRange()}
 catch(e){err.textContent='Не збережено: '+e.message}finally{replenSaving=false;if($('#rp-save'))$('#rp-save').disabled=false}
};
window.v433EditRoute=async id=>{
 const r=(dat().routes||[]).find(x=>+x.id===+id);if(!r)return;
 const f=facts(r),group=meta.groups.find(g=>T(g.id)===T(f.tariff_group_id));
 modal('Перевізник, хвиля і тариф','<p>Завантаження…</p>');
 try{
 const names=isBakery(r)?BAKERY_OPTIONS:[...new Set([...meta.carriers.map(x=>x.name),f.carrier_name].filter(Boolean))],wn=isBakery(r)?BAKERY_OPTIONS:FOP_WAVES;
 const options=(a,sel)=>'<option value="">Оберіть</option>'+a.map(x=>`<option value="${E(x)}" ${x===sel?'selected':''}>${E(x)}</option>`).join('');
 modal('Перевізник, хвиля і тариф',`<form id="v433-route-form" class="v43-form" onsubmit="event.preventDefault();v433SaveRoute(${id})"><label>Перевізник<select id="v433-carrier" required>${options(names,f.carrier_name)}</select></label><label>Хвиля<select id="v433-wave" required>${options(wn,f.wave)}</select></label><label>${group?'Загальний тариф групи':'Тариф'}, грн<input id="v433-tariff" type="number" min="0" step="0.01" inputmode="decimal" value="${group?N(group.tariff):f.corrected_tariff??f.tariff??''}" required></label>${group?'<p class="v433-full">Спільний тариф усіх маршрутів цієї групи. Частка маршруту перерахується після збереження.</p>':''}<p id="v433-route-error" class="v433-error" role="alert"></p></form>`,'<button onclick="v43CloseModal()">Скасувати</button><button id="v433-route-save" class="primary" onclick="v433SaveRoute('+id+')">Готово</button>');
 }catch(e){modal('Перевізник, хвиля і тариф','<p class="v433-error">'+E(e.message)+'</p>','<button onclick="v43CloseModal()">Закрити</button>')}
};
let routeSaving=false;
window.v433SaveRoute=async id=>{
 if(routeSaving||!$('#v433-route-form')?.reportValidity())return;
 const r=(dat().routes||[]).find(x=>+x.id===+id),f=facts(r),g=meta.groups.find(x=>T(x.id)===T(f.tariff_group_id));
 const tariff=N($('#v433-tariff').value),payload={carrier_name:$('#v433-carrier').value,wave:$('#v433-wave').value};
 if(!g)Object.assign(payload,{tariff,corrected_tariff:null});
 routeSaving=true;$('#v433-route-save').disabled=true;
 try{
 if(g){await api('/rest/v1/tariff_groups?id=eq.'+encodeURIComponent(g.id),{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify({tariff})});g.tariff=tariff}
 const exists=(dat().facts||[]).some(x=>+x.route_id===+id);
 const saved=await api('/rest/v1/route_facts'+(exists?'?route_id=eq.'+id:''),{method:exists?'PATCH':'POST',headers:{Prefer:'return=representation'},body:JSON.stringify(exists?payload:{route_id:id,...payload})});
 if(!saved?.length)throw Error('Сервер не підтвердив збереження маршруту');
 if(exists)Object.assign(f,saved[0]);else dat().facts.push(saved[0]);
 v43CloseModal();v43OpenRoute(id);
 }catch(e){$('#v433-route-error').textContent='Не збережено: '+e.message}finally{routeSaving=false;if($('#v433-route-save'))$('#v433-route-save').disabled=false}
};
function deliveredButton(r,back='route'){
 const f=facts(r),total=metrics(r).tt,label=f.delivered_points==null?'Вказати':F(f.delivered_points)+' / '+F(total);
 return `<button class="v435-delivered-edit" onclick="event.stopPropagation();v435EditDelivered(${r.id},'${back}')">Фактично доставлено ТТ · ${label}</button>`;
}
window.v435EditDelivered=(id,back='route')=>{
 const r=(dat().routes||[]).find(x=>+x.id===+id);if(!r||!isTariff(r))return;
 const total=metrics(r).tt,value=facts(r).delivered_points??'';
 modal('Факт доставки',`<form id="v435-delivered-form" class="v43-form" onsubmit="event.preventDefault();v435SaveDelivered(${id},'${back}')"><p class="v433-full">Маршрут ${E(r.route_delivery_id||r.id)} · усього ${F(total)} ТТ</p><label class="v433-full">Фактично доставлено ТТ<input id="v435-delivered" type="number" inputmode="numeric" min="0" max="${total}" step="1" value="${E(value)}" required></label><button type="button" class="v433-full" onclick="document.getElementById('v435-delivered').value='${total}'">Доставлено всі · ${F(total)} ТТ</button><p id="v435-delivered-error" class="v433-error" role="alert"></p></form>`,'<button onclick="v43CloseModal()">Скасувати</button><button id="v435-delivered-save" class="primary" onclick="v435SaveDelivered('+id+',\''+back+'\')">Готово</button>');
};
let deliveredSaving=false;
window.v435SaveDelivered=async(id,back='route')=>{
 if(deliveredSaving||!$('#v435-delivered-form')?.reportValidity())return;
 const r=(dat().routes||[]).find(x=>+x.id===+id);if(!r||!isTariff(r))return;
 const delivered=Number($('#v435-delivered').value),total=metrics(r).tt;
 if(!Number.isInteger(delivered)||delivered<0||delivered>total){$('#v435-delivered-error').textContent='Вкажіть цілу кількість від 0 до '+F(total);return}
 deliveredSaving=true;$('#v435-delivered-save').disabled=true;
 try{
  const existing=(dat().facts||[]).find(x=>+x.route_id===+id),payload={delivered_points:delivered};
  const saved=await api('/rest/v1/route_facts'+(existing?'?route_id=eq.'+id:''),{method:existing?'PATCH':'POST',headers:{Prefer:'return=representation'},body:JSON.stringify(existing?payload:{route_id:id,...payload})});
  if(!saved?.length)throw Error('Сервер не підтвердив збереження факту доставки');
  if(existing)Object.assign(existing,saved[0]);else (dat().facts??=[]).push(saved[0]);
  v43CloseModal();if(back==='dashboard')renderDashboard();else v43OpenRoute(id);
 }catch(e){$('#v435-delivered-error').textContent='Не збережено: '+e.message}finally{deliveredSaving=false;if($('#v435-delivered-save'))$('#v435-delivered-save').disabled=false}
};
function badge(){if(window.TRTS_RENDER_BUILD)return window.TRTS_RENDER_BUILD();const b=document.getElementById('trts-update');if(b){const s=b.querySelector('span')||b;if(s.textContent!=='TEST · '+BUILD)s.textContent='TEST · '+BUILD;if(b.style.display!=='inline-flex')b.style.display='inline-flex'}}

window.v439BakeryControls=()=>'<div class="v439-bakery-actions"><button onclick="v43StartGroup(\'bakery\')">'+(selectGroup&&groupSection==='bakery'?'Скасувати групування':'Об’єднати експедиторів · 1 тариф')+'</button>'+(selectGroup&&groupSection==='bakery'?'<button class="primary" '+(selected.size<2?'disabled':'')+' onclick="v43FinishGroup()">Об’єднати ('+selected.size+')</button>':'')+'</div>';
window.v439SelectVT=id=>{
 const r=(dat().routes||[]).find(x=>+x.id===+id);if(!r||!isBakery(r))return;
 const saved=extraFor(r).filter(x=>x.point_type==='vt'),names=[...new Set([...VT_STORES,...saved.map(x=>x.name)])];
 const body='<form id="v439-vt-form"><p class="v431-note">Кожна вибрана ВТ додає 1 ТТ до системних і звичайних додаткових ТТ. Повторне збереження не створює дублікати.</p><div class="v43-checks v439-vt-list">'+names.map(name=>'<label><input type="checkbox" name="v439-vt" value="'+E(name)+'" '+(saved.some(x=>x.name===name)?'checked':'')+'>'+E(name)+'</label>').join('')+'</div><p id="v439-vt-error" class="v433-error" role="alert"></p></form>';
 modal('ВТ по маршруту',body,'<button onclick="v43CloseModal()">Скасувати</button><button id="v439-vt-save" class="primary" onclick="v439SaveVT('+id+')">Готово</button>');
};
let vtSaving=false;
window.v439SaveVT=async id=>{
 if(vtSaving)return;vtSaving=true;$('#v439-vt-save').disabled=true;
 const names=[...document.querySelectorAll('input[name="v439-vt"]:checked')].map(el=>el.value);
 try{
  const existing=await api('/rest/v1/route_extra_points?select=*&route_id=eq.'+id+'&point_type=eq.vt');
  if(names.length){const rows=await api('/rest/v1/route_extra_points?on_conflict=route_id,point_type,name',{method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=representation'},body:JSON.stringify(names.map(name=>({route_id:id,point_type:'vt',name,tt_count:1})))});if(rows?.length!==names.length)throw Error('Сервер не підтвердив збереження ВТ')}
  const removed=existing.filter(x=>!names.includes(x.name)).map(x=>x.id);
  if(removed.length){const rows=await api('/rest/v1/route_extra_points?route_id=eq.'+id+'&point_type=eq.vt&id=in.('+removed.join(',')+')',{method:'DELETE',headers:{Prefer:'return=representation'}});if(rows?.length!==removed.length)throw Error('Сервер не підтвердив зняття вибору ВТ')}
  const saved=await api('/rest/v1/route_extra_points?select=*&route_id=eq.'+id);
  meta.extras=[...meta.extras.filter(x=>+x.route_id!==+id),...saved];v43CloseModal();v43OpenRoute(id);
 }catch(e){$('#v439-vt-error').textContent='Не збережено повністю: '+e.message+'. Можна повторити «Готово».'}
 finally{vtSaving=false;if($('#v439-vt-save'))$('#v439-vt-save').disabled=false}
};
let addingCarrier=false;
window.v439AddReplenCarrier=async()=>{
 if(addingCarrier)return;const name=T($('#rp-new-carrier').value),err=$('#rp-error');if(!name){err.textContent='Вкажіть назву перевізника';return}
 addingCarrier=true;$('#rp-add-carrier').disabled=true;
 try{
  let carrier=meta.carriers.find(x=>norm(x.name)===norm(name));
  if(!carrier){const rows=await api('/rest/v1/transport_carriers?on_conflict=name',{method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=representation'},body:JSON.stringify({name,carrier_type:'route',active:true})});carrier=rows?.[0];if(!carrier)throw Error('Сервер не підтвердив перевізника');meta.carriers.push(carrier)}
  $('#rp-carrier').innerHTML='<option value="">Оберіть перевізника</option>'+carrierOptions(carrier.name);$('#rp-carrier').value=carrier.name;$('#rp-new-carrier').value='';err.textContent='';
 }catch(e){err.textContent='Не збережено: '+e.message}finally{addingCarrier=false;if($('#rp-add-carrier'))$('#rp-add-carrier').disabled=false}
};

const css=`#v43-period{max-width:760px;margin:0 auto;padding:0 14px}.v43-period-inner{padding:10px 0 5px}.v43-period-buttons{display:flex;gap:7px}.v43-period button,.v43-period-inner button,.v43-actions button,.v43-filters button,.v43-groupbar button,.v43-route-detail button,.v43-section-title button,.v43-modal button{border:1px solid #2c3545;background:#111824;color:#dfe5ef;border-radius:12px;padding:10px 12px;font-weight:700}.v43-period-buttons button.on,.v43-filters button.on,.primary{background:linear-gradient(135deg,#7848ff,#9a4dff)!important;border-color:#8c55ff!important;color:white!important}.v43-period-inner small,.v43-head small{display:block;color:#7f8a9d;font-size:10px;margin-top:6px}.v43-custom{display:flex;gap:7px;align-items:center;margin-top:8px}.v43-custom.hide,.hide{display:none!important}.v43-custom input,.v43-form input,.v43-form select{width:100%;background:#0d131d;border:1px solid #303a4a;color:#fff;border-radius:11px;padding:11px}.v43-screen{max-width:760px;margin:auto;padding:8px 14px 100px}.v43-head,.v43-section-title{display:flex;justify-content:space-between;align-items:center;gap:10px;margin:8px 0 12px}.v43-head h2,.v43-section h2{margin:0;font-size:23px}.v43-actions{display:flex;gap:6px}.v43-actions button{font-size:11px}.v43-filters{display:flex;gap:7px;overflow:auto;padding-bottom:8px}.v43-filters button{white-space:nowrap;font-size:11px}.v43-groupbar{display:flex;justify-content:space-between;gap:7px;margin:5px 0 12px}.v43-groupbar button{font-size:11px}.v43-stack{display:grid;gap:11px}.v43-route,.v43-route-detail,.v43-tt,.v43-invoice,.v43-replen{border:1px solid #253044;background:linear-gradient(145deg,#121a28,#0c121c);border-radius:18px;padding:14px;box-shadow:0 10px 30px #0003}.v43-route.warn{border-color:#6c3e48}.v43-route-top,.v43-tt-head{display:flex;justify-content:space-between;align-items:center;gap:9px}.v43-route-top>div:first-of-type{display:grid}.v43-route-top small,.v43-two small,.v43-four small,.v43-exp small,.v43-sales small,.v43-tt small,.v43-replen small{color:#7f8a9d;font-size:9px;display:block}.v43-route-top b{font-size:14px}.v43-exp{margin:11px 0;background:linear-gradient(135deg,#5220a6,#7d31ce);padding:11px 13px;border-radius:13px}.v43-exp b{font-size:16px}.v43-two{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px}.v43-two>div,.v43-four>div{background:#0d141f;border:1px solid #222d3e;border-radius:11px;padding:9px}.v43-four{display:grid;grid-template-columns:repeat(4,1fr);gap:7px;margin-top:8px}.v43-four b{font-size:12px}.purple{color:#c08bff}.v43-sales{margin-top:8px;border-top:1px solid #263044;padding-top:9px}.v43-sales b{font-size:18px;color:#79dfa0}.v43-pill{display:inline-block;border:1px solid #394457;border-radius:999px;padding:5px 7px;font-size:9px}.v43-pill.group{color:#b98aff;border-color:#7447aa}.v43-pill.bad{color:#ff9a9f;border-color:#7a4147}.v43-extra-mark{margin-top:8px;color:#b98aff;font-size:11px}.v43-exp-group h3{position:sticky;top:0;background:#090e16;padding:9px 2px;margin:7px 0;z-index:2}.v43-exp-group h3 span{color:#8c56ff}.v43-section{margin-top:22px;padding-top:15px;border-top:1px solid #202a38}.v43-empty,.v43-loading{border:1px dashed #303a49;border-radius:16px;padding:22px;text-align:center;color:#8c97a8}.v43-replen{margin-bottom:8px}.v43-back{border:0;background:transparent;color:#b98aff;padding:8px 0;font-weight:800}.v43-subtitle{font-size:11px;color:#828da0;letter-spacing:.08em;margin:18px 2px 8px}.v43-tt{margin-bottom:9px}.v43-tt-head>span{width:28px;height:28px;border-radius:9px;display:grid;place-items:center;background:#6e3ac7}.v43-tt-head>div{flex:1}.v43-tt-head small{margin-top:3px;line-height:1.3}.v43-tt-head i{font-size:24px;color:#9a6df7}.v43-extra-row{display:flex;justify-content:space-between;border:1px solid #2c3545;border-radius:12px;padding:11px;margin:6px 0}.v43-invoice{margin-bottom:9px}.v43-modal-bg{position:fixed;inset:0;background:#000a;z-index:9999;display:flex;align-items:flex-end;justify-content:center}.v43-modal{width:min(620px,100%);max-height:88vh;overflow:auto;background:#101722;border:1px solid #2d384a;border-radius:24px 24px 0 0;padding:16px}.v43-modal-head,.v43-modal-actions{display:flex;justify-content:space-between;align-items:center;gap:8px}.v43-modal-head h3{margin:0}.v43-modal-head button{font-size:22px;padding:4px 10px}.v43-modal-body{margin:15px 0}.v43-modal-actions{justify-content:flex-end}.v43-form{display:grid;grid-template-columns:1fr 1fr;gap:10px}.v43-form label{font-size:11px;color:#a8b1c0}.v43-form input,.v43-form select{margin-top:5px}.v43-form details,.v43-info{grid-column:1/-1;border:1px solid #293446;border-radius:12px;padding:11px}.v43-checks{max-height:170px;overflow:auto;border:1px solid #293446;border-radius:12px;margin-top:5px;padding:7px}.v43-checks label{display:flex;gap:8px;align-items:center;padding:6px}.v43-checks input{width:auto;margin:0}.v43-directory{display:grid;gap:7px}.v43-directory>div{border:1px solid #2b3545;border-radius:11px;padding:10px}.manual{border-style:dashed}@media(max-width:520px){.v43-form{grid-template-columns:1fr}.v43-four{grid-template-columns:repeat(2,1fr)}.v43-head{align-items:flex-start;flex-direction:column}.v43-actions{width:100%}.v43-actions button{flex:1}.v43-period-buttons button{flex:1;font-size:11px;padding:9px 5px}.v43-custom input{min-width:0}.v43-two{grid-template-columns:1fr 1fr}}`;
let st=document.createElement('style');st.textContent=css;document.head.appendChild(st);
async function init(){
 if(typeof api!=='function'||!v()||!window.TRTS_UI)return setTimeout(init,100);
 window.logistics=()=>{periodBar();renderDashboard()};
 if(window.TRTS_MODERN_RUNTIME){
  window.go=window.home=window.analytics=window.ai=window.more=window.v39Section=window.logistics;
  window.loadAll=()=>loadRange();
  window.start=async()=>{const login=$('#login'),app=$('#app');login?.classList.add('hide');if(login)login.style.display='none';app?.classList.remove('hide');periodBar();await loadRange()};
  if(typeof token!=='undefined'&&token)await window.start();
 }else{periodBar();await loadRange()}
 badge();
}
setTimeout(init,0);
})();
