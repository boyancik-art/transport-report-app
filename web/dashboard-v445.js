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
  const list=level?.kind==='replen'?report.replen:report.lines.filter(x=>level?.kind?x.kind===level.kind:['local','courier'].includes(x.kind));
  return list.filter(x=>Object.entries(level?.filters||{}).every(([k,v])=>field(x,k)===v));
 }
 const level=()=>trail.at(-1);
 function axes(){return(level()?.kind==='replen'?['branch']:level()?.kind==='courier'?['carrier','business','branch','routeId','pointId']:['business','branch','carrier','section','zone','routeId','pointId']).filter(k=>!Object.hasOwn(level()?.filters||{},k))}
 function label(row,key,value){return key==='routeId'?row?.routeName||value:key==='pointId'?row?.pointName||'Додаткова ТТ':key==='section'?SECTIONS[value]||value:key==='zone'&&/^[1-5]$/.test(value)?'Зона '+value:value}
 function badge(now,before,key,available){
  const change=available&&(!['cost','costTT','costPal','log'].includes(key)||!now.missing&&!before.missing)?P.change(get(now,key),get(before,key),key):null;
  if(!change)return'<span class="v445-delta neutral">Порівняння недоступне</span>';
  return'<span class="v445-delta '+(!change.direction?'neutral':change.good?'good':'bad')+'">'+(change.direction>0?'↑':change.direction<0?'↓':'→')+' '+(change.percent===null?'з нульової бази':O.F(change.percent,1)+'%')+'</span>';
 }
 function trend(current,previous,key,title,kind){
  const now=A.total(current),old=A.total(previous),b=P.buckets(current,data.period,A.total),p=P.buckets(previous,data.previousPeriod,A.total),index=plots.length;
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
   graph+='<path class="v445-current" d="'+path(b)+'"/>'+b.map((v,i)=>get(v,key)==null?'':'<circle class="v445-dot" cx="'+x(i,b.length)+'" cy="'+y(get(v,key))+'" r="3"/>').join('');
   graph+='<text x="64" y="206">'+E(date(data.period.from))+'</text><text x="584" y="206" text-anchor="end">'+E(date(data.period.to))+'</text>';
  }
  return'<section class="v445-trend '+(index===0?'v445-featured':'')+'" data-chart="'+key+'" data-value="'+(get(now,key)??'')+'"><div class="v445-chart-heading"><div><h3>'+title+'</h3><strong>'+format(get(now,key),key)+'</strong></div>'+badge(now,old,key,!!data.previous&&current.length>0&&previous.length>0)+'</div><div class="v445-plot" tabindex="0" role="group" aria-label="'+E(title+'. Торкніться графіка або використайте стрілки для перегляду значень')+'" data-plot="'+index+'" data-index="0"><svg viewBox="0 0 600 220" role="img" aria-label="'+E(title+' за вибраний і попередній періоди')+'"><defs><linearGradient id="'+id+'" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--v445-line)" stop-opacity=".23"/><stop offset="1" stop-color="var(--v445-line)" stop-opacity="0"/></linearGradient></defs>'+graph+'</svg><div class="v445-tooltip" aria-live="polite" hidden></div></div><div class="v445-legend"><span><i></i>Обраний період</span><span><i></i>Попередній період</span></div>'+(now.missing&&['cost','costTT','costPal','log'].includes(key)?'<p class="v445-note">Неповні витрати · '+now.missing+' ТТ потребують розрахунку.</p>':'')+(!current.length?'<p class="v445-note">Даних у цьому зрізі немає.</p>':'')+'</section>';
 }
 function composition(){
  const amounts=Object.keys(NAMES).map(kind=>({kind,current:A.total(rows(data.current,{kind})),previous:A.total(rows(data.previous,{kind}))}));
  const total=amounts.reduce((n,x)=>n+x.current.cost,0),max=Math.max(1,...amounts.map(x=>x.current.cost));
  return'<section class="v445-composition"><div class="v445-eyebrow">Витрати всієї логістики</div><h2>'+O.M2(total)+'</h2><p class="v445-note">Локальна, кур’єрська доставка та поповнення філій</p><div class="v445-stack" role="img" aria-label="Частки витрат за напрямками">'+amounts.map(x=>'<i class="'+x.kind+'" style="flex-grow:'+Math.max(0,x.current.cost)+'" title="'+E(NAMES[x.kind]+': '+O.M2(x.current.cost))+'"></i>').join('')+'</div><div class="v445-directions">'+amounts.map(x=>'<button type="button" class="'+x.kind+'" data-summary="'+x.kind+'" onclick="v445Direction(\''+x.kind+'\')"><span>'+NAMES[x.kind]+'<b>↗</b></span><span class="v445-direction-bar"><i style="width:'+Math.max(0,x.current.cost/max*100)+'%"></i></span><small>'+O.M2(x.current.cost)+' · '+(total?O.F(x.current.cost/total*100,1):'0')+'%</small></button>').join('')+'</div></section>';
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
  if(!data)return;O.screenLayout(false);plots=[];
  const l=level(),current=rows(data.current,l),previous=rows(data.previous,l),kind=l?.kind,title=l?.label||'Вся логістика',keys=kind==='replen'?PALLETS:FIELDS;
  if(!keys.some(([k])=>k===measure))measure='cost';
  let html='<header class="v445-heading"><div class="v445-eyebrow">Дашборд · '+E(period(data.period))+'</div><h1>'+E(title)+'</h1><p>Порівняння: '+E(period(data.previousPeriod))+'</p></header>';
  if(trail.length)html+='<nav class="v445-breadcrumb" aria-label="Шлях зрізу"><button onclick="v445Crumb(-1)">Вся логістика</button>'+trail.map((x,i)=>'<span>›</span><button '+(i===trail.length-1?'aria-current="page"':'')+' onclick="v445Crumb('+i+')">'+E(x.label)+'</button>').join('')+'</nav><button class="v43-back" onclick="v445Back()">‹ Попередній зріз</button>';
  if(!data.previous)html+='<p class="v442-warning">Попередній період недоступний. <button onclick="v443Retry()">Повторити</button></p>';
  if(!trail.length)html+=composition()+'<h2 class="v445-section-title">Динаміка доставки до ТТ</h2><p class="v445-note">Локальна + кур’єрська доставка. Поповнення філій — окремий напрямок із показниками на палету. Самовивіз не включено.</p>';
  else html+=breakdown(current,previous);
  html+='<div class="v445-trends">'+keys.map(([k,t])=>trend(current,previous,k,t,kind)).join('')+'</div>';
  html+='<p class="v445-note">Торкніться графіка, щоб побачити значення. Пунктир — попередній відповідний період. ТТ з накладними різних бізнесів у загальному підсумку рахується один раз.</p>';
  O.view().innerHTML='<div class="v43-screen v445-dashboard">'+html+'</div>';
 }
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
