(()=>{
  const esc = typeof E === 'function' ? E : (s)=>String(s ?? '');
  const fmt = (n, digits=1)=>new Intl.NumberFormat('uk-UA',{maximumFractionDigits:digits}).format(Number(n)||0);
  const money = (n)=>new Intl.NumberFormat('uk-UA',{maximumFractionDigits:0}).format(Number(n)||0)+' грн';
  const pct = (a,b)=>b ? (a/b*100).toFixed(2)+'%' : '—';
  const routeFact = (id)=>(D.facts||[]).find(x=>Number(x.route_id)===Number(id))||{};
  const routePoints = (id)=>(D.points||[]).filter(x=>Number(x.route_id)===Number(id));
  const routeDocs = (r)=>{
    const m=new Map();
    for(const d of (D.docs||[]).filter(x=>String(x.route_delivery_id)===String(r.route_delivery_id))){
      const k=`${d.sale_code||d.operation_code||d.id}|${d.address_id||''}|${d.customer_id||''}`;
      if(!m.has(k)) m.set(k,d);
    }
    return [...m.values()];
  };
  const routeNumbers = (r)=>{
    const p=routePoints(r.id), ds=routeDocs(r), f=routeFact(r.id);
    const tt=p.length||Number(r.total_points)||0;
    const pallets=p.length?p.reduce((s,x)=>s+(+x.pallets||0),0):Number(r.total_pallets)||0;
    const sales=ds.length?ds.reduce((s,x)=>s+(+x.order_amount||0),0):Number(r.total_order_amount)||0;
    const tariff=Number(f.corrected_tariff ?? f.tariff ?? 0)||0;
    const pointCost=(D.costPoints||[]).filter(x=>Number(x.route_id)===Number(r.id)).reduce((s,x)=>s+(+x.effective_cost||0),0);
    return {tt,pallets,sales,cost:pointCost||tariff,docs:ds.length||Number(r.total_documents)||0};
  };
  const norm=(s)=>String(s||'').trim().toLowerCase();
  const has=(s,...parts)=>parts.some(p=>norm(s).includes(p));

  const flowMeta={
    base:{title:'База',icon:'◫',accent:'#5f7cff',hint:'Маршрути без визначеного покриття'},
    stv:{title:'STV',icon:'▣',accent:'#49d67d',hint:'Автоматичний розрахунок по ТТ'},
    sav:{title:'SAV',icon:'▣',accent:'#a66cff',hint:'Автоматичний розрахунок по ТТ'},
    fop:{title:'ФОП',icon:'◎',accent:'#ff8a3d',hint:'Локальна доставка та рейсові тарифи'},
    courier:{title:'Кур’єрські',icon:'◈',accent:'#ffc928',hint:'Кур’єрські відправлення'},
    branch:{title:'Поповнення філій',icon:'▤',accent:'#39d6d0',hint:'Міжскладські та філіальні доставки'},
    bakery:{title:'Пекарня / Фреш',icon:'◇',accent:'#f2b84b',hint:'Пекарня, заморозка та Fresh'},
    pickup:{title:'Самовивіз',icon:'□',accent:'#72d86b',hint:'Самовивози та видача зі складу'}
  };

  function routeFlow(r){
    const f=routeFact(r.id), c=norm(f.carrier_name), w=norm(f.wave);
    if(c==='stv'||c.includes(' stv')||c.startsWith('stv')) return 'stv';
    if(c==='sav'||c.includes(' sav')||c.startsWith('sav')) return 'sav';
    if(has(w,'пекар','fresh','фреш','замороз')) return 'bakery';
    if(!c) return 'base';
    return 'fop';
  }
  function manualFlow(x){
    const t=norm(x.entry_type);
    if(has(t,'courier')) return 'courier';
    if(has(t,'branch_replenishment','branch')) return 'branch';
    if(has(t,'self_pickup','pickup')) return 'pickup';
    if(has(t,'bakery','fresh','пекар','фреш')) return 'bakery';
    return null;
  }
  function flowData(key){
    return {
      routes:(D.routes||[]).filter(r=>routeFlow(r)===key),
      manual:(D.manual||[]).filter(x=>manualFlow(x)===key)
    };
  }
  function flowStats(key){
    const d=flowData(key);
    const out={routes:d.routes.length,tt:0,pallets:0,sales:0,cost:0,manual:d.manual.length};
    for(const r of d.routes){const n=routeNumbers(r);out.tt+=n.tt;out.pallets+=n.pallets;out.sales+=n.sales;out.cost+=n.cost}
    for(const x of d.manual){out.tt+=Number(x.points_count||x.shipments_count||0)||0;out.pallets+=Number(x.pallets||0)||0;out.sales+=Number(x.sales_amount||0)||0;out.cost+=Number(x.expense_amount||0)||0}
    return out;
  }
  function totalStats(){
    const keys=Object.keys(flowMeta), t={routes:0,tt:0,pallets:0,sales:0,cost:0};
    for(const k of keys){const s=flowStats(k);t.routes+=s.routes+s.manual;t.tt+=s.tt;t.pallets+=s.pallets;t.sales+=s.sales;t.cost+=s.cost}
    return t;
  }

  const css=document.createElement('style');
  css.textContent=`
    :root{--v33-bg:#090d13;--v33-card:#111821;--v33-card2:#151e29;--v33-line:#253140;--v33-muted:#8f9bad;--v33-text:#f4f7fb}
    html[data-tr-theme="dark"] body{background:radial-gradient(circle at 10% -10%,#19304f 0,transparent 28%),radial-gradient(circle at 100% 0,#123a36 0,transparent 24%),linear-gradient(180deg,#090d13,#0b1118 48%,#080c11)!important;color:var(--v33-text)}
    .top{min-height:62px!important;background:rgba(9,13,19,.9)!important;border-bottom:1px solid #ffffff0d!important;backdrop-filter:blur(20px)!important}.top .brand{font-size:14px!important}.top .sub{font-size:10px!important}.top .btn{padding:8px 11px!important;border-radius:12px!important}
    .v33-head{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;margin:2px 0 12px}.v33-head h2{margin:0;font-size:20px;letter-spacing:-.4px}.v33-head .note{margin-top:4px}.v33-date{font-size:10px;font-weight:900;padding:7px 9px;border-radius:999px;background:#ffffff0b;border:1px solid var(--line)}
    .v33-hero{border:1px solid #ffffff10;border-radius:24px;padding:18px;background:linear-gradient(145deg,#152239,#101722 60%,#12231f);box-shadow:0 24px 70px #0005;overflow:hidden;position:relative}.v33-hero:after{content:'';position:absolute;width:160px;height:160px;border-radius:50%;right:-75px;top:-80px;background:#6f8cff20;filter:blur(3px)}.v33-hero-title{font-size:11px;color:#a8b4c5;font-weight:850}.v33-hero-value{font-size:29px;font-weight:950;margin-top:4px;letter-spacing:-1px}.v33-hero-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:15px}.v33-mini{border:1px solid #ffffff0d;background:#ffffff08;border-radius:14px;padding:10px;min-width:0}.v33-mini span{display:block;font-size:8px;color:#9aa7b8;font-weight:850}.v33-mini b{display:block;font-size:12px;margin-top:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .v33-section-title{display:flex;align-items:center;justify-content:space-between;margin:20px 2px 9px}.v33-section-title h3{margin:0;font-size:13px;letter-spacing:.02em}.v33-section-title span{font-size:9px;color:var(--muted)}
    .v33-flows{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}.v33-flow{position:relative;min-height:156px;border:1px solid var(--line);border-radius:20px;background:linear-gradient(145deg,var(--card),color-mix(in srgb,var(--card) 82%,#000));padding:15px;overflow:hidden;cursor:pointer;transition:.18s transform,.18s border-color}.v33-flow:hover{transform:translateY(-1px);border-color:color-mix(in srgb,var(--flow) 55%,var(--line))}.v33-flow:before{content:'';position:absolute;left:0;top:0;right:0;height:3px;background:var(--flow)}.v33-flow:after{content:'';position:absolute;right:-28px;top:-30px;width:95px;height:95px;border-radius:50%;background:color-mix(in srgb,var(--flow) 16%,transparent)}.v33-flow-icon{font-size:21px;font-weight:950;color:var(--flow);position:relative;z-index:1}.v33-flow-top{display:flex;justify-content:space-between;align-items:center;gap:8px}.v33-flow-count{font-size:23px;font-weight:950}.v33-flow h4{font-size:14px;margin:8px 0 3px}.v33-flow .note{font-size:9px;line-height:1.35;min-height:24px}.v33-flow-metrics{display:grid;grid-template-columns:1fr 1fr;gap:5px;margin-top:10px}.v33-flow-metrics div{font-size:8px;color:var(--muted)}.v33-flow-metrics b{display:block;color:var(--ink);font-size:10px;margin-top:2px}
    .v33-control{display:grid;grid-template-columns:repeat(3,1fr);gap:9px}.v33-alert{border:1px solid var(--line);border-radius:17px;background:var(--card);padding:13px}.v33-alert span{display:block;font-size:9px;color:var(--muted)}.v33-alert b{display:block;font-size:20px;margin-top:5px}.v33-alert.warn b{color:#ffb257}.v33-alert.bad b{color:#ff7287}.v33-alert.good b{color:#6bd59f}
    .v33-list{display:grid;gap:8px}.v33-route{border:1px solid var(--line);border-radius:18px;background:var(--card);padding:14px;cursor:pointer}.v33-route-top{display:flex;justify-content:space-between;align-items:flex-start;gap:10px}.v33-route-id{font-size:10px;font-weight:950;color:#9db0ff}.v33-route-name{font-size:14px;font-weight:950;margin-top:4px;line-height:1.2}.v33-route-meta{font-size:9px;color:var(--muted);margin-top:4px;line-height:1.45}.v33-route-cost{font-size:12px;font-weight:950;white-space:nowrap}.v33-route-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-top:10px}.v33-route-grid div{background:var(--soft);border-radius:11px;padding:8px}.v33-route-grid span{display:block;font-size:7px;color:var(--muted)}.v33-route-grid b{display:block;font-size:9px;margin-top:3px}.v33-pill{display:inline-flex;padding:5px 7px;border-radius:999px;background:#ffffff0b;font-size:8px;font-weight:900;color:var(--muted)}
    .v33-back{display:inline-flex;align-items:center;gap:6px;border:0;border-radius:12px;background:var(--soft);color:var(--ink);padding:9px 11px;font-weight:900;margin-bottom:10px}.v33-flow-detail{display:grid;gap:10px}.v33-empty{border:1px dashed var(--line);border-radius:18px;padding:28px 16px;text-align:center;color:var(--muted);background:var(--card)}
    .v33-manual{border:1px solid var(--line);border-radius:17px;background:var(--card);padding:13px}.v33-manual-top{display:flex;justify-content:space-between;gap:8px}.v33-manual b{font-size:12px}.v33-manual .note{margin-top:4px;line-height:1.45}
    .v33-report-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:9px}.v33-report-card{border:1px solid var(--line);border-radius:18px;background:var(--card);padding:14px}.v33-report-card span{font-size:9px;color:var(--muted)}.v33-report-card b{display:block;font-size:18px;margin-top:5px}.v33-warehouse{margin-top:10px;border-top:1px solid var(--line);padding-top:10px;display:flex;justify-content:space-between;gap:8px;font-size:10px}
    .v33-more{display:grid;gap:9px}.v33-more button{width:100%;border:1px solid var(--line);border-radius:15px;background:var(--card);color:var(--ink);padding:13px;text-align:left;font-weight:900}.v33-more small{display:block;color:var(--muted);font-weight:600;margin-top:3px}
    .bottom{background:rgba(12,17,24,.94)!important;border-top:1px solid #ffffff10!important;backdrop-filter:blur(18px)!important}.bottom button{background:transparent!important;color:#8d99aa!important}.bottom button b{font-size:17px!important}.bottom button.active33{color:#8fa5ff!important}
    @media(max-width:900px){.v33-flows{grid-template-columns:repeat(2,minmax(0,1fr))}.v33-report-grid{grid-template-columns:repeat(2,1fr)}}
    @media(max-width:520px){.wrap{padding:11px!important;padding-bottom:86px!important}.filters{margin-bottom:8px!important}.v33-hero{padding:15px}.v33-hero-value{font-size:25px}.v33-hero-grid{grid-template-columns:repeat(2,1fr)}.v33-flows{grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.v33-flow{padding:12px;min-height:150px}.v33-flow h4{font-size:13px}.v33-control{grid-template-columns:1fr 1fr}.v33-control .v33-alert:last-child{grid-column:1/-1}.v33-route-grid{grid-template-columns:repeat(2,1fr)}.v33-report-grid{grid-template-columns:1fr 1fr}.top .brand{font-size:12px!important}.top .logo{width:38px!important;height:38px!important}.top .btn{font-size:10px!important}}
  `;
  document.head.appendChild(css);

  function flowCard(key){
    const m=flowMeta[key], s=flowStats(key), count=s.routes+s.manual;
    return `<article class="v33-flow" style="--flow:${m.accent}" onclick="showFlow33('${key}')"><div class="v33-flow-top"><span class="v33-flow-icon">${m.icon}</span><b class="v33-flow-count">${count}</b></div><h4>${m.title}</h4><div class="note">${m.hint}</div><div class="v33-flow-metrics"><div>ТТ<b>${fmt(s.tt,0)}</b></div><div>Палети<b>${fmt(s.pallets,1)}</b></div><div>Продажі<b>${money(s.sales)}</b></div><div>Витрати<b>${money(s.cost)}</b></div></div></article>`;
  }
  function issueStats(){
    let noCarrier=0,noTariff=0,noZone=0;
    for(const r of D.routes||[]){
      const f=routeFact(r.id), c=norm(f.carrier_name);
      if(!c) noCarrier++;
      if(c && !has(c,'stv','sav') && f.tariff==null && f.corrected_tariff==null && !f.tariff_unknown) noTariff++;
    }
    noZone=(D.costPoints||[]).filter(x=>x.zone==null).length;
    return {noCarrier,noTariff,noZone};
  }
  function latestRoutes(){
    return [...(D.routes||[])].slice(0,5).map(routeRow).join('');
  }
  function routeRow(r){
    const f=routeFact(r.id), n=routeNumbers(r), c=f.carrier_name||'Без перевізника';
    return `<div class="v33-route" onclick="routeCard(${Number(r.id)})"><div class="v33-route-top"><div><div class="v33-route-id">${esc(r.route_delivery_id||r.id)}</div><div class="v33-route-name">${esc(r.expeditor_name||'—')}</div><div class="v33-route-meta">${esc(r.warehouse||'—')} · ${esc(c)}</div></div><div class="v33-route-cost">${money(n.cost)}</div></div><div class="v33-route-grid"><div><span>ТТ</span><b>${fmt(n.tt,0)}</b></div><div><span>Палети</span><b>${fmt(n.pallets,1)}</b></div><div><span>Продажі</span><b>${money(n.sales)}</b></div><div><span>Документи</span><b>${fmt(n.docs,0)}</b></div></div></div>`;
  }

  home=function(){
    const t=totalStats(), issues=issueStats(), d=document.getElementById('d20')?.value||document.getElementById('date')?.value||'';
    view.innerHTML=`<div class="v33-head"><div><h2>Transport Control</h2><div class="note">Retail · реальні транспортні дані</div></div><span class="v33-date">${esc(d)}</span></div><section class="v33-hero"><div class="v33-hero-title">ТРАНСПОРТНІ ВИТРАТИ</div><div class="v33-hero-value">${money(t.cost)}</div><div class="v33-hero-grid"><div class="v33-mini"><span>Маршрути</span><b>${fmt(t.routes,0)}</b></div><div class="v33-mini"><span>ТТ</span><b>${fmt(t.tt,0)}</b></div><div class="v33-mini"><span>Палети</span><b>${fmt(t.pallets,1)}</b></div><div class="v33-mini"><span>% логістики</span><b>${pct(t.cost,t.sales)}</b></div></div></section><div class="v33-section-title"><h3>Напрямки</h3><span>Натисни для деталізації</span></div><section class="v33-flows">${Object.keys(flowMeta).map(flowCard).join('')}</section><div class="v33-section-title"><h3>Контроль дня</h3><span>Що потребує уваги</span></div><section class="v33-control"><div class="v33-alert ${issues.noCarrier?'bad':'good'}"><span>Без перевізника</span><b>${issues.noCarrier}</b></div><div class="v33-alert ${issues.noTariff?'warn':'good'}"><span>Без тарифу</span><b>${issues.noTariff}</b></div><div class="v33-alert ${issues.noZone?'warn':'good'}"><span>STV/SAV без зони</span><b>${issues.noZone}</b></div></section><div class="v33-section-title"><h3>Маршрути</h3><span>${(D.routes||[]).length} всього</span></div><section class="v33-list">${latestRoutes()||'<div class="v33-empty">На обрану дату маршрутів немає</div>'}</section>`;
    markBottom33('home');
  };

  function manualRow(x){
    const title=x.sender_warehouse&&x.receiver_branch?`${esc(x.sender_warehouse)} → ${esc(x.receiver_branch)}`:esc(x.carrier_name||x.comment||'Ручний запис');
    const count=Number(x.points_count||x.shipments_count||0)||0;
    return `<div class="v33-manual"><div class="v33-manual-top"><div><b>${title}</b><div class="note">${esc(x.entry_date||'')} · ${fmt(count,0)} відпр. · ${fmt(x.pallets||0,1)} пал.</div></div><b>${money(x.expense_amount||0)}</b></div></div>`;
  }

  window.showFlow33=function(key){
    const meta=flowMeta[key]; if(!meta) return home();
    const d=flowData(key), s=flowStats(key);
    view.innerHTML=`<button class="v33-back" onclick="home()">← Головна</button><div class="v33-head"><div><h2 style="color:${meta.accent}">${meta.title}</h2><div class="note">${meta.hint}</div></div><span class="v33-pill">${d.routes.length+d.manual.length} записів</span></div><section class="v33-hero"><div class="v33-hero-grid"><div class="v33-mini"><span>ТТ</span><b>${fmt(s.tt,0)}</b></div><div class="v33-mini"><span>Палети</span><b>${fmt(s.pallets,1)}</b></div><div class="v33-mini"><span>Продажі</span><b>${money(s.sales)}</b></div><div class="v33-mini"><span>Витрати</span><b>${money(s.cost)}</b></div></div></section><div class="v33-section-title"><h3>${d.routes.length?'Маршрути':'Записи'}</h3><span>${d.routes.length+d.manual.length}</span></div><div class="v33-flow-detail">${d.routes.map(routeRow).join('')}${d.manual.map(manualRow).join('')||(!d.routes.length?'<div class="v33-empty">На обрану дату даних у цьому блоці немає</div>':'')}</div><button class="btn" style="width:100%;margin-top:12px" onclick="go('logistics')">Перейти до логістики</button>`;
    markBottom33('home');
  };

  analytics=function(){
    const t=totalStats();
    const warehouses={};
    for(const r of D.routes||[]){const k=r.warehouse||'Без складу',n=routeNumbers(r);const x=warehouses[k]??={routes:0,tt:0,sales:0,cost:0};x.routes++;x.tt+=n.tt;x.sales+=n.sales;x.cost+=n.cost}
    view.innerHTML=`<div class="v33-head"><div><h2>Аналітика</h2><div class="note">Зведення транспортної ефективності</div></div></div><section class="v33-report-grid"><div class="v33-report-card"><span>Маршрути</span><b>${fmt(t.routes,0)}</b></div><div class="v33-report-card"><span>ТТ</span><b>${fmt(t.tt,0)}</b></div><div class="v33-report-card"><span>Палети</span><b>${fmt(t.pallets,1)}</b></div><div class="v33-report-card"><span>Продажі</span><b>${money(t.sales)}</b></div><div class="v33-report-card"><span>Витрати</span><b>${money(t.cost)}</b></div><div class="v33-report-card"><span>1 ТТ</span><b>${t.tt?money(t.cost/t.tt):'—'}</b></div></section><div class="v33-section-title"><h3>За складами</h3><span>${Object.keys(warehouses).length}</span></div><section class="v33-list">${Object.entries(warehouses).map(([k,x])=>`<div class="v33-report-card"><b style="font-size:13px">${esc(k)}</b><div class="v33-warehouse"><span>${x.routes} маршрутів · ${x.tt} ТТ</span><b>${money(x.cost)}</b></div><div class="v33-warehouse"><span>Продажі</span><b>${money(x.sales)}</b></div></div>`).join('')||'<div class="v33-empty">Немає даних</div>'}</section>`;
    markBottom33('analytics');
  };

  ai=function(){
    const q=issueStats();
    view.innerHTML=`<div class="v33-head"><div><h2>Контроль даних</h2><div class="note">Швидка перевірка якості транспортного дня</div></div></div><section class="v33-control"><div class="v33-alert ${q.noCarrier?'bad':'good'}"><span>Маршрути без перевізника</span><b>${q.noCarrier}</b></div><div class="v33-alert ${q.noTariff?'warn':'good'}"><span>Маршрути без тарифу</span><b>${q.noTariff}</b></div><div class="v33-alert ${q.noZone?'warn':'good'}"><span>ТТ без зони STV/SAV</span><b>${q.noZone}</b></div></section><div class="v33-section-title"><h3>Статус</h3></div><div class="v33-more"><button onclick="go('logistics')">Перевірити маршрути<small>Відкрити логістичний блок і заповнити відсутні дані</small></button><button onclick="loadAll()">Оновити дані<small>Повторно завантажити поточну дату із Supabase</small></button></div>`;
    markBottom33('ai');
  };

  more=function(){
    view.innerHTML=`<div class="v33-head"><div><h2>Ще</h2><div class="note">Transport Report TS</div></div></div><div class="v33-more"><button onclick="loadAll()">Оновити дані<small>Синхронізувати поточний день</small></button><button onclick="go('analytics')">Відкрити аналітику<small>ТТ, продажі, витрати та вартість доставки</small></button><button onclick="go('ai')">Контроль даних<small>Перевірка тарифів, перевізників і зон</small></button><button onclick="logout()">Вийти з акаунта<small>Завершити поточну сесію</small></button></div>`;
    markBottom33('more');
  };

  function markBottom33(name){
    const buttons=[...document.querySelectorAll('.bottom button')];
    buttons.forEach(x=>x.classList.remove('active33'));
    const idx={home:0,logistics:1,analytics:2,ai:3,more:4}[name];
    if(idx!=null&&buttons[idx]) buttons[idx].classList.add('active33');
  }
  const oldLogistics33=logistics;
  logistics=function(){const r=oldLogistics33();setTimeout(()=>markBottom33('logistics'),0);return r};

  function relabel(){
    const top=[...document.querySelectorAll('.nav button')];
    if(top[0]) top[0].textContent='Головна';
    if(top[1]) top[1].textContent='Логістика';
    if(top[2]) top[2].textContent='Аналітика';
    if(top[3]) top[3].textContent='Контроль';
    const bot=[...document.querySelectorAll('.bottom button')];
    if(bot[0]) bot[0].innerHTML='<b>⌂</b>Головна';
    if(bot[1]) bot[1].innerHTML='<b>▤</b>Логістика';
    if(bot[2]) bot[2].innerHTML='<b>▦</b>Аналітика';
    if(bot[3]) bot[3].innerHTML='<b>✓</b>Контроль';
    if(bot[4]) bot[4].innerHTML='<b>•••</b>Ще';
    const sub=document.querySelector('.top .sub'); if(sub) sub.textContent='Retail Transport Control';
  }
  relabel();
  setTimeout(()=>{relabel();if(page==='home')home()},120);
})();