/* Presentation only: all totals and period buckets come from the existing reporting core. */
(()=>{
 'use strict';
 const O=TRTS_OPS,A=TRTS_ANALYTICS,P=TRTS_PERIODS,E=O.E;
 const NAMES={local:'Локальна доставка',courier:'Кур’єрська доставка',replen:'Поповнення філій'};
 const AXES={business:'Бізнеси',branch:'Філії покриття',carrier:'Перевізники',section:'SAV / STV · напрямки',zone:'Зони',routeId:'Маршрути',pointId:'ТТ'};
 const SECTIONS={fop:'ФОП / TS',bakery:'Пекарня / Fresh',sav:'SAV',stv:'STV',courier:'Кур’єрка'};
 const FIELDS=[['cost','Витрати'],['sales','Сума документів'],['tt','Кількість ТТ'],['pallets','Палети'],['costTT','Вартість 1 ТТ'],['log','% логістики']];
 const PALLETS=[['cost','Витрати'],['pallets','Палети'],['costPal','Вартість 1 палети']];
 let data=null,trail=[],axis='business',measure='cost',plots=[],groups=[];
 const date=s=>s?.split('-').reverse().join('.')||'—';
 const period=p=>date(p.from)+(p.to===p.from?'':' — '+date(p.to));
 const get=(x,key)=>key==='costPal'?(x.pallets&&!x.missing?x.cost/x.pallets:null):x[key];
 const format=(v,key)=>v==null?'Немає розрахунку':['cost','sales','costTT','costPal'].includes(key)?O.M2(v):key==='log'?O.P(v):O.F(v,key==='pallets'?3:0);
 const short=v=>new Intl.NumberFormat('uk-UA',{notation:'compact',maximumFractionDigits:1}).format(v);
 const field=(row,key)=>key==='carrier'&&['sav','stv'].includes(row.section)?row.section.toUpperCase():String(row[key]??'Не визначено');
 function rows(report,level){
  if(!report)return[];
  const list=level?.kind==='replen'?report.replen:(level?.kind?report.lines.filter(x=>x.kind===level.kind):[...report.lines.filter(x=>['local','courier'].includes(x.kind)),...report.replen]);
  return list.filter(x=>Object.entries(level?.filters||{}).every(([k,v])=>field(x,k)===v));
 }
 const level=()=>trail.at(-1);
 function axes(){return(level()?.kind==='replen'?['branch']:level()?.kind==='courier'?['carrier','business','branch','routeId','pointId']:['business','branch','carrier','section','zone','routeId','pointId']).filter(k=>!Object.hasOwn(level()?.filters||{},k))}
 function label(row,key,value){return key==='routeId'?row?.routeName||value:key==='pointId'?row?.pointName||'Додаткова ТТ':key==='section'?SECTIONS[value]||value:key==='zone'&&/^[1-5]$/.test(value)?'Зона '+value:value}
 function badge(now,before,key,available){
  const change=available&&(!['cost','costTT','costPal','log'].includes(key)||!now.missing&&!before.missing)?P.change(get(now,key),get(before,key),key):null;
  if(!change)return'<span class="v445-delta neutral" title="Порівняння недоступне">—</span>';
  return'<span class="v445-delta '+(!change.direction?'neutral':change.good?'good':'bad')+'">'+(change.direction>0?'↑':change.direction<0?'↓':'→')+' '+(change.percent===null?'з нульової бази':O.F(change.percent,1)+'%')+'</span>';
 }
 function trend(current,previous,key,title,kind){
  const now=A.total(current),old=A.total(previous),b=P.buckets(current,data.period,A.total,{daily:true}),p=P.buckets(previous,data.previousPeriod,A.total,{daily:true}),index=plots.length;
  plots.push({b,p,key,title});
  const valid=b.concat(data.previous?p:[]).map(x=>get(x,key)).filter(Number.isFinite),max=Math.max(1,...valid)*1.1,min=Math.min(0,...valid),span=max-min;
  const x=(i,n)=>64+i/Math.max(1,n-1)*508,y=v=>180-(v-min)/span*156;
  const path=list=>{let open=false;return list.map((v,i)=>{const n=get(v,key);if(n==null){open=false;return''}const command=open?'L':'M';open=true;return command+x(i,list.length).toFixed(2)+','+y(n).toFixed(2)}).join(' ')};
  const id='v445-area-'+index,single=b.length===1;
  let graph=[0,.5,1].map(n=>{const v=min+span*n;return'<path class="v445-grid" d="M64 '+y(v)+'H584"/><text x="54" y="'+(y(v)+4)+'" text-anchor="end">'+E(short(v))+'</text>'}).join('');
  if(single){
   const v=get(now,key),pv=get(old,key);
   if(data.previous&&pv!=null)graph+='<rect class="v445-before-bar" x="135" y="'+Math.min(y(0),y(pv))+'" width="94" height="'+Math.max(2,Math.abs(y(pv)-y(0)))+'" rx="8"/>';
   if(v!=null)graph+='<rect class="v445-now-bar" x="362" y="'+Math.min(y(0),y(v))+'" width="94" height="'+Math.max(2,Math.abs(y(v)-y(0)))+'" rx="8"/>';
   graph+='<text x="182" y="206" text-anchor="middle">'+E(date(data.previousPeriod.from))+'</text><text x="409" y="206" text-anchor="middle">'+E(date(data.period.from))+'</text>';
  }else{
   if(b.every(v=>get(v,key)!=null))graph+='<path fill="url(#'+id+')" d="'+path(b)+' L572 '+y(0)+' L64 '+y(0)+'Z"/>';
   if(data.previous)graph+='<path class="v445-previous" d="'+path(p)+'"/>';
   graph+='<path class="v445-current" d="'+path(b)+'"/>'+b.map((v,i)=>'<circle class="v445-dot" data-date="'+v.date+'" cx="'+x(i,b.length)+'" cy="'+y(get(v,key)??0)+'" r="3" '+(get(v,key)==null?'opacity="0"':'')+'><title>'+E(date(v.date)+' · '+format(get(v,key),key))+'</title></circle>').join('');
   const stride=Math.max(1,Math.ceil(b.length/7));graph+=b.map((v,i)=>(i%stride===0&&(i===0||b.length-1-i>=stride*.7))||i===b.length-1?'<text x="'+x(i,b.length)+'" y="206" text-anchor="'+(i===0?'start':i===b.length-1?'end':'middle')+'">'+E(date(v.date).slice(0,5))+'</text>':'').join('');
  }
  return'<section class="v445-trend '+(index===0?'v445-featured':'')+'" data-chart="'+key+'" data-value="'+(get(now,key)??'')+'"><div class="v445-chart-heading"><div><h3>'+title+'</h3><strong>'+format(get(now,key),key)+'</strong></div>'+badge(now,old,key,!!data.previous&&current.length>0&&previous.length>0)+'</div><div class="v445-plot" tabindex="0" role="group" aria-label="'+E(title+'. Торкніться графіка або використайте стрілки для перегляду значень')+'" data-plot="'+index+'" data-index="0"><svg viewBox="0 0 600 220" role="img" aria-label="'+E(title+' за вибраний і попередній періоди')+'"><defs><linearGradient id="'+id+'" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--v445-line)" stop-opacity=".23"/><stop offset="1" stop-color="var(--v445-line)" stop-opacity="0"/></linearGradient></defs>'+graph+'</svg><div class="v445-tooltip" aria-live="polite" hidden></div></div><div class="v445-legend"><span><i></i>Обраний період</span><span><i></i>Попередній період</span></div>'+(now.missing&&['cost','costTT','costPal','log'].includes(key)?'<p class="v445-note">Неповні витрати · '+now.missing+' ТТ потребують розрахунку.</p>':'')+(!current.length?'<p class="v445-note">Даних у цьому зрізі немає.</p>':'')+'</section>';
 }
 let slices=[],trendMetric='cost';
 function slice(axis,name,label){const index=slices.length;slices.push({axis,name,label});return index}
 function grouped(list,key){const map=new Map();for(const row of list){const name=field(row,key);if(!map.has(name))map.set(name,[]);map.get(name).push(row)}return [...map].map(([name,rows])=>({name,rows,label:label(rows[0],key,name),total:A.total(rows)}))}
 function composition(current){
  const key=level()?.kind==='replen'?'branch':level()?.kind==='courier'?'carrier':level()?.kind==='local'?'section':'kind';
  const source=grouped(current,key);if(key==='kind')for(const name of Object.keys(NAMES))if(!source.some(g=>g.name===name))source.push({name,label:NAMES[name],rows:[],total:A.total([])});
  const groups=source.sort((a,b)=>b.total.cost-a.total.cost),sum=groups.reduce((n,g)=>n+g.total.cost,0),positive=groups.reduce((n,g)=>n+Math.max(0,g.total.cost),0);
  // Angles only describe existing costs. Negative corrections are listed, not turned into invented slices.
  let offset=0;
  const ring=groups.map((g,i)=>{const span=positive?Math.max(0,g.total.cost)/positive*100:0,old=offset;offset+=span;return '<circle class="v446-ring-segment" tabindex="0" role="button" aria-label="'+E((NAMES[g.name]||g.label)+' '+O.M2(g.total.cost))+'" cx="70" cy="70" r="53" pathLength="100" fill="none" stroke="var(--chart-'+i%5+')" stroke-width="17" stroke-dasharray="'+span+' '+(100-span)+'" stroke-dashoffset="'+(-old)+'" onclick="v446Slice('+slice(key,g.name,NAMES[g.name]||g.label)+')"><title>'+E((NAMES[g.name]||g.label)+' · '+O.M2(g.total.cost))+'</title></circle>'}).join('');
  return '<section class="v446-panel v446-composition"><h3>Структура витрат</h3><div class="v446-ring"><svg viewBox="0 0 140 140" role="group" aria-label="Структура витрат"><circle cx="70" cy="70" r="53" fill="none" stroke="var(--surface-elevated)" stroke-width="17"/><g transform="rotate(-90 70 70)">'+ring+'</g></svg><div><b>'+E(short(sum))+' ₴</b><small>'+(positive?'100%':'Немає витрат')+'</small></div></div><div class="v446-ring-legend">'+groups.map((g,i)=>'<button type="button" '+(key==='kind'?'data-summary="'+g.name+'" ':'')+'onclick="v446Slice('+slice(key,g.name,NAMES[g.name]||g.label)+')"><i style="background:var(--chart-'+i%5+')"></i><span>'+E(NAMES[g.name]||g.label)+'</span><b>'+O.M2(g.total.cost)+'</b></button>').join('')+'</div></section>';
 }
 function rank(current,key,metric=measure){
  const list=grouped(current.filter(x=>!(key==='business'&&x.kind==='replen')),key).sort((a,b)=>(get(b.total,metric)||0)-(get(a.total,metric)||0)),max=Math.max(1,...list.map(g=>Math.abs(get(g.total,metric)||0))),render=(g,i)=>'<button class="v446-rank" type="button" onclick="v446Slice('+slice(key,g.name,g.label)+')" title="'+E(g.label+' · '+format(get(g.total,metric),metric))+'"><span>'+E(g.label)+'</span><i style="--bar:'+Math.abs(get(g.total,metric)||0)/max*100+'%"></i><b>'+E(get(g.total,metric)==null?'—':metric==='log'?O.P(get(g.total,metric)):short(get(g.total,metric)))+'</b></button>';
  return '<section class="v446-panel" data-ranking="'+key+'"><h3>'+(metric==='log'?'% логістики · ':metric==='cost'?'Витрати · ':'')+AXES[key]+'</h3><div class="v446-ranking">'+list.slice(0,5).map(render).join('')+'</div>'+(list.length>5?'<details><summary>Дивитися всі · '+list.length+'</summary><div class="v446-ranking">'+list.slice(5).map(render).join('')+'</div></details>':'')+(!list.length?'<p class="v445-note">Немає даних</p>':'')+'</section>';
 }
 function executive(current,previous,keys){
  const now=A.total(current),old=A.total(previous);
  return '<section class="v446-executive" aria-label="Ключові показники">'+keys.map(([key,label])=>'<button type="button" data-kpi="'+key+'" data-value="'+(get(now,key)??'')+'" aria-pressed="'+(key===trendMetric)+'" onclick="v446Metric(\''+key+'\')"><small>'+label+'</small><b title="'+E(format(get(now,key),key))+'">'+(get(now,key)==null?'—':format(get(now,key),key))+'</b>'+badge(now,old,key,!!data.previous&&current.length>0&&previous.length>0)+'</button>').join('')+'</section>';
 }
 function breakdown(current,previous){
  const available=axes();if(!available.includes(axis))axis=available[0];
  if(!axis)return'';
  const by=new Map();for(const row of current){const name=field(row,axis);if(!by.has(name))by.set(name,[]);by.get(name).push(row)}
  groups=[...by].map(([name,list])=>({name,list,label:label(list[0],axis,name),total:A.total(list)})).sort((a,b)=>(get(b.total,measure)||0)-(get(a.total,measure)||0)||a.label.localeCompare(b.label,'uk'));
  const max=Math.max(1,...groups.map(x=>get(x.total,measure)||0)),keys=level()?.kind==='replen'?PALLETS:FIELDS;
  return'<section class="v445-breakdown"><div class="v445-chart-heading"><h3>Дослідити зріз</h3><label>Показник<select aria-label="Показник розподілу" onchange="v445Measure(this.value)">'+keys.map(([k,l])=>'<option value="'+k+'" '+(measure===k?'selected':'')+'>'+l+'</option>').join('')+'</select></label></div><div class="v445-axes">'+available.map(k=>'<button type="button" aria-pressed="'+(axis===k)+'" onclick="v445Axis(\''+k+'\')">'+AXES[k]+'</button>').join('')+'</div><div class="v445-ranks">'+groups.map((g,i)=>'<button type="button" data-group="'+i+'" onclick="v445Group('+i+')"><span>'+E(g.label)+'<b>›</b></span><span class="v445-rank-track"><i style="width:'+Math.max(0,(get(g.total,measure)||0)/max*100)+'%"></i></span><small>'+format(get(g.total,measure),measure)+'</small></button>').join('')+'</div>'+(!groups.length?'<p class="v445-note">Даних у цьому зрізі немає.</p>':'')+'</section>';
 }
 function show(){
  if(!data)return;O.screenLayout(false);plots=[];slices=[];
  const l=level(),current=rows(data.current,l),previous=rows(data.previous,l),kind=l?.kind,title=l?.label||'Вся логістика',keys=kind==='replen'?PALLETS:[['tt','К-ть ТТ'],['pallets','Палети'],['sales','Сума документів'],['cost','Витрати'],['costTT','Вартість 1 ТТ'],['log','% логістики']];
  if(!keys.some(([k])=>k===measure))measure='cost';if(!keys.some(([k])=>k===trendMetric))trendMetric='cost';
  let html='<header class="v445-heading"><h1>'+E(title)+'</h1><p>'+E(period(data.period))+' · проти '+E(period(data.previousPeriod))+'</p></header>';
  if(trail.length)html+='<nav class="v445-breadcrumb" aria-label="Шлях зрізу"><button onclick="v445Crumb(-1)">Вся логістика</button>'+trail.map((x,i)=>'<span>›</span><button '+(i===trail.length-1?'aria-current="page"':'')+' onclick="v445Crumb('+i+')">'+E(x.label)+'</button>').join('')+'</nav>';
  if(!data.previous)html+='<p class="v442-warning">Попередній період недоступний. <button onclick="v443Retry()">Повторити</button></p>';
  html+=executive(current,previous,keys);
  html+='<section class="v446-dynamic"><label>Динаміка<select aria-label="Показник динаміки" onchange="v446Metric(this.value)">'+keys.map(([k,t])=>'<option value="'+k+'" '+(k===trendMetric?'selected':'')+'>'+t+'</option>').join('')+'</select></label>'+trend(current,previous,trendMetric,keys.find(([k])=>k===trendMetric)[1],kind)+'</section>';
  html+='<div class="v446-panels">'+composition(current)+(kind==='replen'?rank(current,'branch','costPal'):rank(current,'business'))+(kind==='replen'?'':rank(current,'branch')+rank(current,'carrier'))+(kind==='local'?rank(current,'section')+rank(current,'zone'):'')+'</div>';
  if(kind!=='replen')html+=rank(current,'business','log');
  if(trail.length)html+='<details class="v446-explore"><summary>Інші зрізи та маршрути</summary>'+breakdown(current,previous)+'</details>';
  html+='<p class="v445-note">Самовивіз не включено. Поповнення філій має окремі показники на палету. Натисніть на сегмент чи рядок графіка, щоб застосувати зріз до всього Dashboard.</p>';
  O.view().innerHTML='<div class="v43-screen v445-dashboard v446-dashboard">'+html+'</div>';
 }
 window.v446Metric=key=>{if([...FIELDS,...PALLETS].some(([k])=>k===key)){trendMetric=key;show()}};
 window.v446Slice=index=>{
  const s=slices[index];if(!s)return;const l=level()||{filters:{}};if(l.filters?.[s.axis]===s.name)return;
  trail.push(s.axis==='kind'?{...l,kind:s.name,label:s.label}:{...l,label:s.label,filters:{...l.filters,[s.axis]:s.name}});
  axis=axes()[0];show();scrollTo(0,0);
 };
 document.addEventListener('keydown',e=>{if(['Enter',' '].includes(e.key)&&e.target.matches('.v446-ring-segment')){e.preventDefault();e.target.dispatchEvent(new MouseEvent('click',{bubbles:true}))}});
 window.v445Direction=kind=>{if(!NAMES[kind])return;trail=[{kind,label:NAMES[kind],filters:{}}];axis=kind==='courier'?'carrier':kind==='replen'?'branch':'business';show();scrollTo(0,0)};
 window.v445Axis=value=>{if(axes().includes(value)){axis=value;show()}};
 window.v445Measure=value=>{if([...FIELDS,...PALLETS].some(([k])=>k===value)){measure=value;show()}};
 window.v445Group=index=>{
  const g=groups[index],l=level();if(!g||!l)return;
  // Route and point selection stays graphical; operational cards are reached through Analytics.
  trail.push({...l,label:g.label,filters:{...l.filters,[axis]:g.name}});axis=axes()[0];show();scrollTo(0,0);
 };
 window.v445Crumb=index=>{trail=index<0?[]:trail.slice(0,index+1);axis=axes()[0];show();scrollTo(0,0)};
 window.v445Back=()=>{if(!trail.length)return false;trail.pop();axis=axes()[0];show();scrollTo(0,0);return true};
 function tooltip(node,index){
  const plot=plots[Number(node.dataset.plot)];if(!plot)return;
  index=Math.max(0,Math.min(plot.b.length-1,index));node.dataset.index=index;
  const now=plot.b[index],old=plot.p[Math.min(plot.p.length-1,Math.round(index/Math.max(1,plot.b.length-1)*(plot.p.length-1)))],box=node.querySelector('.v445-tooltip');
  box.hidden=false;box.innerHTML='<b>'+E(plot.title)+'</b><span>'+E(date(now.date))+' · '+format(get(now,plot.key),plot.key)+'</span><span>'+E(date(old?.date))+' · '+(data.previous&&old?format(get(old,plot.key),plot.key):'Недоступно')+'</span>';
 }
 document.addEventListener('pointermove',e=>{const node=e.target.closest('.v445-plot');if(!node)return;const rect=node.getBoundingClientRect(),plot=plots[Number(node.dataset.plot)];tooltip(node,Math.round(Math.max(0,Math.min(1,((e.clientX-rect.left)/rect.width*600-64)/508))*(plot.b.length-1)))});
 document.addEventListener('click',e=>{const node=e.target.closest('.v445-plot');if(node)tooltip(node,Number(node.dataset.index)||0)});
 document.addEventListener('keydown',e=>{const node=e.target.closest('.v445-plot');if(!node)return;if(['ArrowLeft','ArrowRight','Enter',' '].includes(e.key)){e.preventDefault();tooltip(node,(Number(node.dataset.index)||0)+(e.key==='ArrowLeft'?-1:e.key==='ArrowRight'?1:0))}else if(e.key==='Escape')node.querySelector('.v445-tooltip').hidden=true});
 document.addEventListener('pointerout',e=>{const node=e.target.closest('.v445-plot');if(node&&!node.contains(e.relatedTarget))node.querySelector('.v445-tooltip').hidden=true});
 window.TRTS_GRAPH_DASHBOARD={render:report=>{data=report;trail=[];axis='business';show()},show,back:window.v445Back,reset:()=>{data=null;trail=[]},snapshot:()=>({kind:level()?.kind||'all',filters:{...level()?.filters},totals:A.total(rows(data?.current,level()))})};
})();
