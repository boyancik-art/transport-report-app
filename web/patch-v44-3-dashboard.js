(()=>{
 'use strict';
 const O=TRTS_OPS,A=TRTS_ANALYTICS,P=TRTS_PERIODS,App=TRTS_APP,S=TRTS_SHELL,E=O.E,$=s=>document.querySelector(s);
 const LABEL={local:'Локальна доставка',courier:'Кур’єрська доставка',replen:'Поповнення філій'},FIELDS=[['tt','ТТ'],['pallets','Палети'],['sales','Продажі'],['cost','Витрати'],['costTT','Вартість 1 ТТ'],['log','% логістики']],AXES={business:'Бізнеси',branch:'Філії покриття',zone:'Зони доставки',section:'SAV / STV · напрямки',carrier:'Перевізники',routeId:'Маршрути',pointId:'Торгові точки'};
 let sortKey='cost',sortDirection='desc';
 let version=0,cache=null,pending=null,comparisonError='',screen='dashboard',trail=[],metric='cost',periodState=null,viewSequence=0;
 const fmtDate=d=>d?.split('-').reverse().join('.')||'—',periodText=p=>fmtDate(p.from)+(p.from===p.to?'':' — '+fmtDate(p.to));
 const value=(x,key)=>key==='costPal'?(x.pallets?x.cost/x.pallets:null):x[key];
 const format=(n,key)=>n==null?'—':['cost','sales','costTT','costPal'].includes(key)?O.M2(n):key==='log'?O.P(n):O.F(n,key==='pallets'?3:0);
 const total=rows=>A.total(rows);
 function periodBar(p){
  periodState=p;let el=$('#v43-period');if(!el){el=document.createElement('div');el.id='v43-period';O.view()?.before(el)}
  if(!el)return;
  const selected=['today','date'].includes(p.mode)?'day':p.mode,options=[['day','День'],['week','Тиждень'],['month','Місяць'],['half','Півроку'],['year','Рік'],['custom','Свій період']];
  const time=v=>new Intl.DateTimeFormat('uk-UA',{dateStyle:'short',timeStyle:'short',timeZone:'Europe/Kyiv'}).format(new Date(v));
  el.innerHTML='<div class="v43-period-inner v443-global-period"><div class="v43-period-buttons" aria-label="Глобальний період">'+options.map(([key,label])=>'<button type="button" aria-pressed="'+(key===selected)+'" class="'+(key===selected?'on':'')+'" onclick="v443Period(\''+key+'\')">'+label+'</button>').join('')+'</div><details class="v446-date-controls" '+(selected==='custom'?'open':'')+'><summary>Дата, свій період та оновлення</summary><form id="v443-period-form" onsubmit="event.preventDefault();v443ApplyPeriod()"><label>'+(selected==='custom'?'Початок періоду':'Дата в періоді')+TRTS_UI.dateField('v443-anchor',p.from)+'</label>'+(selected==='custom'?'<label>Кінець періоду'+TRTS_UI.dateField('v443-end',p.to)+'</label>':'')+'<button type="submit">Показати</button></form><div class="v435-period-status"><small id="v435-period-range">'+E(periodText(p))+'</small><button class="v441-refresh-button" onclick="v441RefreshDialog()">'+S.icon('refresh')+'Оновити дані</button></div><details class="v441-data-status"><summary>Оновлення даних</summary><p id="v441-import-time">Останній імпорт бази: '+(p.importUnavailable?'час недоступний':p.lastImport?.imported_at?'<time datetime="'+E(p.lastImport.imported_at)+'">'+E(time(p.lastImport.imported_at))+'</time>':'немає підтвердженого імпорту')+'</p><p id="v441-loaded-time">Дані звіту завантажено: '+(p.lastLoaded?'<time datetime="'+E(p.lastLoaded)+'">'+E(time(p.lastLoaded))+'</time>':'ще не завантажено')+'</p></details></details></div>';
 }
 window.v443Period=async mode=>{if(mode==='custom'){periodBar({...periodState,mode});return}const p=P.range(mode,new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Kyiv',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()));return v441LoadPeriod(p.from,p.to,mode)};
 window.v443ApplyPeriod=()=>{if(!$('#v443-period-form')?.reportValidity())return;const a=$('#v443-anchor').value,mode=periodState.mode==='today'||periodState.mode==='date'?'day':periodState.mode;if(!TRTS_UI.validDate(a))return;const p=mode==='custom'?{from:a,to:$('#v443-end').value}:P.range(mode,a);return v441LoadPeriod(p.from,p.to,mode)};
 function invalidate(){++version;++viewSequence;cache=null;pending=null;trail=[];window.TRTS_GRAPH_DASHBOARD?.reset()}
 async function reports(){
  if(cache)return cache;if(pending)return pending;const generation=version,p={...v435ReportPeriod(),mode:periodState?.mode||"day"},previous=P.previous(p);
  const job=(async()=>{
   await TRTS_COURIER.load();if(generation!==version)return null;
   const current=App.buildReport();let old=null;comparisonError='';
   try{
    const snapshot=await O.readSnapshot(previous.from,previous.to);
    const [finance,courier]=await Promise.all([TRTS_FINANCE.prepare(previous.from,previous.to,snapshot.meta.rules),TRTS_COURIER.readSnapshot(snapshot.data,previous.from,previous.to)]);
    if(generation!==version)return null;
    old=O.withSnapshot(snapshot,()=>TRTS_FINANCE.withSnapshot(finance,()=>TRTS_COURIER.withSnapshot(courier,()=>App.buildReport())));
   }catch(e){if(generation===version)comparisonError='Порівняння недоступне: '+e.message}
   if(generation!==version)return null;cache={current,previous:old,period:p,previousPeriod:previous};return cache;
  })();pending=job;try{return await job}finally{if(pending===job)pending=null}
 }
 const rowsFor=(report,kind)=>report?(kind==='replen'?report.replen:report.lines.filter(x=>x.kind===kind).map(x=>['sav','stv'].includes(x.section)?{...x,carrier:x.section.toUpperCase()}:x)):[];
 function changeBadge(current,previous,key,hasPrevious){
  const change=hasPrevious&&(!['cost','costTT','log'].includes(key)||!current.missing&&!previous.missing)?P.change(value(current,key),value(previous,key),key):null;
  if(!change)return'<small class="v443-change neutral">Немає даних для порівняння</small>';
  const direction=change.direction===0?'→':change.direction>0?'↑':'↓',caption=change.percent===null?'попереднє значення 0':O.F(change.percent,1)+'%';
  return'<small class="v443-change '+(!change.direction?'neutral':change.good?'good':'bad')+'" aria-label="'+(change.direction>0?'Зростання':change.direction<0?'Зменшення':'Без змін')+'">'+direction+' '+caption+'</small>';
 }
 function summary(kind,rows,oldRows,click=true){
  const x=total(rows),y=total(oldRows),keys=kind==='replen'?[['pallets','Палети'],['cost','Витрати'],['costPal','Вартість 1 палети']]:FIELDS;
  return'<section class="v443-overview '+kind+'" data-summary="'+kind+'"><'+(click?'button type="button" onclick="v443Detail(\''+kind+'\')"':'h3')+' class="v443-overview-title">'+S.icon(kind==='local'?'routes':kind==='replen'?'replen':'courier')+'<span>'+LABEL[kind]+'</span>'+(click?'<b aria-hidden="true">›</b>':'')+'</'+(click?'button':'h3')+'><dl>'+keys.map(([key,label])=>'<div><dt>'+label+'</dt><dd>'+format(value(x,key),key)+'</dd>'+changeBadge(x,y,key,oldRows.length>0&&rows.length>0)+'</div>').join('')+'</dl>'+(x.missing?'<p class="v442-warning">Неповний розрахунок · '+x.missing+' ТТ. Витрати — лише відома частина.</p>':'')+'</section>';
 }
 function chart(kind,rows,oldRows){
  const p=cache.period,buckets=P.buckets(rows,p,total),before=P.buckets(oldRows,cache.previousPeriod,total),keys=kind==='replen'?[['pallets','Палети'],['cost','Витрати']]:FIELDS,selected=keys.some(([k])=>k===metric)?metric:'cost',valid=buckets.concat(before).map(x=>value(x,selected)).filter(x=>Number.isFinite(x)),max=Math.max(1,...valid),W=600,H=190,left=15,top=15,width=570,height=135;
  const point=(x,i,len)=>[left+i/Math.max(1,len-1)*width,top+height-value(x,selected)/max*height];
  const path=list=>{let open=false;return list.map((x,i)=>{if(value(x,selected)==null){open=false;return''}const [a,b]=point(x,i,list.length),command=open?'L':'M';open=true;return command+a.toFixed(1)+','+b.toFixed(1)}).join(' ')};
  return'<section class="v443-chart"><div class="v443-chart-head"><h3>Динаміка · '+LABEL[kind]+'</h3><label>Показник<select onchange="v443Metric(this.value)">'+keys.map(([k,l])=>'<option value="'+k+'" '+(k===selected?'selected':'')+'>'+l+'</option>').join('')+'</select></label></div>'+(rows.length?'<svg role="img" aria-label="Динаміка за вибраний та попередній період" viewBox="0 0 '+W+' '+H+'"><title>'+E(LABEL[kind]+' · '+keys.find(([k])=>k===selected)[1])+'</title>'+[0,.5,1].map(n=>'<path class="grid" d="M15 '+(top+height*n)+'H585"/>').join('')+(oldRows.length?'<path class="previous" d="'+path(before)+'"/>':'')+'<path class="current" d="'+path(buckets)+'"/>'+buckets.map((x,i)=>{if(value(x,selected)==null)return'';const [cx,cy]=point(x,i,buckets.length);return'<circle tabindex="0" class="v443-chart-point" cx="'+cx+'" cy="'+cy+'" r="4"><title>'+E(fmtDate(x.date)+' · '+format(value(x,selected),selected))+'</title></circle>'}).join('')+'<text x="15" y="181">'+E(fmtDate(p.from))+'</text><text x="585" y="181" text-anchor="end">'+E(fmtDate(p.to))+'</text></svg><div class="v443-legend"><span>● Обраний період</span><span>┄ Попередній період</span></div><details><summary>Дані графіка</summary><div class="v443-chart-values">'+buckets.map(x=>'<div><time>'+E(fmtDate(x.date))+'</time><b>'+format(value(x,selected),selected)+'</b></div>').join('')+'</div></details>':'<p class="v43-empty">За вибраний період даних немає</p>')+'</section>';
 }
 async function render(section){
  screen=section;trail=[];const request=++viewSequence;O.view().innerHTML='<div class="v43-loading" role="status">Завантаження показників і порівняння періодів…</div>';
  try{const data=await reports();if(!data||request!==viewSequence||App.current()!==section)return;show()}catch(e){if(request===viewSequence)O.view().innerHTML='<section class="v43-screen"><p class="v442-warning" role="alert">'+E(e.message)+'</p><button onclick="v442Nav(\''+section+'\')">Спробувати ще раз</button></section>'}
 }
 function filtered(report,level){return rowsFor(report,level.kind).filter(x=>(!level.zoneFlow||['sav','stv'].includes(x.section))&&Object.entries(level.filters||{}).every(([key,v])=>String(x[key])===String(v)))}

 function sortedGroups(rows,level){
  let list=A.group(level.zoneFlow==='carrier'?rows.filter(x=>['sav','stv'].includes(x.section)):rows,level.axis);
  const key=(level.kind==='replen'?!['pallets','cost','costPal'].includes(sortKey):sortKey==='costPal')?'cost':sortKey;
  return list.sort((a,b)=>{const x=value(a,key),y=value(b,key);if(x==null||y==null)return x==null?(y==null?a.name.localeCompare(b.name,'uk'):1):-1;return (sortDirection==='asc'?x-y:y-x)||a.name.localeCompare(b.name,'uk')});
 }
 function sorting(level){
  const keys=level.kind==='replen'?[['pallets','Палети'],['cost','Витрати'],['costPal','Вартість 1 палети']]:FIELDS.map(([k,n])=>[k,k==='sales'?'Сума документів':n]);
  const selected=keys.some(([k])=>k===sortKey)?sortKey:'cost';
  return '<div class="v447-sort"><label>Сортувати за<select aria-label="Сортувати за" onchange="v447Sort(this.value,null)">'+keys.map(([k,n])=>'<option value="'+k+'" '+(selected===k?'selected':'')+'>'+n+'</option>').join('')+'</select></label><select aria-label="Порядок сортування" onchange="v447Sort(null,this.value)"><option value="desc" '+(sortDirection==='desc'?'selected':'')+'>↓ За спаданням</option><option value="asc" '+(sortDirection==='asc'?'selected':'')+'>↑ За зростанням</option></select></div>';
 }
 window.v447Sort=(key,direction)=>{if(key&&['tt','pallets','sales','cost','costTT','log','costPal'].includes(key))sortKey=key;if(['asc','desc'].includes(direction))sortDirection=direction;show()};
 function show(){
  if(!cache)return;if(screen==='dashboard'&&window.TRTS_GRAPH_DASHBOARD){TRTS_GRAPH_DASHBOARD.render(cache);return}O.screenLayout(false);let html=App.title(screen==='dashboard'?'Дашборд':'Аналітика',periodText(cache.period))+'<p class="v443-compare">Порівняння: '+E(periodText(cache.previousPeriod))+' · Самовивіз не включено</p>';
  if(comparisonError)html+='<p class="v442-warning" role="alert">'+E(comparisonError)+' <button onclick="v443Retry()">Повторити</button></p>';
  if(!trail.length){for(const kind of ['local','courier','replen']){const rows=rowsFor(cache.current,kind),oldRows=rowsFor(cache.previous,kind);html+=summary(kind,rows,oldRows)+(screen==='dashboard'?chart(kind,rows,oldRows):'')}}
  else{
   const level=trail.at(-1),rows=filtered(cache.current,level),oldRows=filtered(cache.previous,level);
   html='<button class="v43-back" onclick="v443DetailBack()">‹ Назад</button>'+html+'<h3>'+E(level.label||LABEL[level.kind])+'</h3>'+summary(level.kind,rows,oldRows,false);
   const allowed=level.kind==='replen'?['branch']:level.kind==='courier'&&!level.filters.carrier?['carrier']:['business','branch',...(level.kind==='local'?['carrier','section','zone']:[]),'routeId'];
   if(level.axis!=='pointId')html+='<div class="v443-facets">'+allowed.filter(key=>!Object.hasOwn(level.filters,key)).map(key=>'<button aria-pressed="'+(key===level.axis)+'" onclick="v443Axis(\''+key+'\')">'+AXES[key]+'</button>').join('')+'</div>';
   const groups=sortedGroups(rows,level),max=Math.max(1,...groups.map(x=>x.cost));
   html+=sorting(level)+'<div class="v442-metrics-grid">'+groups.map((g,index)=>{
    const sample=rows.find(x=>String(x[level.axis])===g.name),name=level.axis==='section'?({fop:'ФОП / TS',bakery:'Пекарня / Fresh',sav:'SAV',stv:'STV'}[g.name]||g.name):level.axis==='routeId'?sample?.routeName||g.name:level.axis==='pointId'?sample?.pointName||'Додаткова ТТ':level.axis==='zone'&&/^[1-5]$/.test(g.name)?'Зона '+g.name:g.name;
    if(level.axis==='routeId'&&window.TRTS_UI446)return '<div data-group-name="'+E(g.name)+'">'+TRTS_UI446.analyticsCard(g)+'</div>';
    return'<div data-group-name="'+E(g.name)+'">'+App.metricsCard(g,{label:name,click:level.kind==='replen'?'':'v443Group('+index+')',replen:level.kind==='replen'})+(level.axis==='zone'?'<div class="v443-bar" aria-label="Витрати зони"><i style="width:'+g.cost/max*100+'%"></i></div>':'')+'</div>';
   }).join('')+'</div>';
   if(!groups.length)html+='<p class="v43-empty">Даних немає</p>';
   html+='<p class="v442-note">ТТ з накладними різних бізнесів входить до кожного відповідного бізнесу, але в загальному підсумку рахується один раз. Додаткові ТТ без бізнесу не втрачаються.</p>';
  }
  if(cache.current.warnings.length)html+='<details class="v442-warning"><summary>Зауваження до даних · '+cache.current.warnings.length+'</summary><ul>'+cache.current.warnings.map(x=>'<li>'+E(x)+'</li>').join('')+'</ul></details>';
  O.view().innerHTML='<div class="v43-screen v443-report">'+html+(!trail.length?(window.TRTS_RELEASE?.attention(cache)||''):'')+'</div>';
 }
 window.v443Detail=kind=>{trail.push({kind,filters:{},axis:kind==='courier'?'carrier':kind==='replen'?'branch':'business'});window.TRTS_NAVIGATION?.capture();show();scrollTo(0,0)};
 window.v443DetailBack=()=>{trail.pop();show();scrollTo(0,0)};
 window.v443Axis=axis=>{if(!trail.length)return;const l=trail.at(-1);if(axis==='zone'&&l.kind==='local'){const filters={...l.filters};delete filters.section;delete filters.carrier;delete filters.zone;trail.push({...l,filters,axis:'section',zoneFlow:'carrier',label:'Зони доставки · SAV / STV'})}else{l.axis=axis;delete l.zoneFlow}show()};
 window.v443Group=index=>{
  const level=trail.at(-1),rows=filtered(cache.current,level),g=sortedGroups(rows,level)[index];if(!g)return;
  const sample=rows.find(x=>String(x[level.axis])===g.name);
  if(level.axis==='pointId'){if(sample?.routeId&&sample?.pointKey){window.TRTS_NAVIGATION?.reportReturn(()=>show());v43OpenTT(Number(sample.routeId),Number(sample.pointKey))}return}
  if(level.axis==='routeId'){if(sample?.routeId&&!String(sample.routeId).startsWith('m:')){window.TRTS_NAVIGATION?.reportReturn(()=>show());v43OpenRoute(Number(sample.routeId));return}}
  if(level.zoneFlow){const filters={...level.filters,[level.axis]:g.name};trail.push({...level,filters,label:g.name,zoneFlow:level.zoneFlow==='carrier'&&!filters.branch?'branch':level.zoneFlow==='zone'?'routes':'zone',axis:level.zoneFlow==='carrier'&&!filters.branch?'branch':level.zoneFlow==='zone'?'routeId':'zone'});show();scrollTo(0,0);return}
  trail.push({...level,label:g.name,filters:{...level.filters,[level.axis]:g.name},axis:(level.kind==='courier'?['carrier','business','branch','routeId']:['business','branch','carrier','section','routeId','pointId']).find(k=>!Object.hasOwn({...level.filters,[level.axis]:g.name},k))||'routeId'});show();scrollTo(0,0);
 };
 window.v443Metric=key=>{metric=key;show()};
 window.v443Retry=()=>{invalidate();render(screen)};
 window.TRTS_DASHBOARD={periodBar,invalidate,render,show,back:()=>{if(screen==='dashboard'&&window.TRTS_GRAPH_DASHBOARD)return TRTS_GRAPH_DASHBOARD.back();if(!trail.length)return false;v443DetailBack();return true},reports};
})();
