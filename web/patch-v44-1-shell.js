// v44.1 is a presentation layer. Allocation, tariffs and persisted records stay in v44.0.
(()=>{
 const $=s=>document.querySelector(s),ui=()=>window.TRTS_UI;
 const paths={
  logistics:'<path d="M3 7h11v10H3zM14 10h4l3 4v3h-7"/><circle cx="7" cy="18" r="2"/><circle cx="18" cy="18" r="2"/>',
  pickup:'<path d="M3 10l9-6 9 6v10H3zM7 20v-8h10v8M10 15h4"/>',
  fop:'<path d="M3 7h11v10H3zM14 10h4l3 4v3h-7"/><circle cx="7" cy="18" r="2"/><circle cx="18" cy="18" r="2"/>',
  bakery:'<path d="M7 20v-8a4 4 0 0 1-2-7 4 4 0 0 1 7-1 4 4 0 0 1 7 1 4 4 0 0 1-2 7v8zM7 16h10M10 9v3M14 9v3"/>',
  courier:'<path d="M3 7l9-4 9 4v10l-9 4-9-4zM3 7l9 5 9-5M12 12v9M7 5l9 5"/>',
  replen:'<path d="M3 11V5h7v6M14 19v-6h7v6M3 15h7l-2-2M10 15l-2 2M21 9h-7l2-2M14 9l2 2"/>',
  sav:'<path d="M12 21s7-6 7-12a7 7 0 0 0-14 0c0 6 7 12 7 12z"/><circle cx="12" cy="9" r="2.5"/>',
  stv:'<path d="M3 7l9-4 9 4v10l-9 4-9-4zM3 7l9 5 9-5M12 12v9"/><path d="M7 10v7M17 10v7"/>',
  finance:'<rect x="3" y="5" width="18" height="15" rx="3"/><path d="M3 9h18M7 14h3M7 17h6"/><circle cx="17" cy="14" r="1"/>',
  fleet:'<path d="M4 16l2-8h12l2 8v4h-3v-2H7v2H4zM5 13h14M7 16h1M16 16h1"/>',
  inter:'<path d="M3 9V4h6v5H3zM15 20v-5h6v5h-6zM5 12v6h7M19 12V6h-7M10 16l2 2-2 2M14 4l-2 2 2 2"/>',
  refresh:'<path d="M20 7v5h-5M4 17v-5h5M6 7a7 7 0 0 1 12-1l2 6M4 12l2 6a7 7 0 0 0 12-1"/>',
  login:'<path d="M14 4h6v16h-6M3 12h12M11 8l4 4-4 4"/>',
  logout:'<path d="M10 4H4v16h6M10 12h11M17 8l4 4-4 4"/>'
 };
 const icon=key=>'<span class="v441-icon v441-'+key+'" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">'+(paths[key]||paths.finance)+'</svg></span>';
 const entries=[['fleet','Власний парк','Місячні витрати',"v44OpenCosts('fleet')"],['sav','Тариф SAV','ТТ та палети за зонами',"v44OpenCosts('SAV')"],['stv','Тариф STV','ТТ та палети за зонами',"v44OpenCosts('STV')"],['inter','STV міжфілійна доставка','Палети між філіями','v44Interbranch()']];
 let homeTab='logistics';
 function financeTabs(active){return '<nav class="v441-cost-tabs" aria-label="Витрати та тарифи">'+entries.map(([key,label,,action])=>'<button type="button" class="'+(key===String(active).toLowerCase()?'on':'')+'" '+(key===String(active).toLowerCase()?'aria-current="page"':'')+' onclick="'+action+'">'+icon(key)+'<span>'+label+'</span></button>').join('')+'</nav>'}
 function applyTab(){
  for(const key of ['logistics','finance']){
   const panel=$('#v441-'+key+'-panel'),button=$('#v441-'+key+'-tab');
   if(panel)panel.hidden=key!==homeTab;
   button?.setAttribute('aria-selected',String(key===homeTab));
   if(button)button.tabIndex=key===homeTab?0:-1;
  }
 }
 function mount(screen,content){
  screen.classList.add('v441-home');
  const nav=document.createElement('div');nav.className='v441-home-tabs';nav.setAttribute('role','tablist');nav.setAttribute('aria-label','Розділи застосунку');
  nav.innerHTML=[['logistics','Логістичний блок','7 підблоків'],['finance','Витрати та тарифи','4 підблоки']].map(([key,title,sub])=>'<button type="button" role="tab" id="v441-'+key+'-tab" aria-controls="v441-'+key+'-panel" onclick="v441HomeTab(\''+key+'\')">'+icon(key)+'<b>'+title+'</b><small>'+sub+'</small></button>').join('');
  const logistics=document.createElement('section');logistics.id='v441-logistics-panel';logistics.setAttribute('role','tabpanel');logistics.setAttribute('aria-labelledby','v441-logistics-tab');logistics.append(content);
  const finance=document.createElement('section');finance.id='v441-finance-panel';finance.className='v441-finance-grid';finance.setAttribute('role','tabpanel');finance.setAttribute('aria-labelledby','v441-finance-tab');
  finance.innerHTML=entries.map(([key,label,sub,action])=>'<button type="button" class="v441-finance-card" onclick="'+action+'">'+icon(key)+'<span><b>'+label+'</b><small>'+sub+'</small></span><span class="v441-chevron" aria-hidden="true">›</span></button>').join('');
  screen.append(nav,logistics,finance);applyTab();
 }
 window.v441HomeTab=key=>{if(!['logistics','finance'].includes(key))return;homeTab=key;applyTab()};
 window.v441FinanceHome=()=>{homeTab='finance';v433Dashboard()};
 document.addEventListener('keydown',e=>{if(!e.target.matches('.v441-home-tabs [role=tab]')||!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();homeTab=e.key==='Home'?'logistics':e.key==='End'?'finance':homeTab==='logistics'?'finance':'logistics';applyTab();$('#v441-'+homeTab+'-tab')?.focus()});
 window.TRTS_SHELL={icon,mount,financeTabs};

 let refreshing=false,refreshMode='date',draft=null;
 window.v441RefreshDialog=()=>{
  if(refreshing)return;
  const period=window.v435ReportPeriod();draft={from:period.from,to:period.to};refreshMode=period.from===period.to?'date':'range';renderRefresh();
 };
 function renderRefresh(){
  window.TRTS_OPS.modal('Оновити дані','<form id="v441-refresh-form" class="v43-form" onsubmit="event.preventDefault();v441RunRefresh()"><div class="v441-refresh-modes v433-full"><button type="button" aria-pressed="'+(refreshMode==='date')+'" onclick="v441RefreshMode(\'date\')">Одна дата</button><button type="button" aria-pressed="'+(refreshMode==='range')+'" onclick="v441RefreshMode(\'range\')">Період</button></div><label>'+ (refreshMode==='date'?'Дата':'З')+ui().dateField('v441-refresh-from',draft.from)+'</label>'+(refreshMode==='range'?'<label>По'+ui().dateField('v441-refresh-to',draft.to)+'</label>':'')+'<p class="v433-full v441-note">Перечитати дані з бази за вибрані дати. Імпорт із Excel виконується окремо.</p><p id="v441-refresh-error" class="v433-full v433-error" role="alert"></p></form>','<button type="button" onclick="v43CloseModal()">Скасувати</button><button type="submit" form="v441-refresh-form" id="v441-refresh-submit" class="primary">Оновити дані</button>');
 }
 window.v441RefreshMode=mode=>{if(refreshing||!['date','range'].includes(mode))return;draft={from:$('#v441-refresh-from').value,to:$('#v441-refresh-to')?.value||$('#v441-refresh-from').value};refreshMode=mode;renderRefresh()};
 window.v441RunRefresh=async()=>{
  if(refreshing||!$('#v441-refresh-form')?.reportValidity())return;
  const a=$('#v441-refresh-from').value,b=refreshMode==='date'?a:$('#v441-refresh-to').value,err=$('#v441-refresh-error');
  if(!ui().validDate(a)||!ui().validDate(b)){err.textContent='Оберіть коректну дату';return}
  if(a>b){err.textContent='Дата «З» не може бути пізнішою за дату «По»';return}
  refreshing=true;const modal=$('#v43-modal');modal.setAttribute('aria-busy','true');modal.querySelectorAll('button').forEach(b=>b.disabled=true);$('#v441-refresh-submit').textContent='Оновлюємо…';
  try{const result=await window.v441LoadPeriod(a,b,refreshMode==='date'?'date':'custom');if(!result?.ok)throw Error(result?.error||'Не вдалося оновити дані. Спробуйте ще раз.');v43CloseModal()}
  catch(e){if(err.isConnected)err.textContent=e.message}
  finally{refreshing=false;modal.removeAttribute('aria-busy');modal.querySelectorAll('button').forEach(b=>b.disabled=false);const save=$('#v441-refresh-submit');if(save)save.textContent='Оновити дані'}
 };

 for(const img of document.querySelectorAll('img.logo')){img.alt='Transport Report TS';img.setAttribute('decoding','async')}
 const signIn=$('#loginForm button'),signOut=$('header.top button[onclick="logout()"]');
 if(signIn){signIn.classList.add('v441-auth');signIn.innerHTML=icon('login')+'<span>Увійти</span>'}
 if(signOut){signOut.classList.add('v441-auth');signOut.innerHTML=icon('logout')+'<span>Вийти</span>'}
 const originalLogout=window.logout;
 if(typeof originalLogout==='function')window.logout=(...args)=>{const result=originalLogout(...args);$('#login')?.style.removeProperty('display');document.body.classList.remove('pk-only','trts-route-view');return result};
 const style=document.createElement('style');style.textContent=`
 [hidden]{display:none!important}
 .v441-icon{display:inline-flex;align-items:center;justify-content:center;flex:0 0 auto;width:42px;height:42px;padding:9px;border-radius:13px;color:#c5afff;background:#292044;border:1px solid #463264}
 .v441-icon svg{width:100%;height:100%;display:block}
 .v441-logistics,.v441-fop{color:#b8a1ff;background:#282044;border-color:#4b3970}
 .v441-finance,.v441-fleet{color:#59dbb0;background:#102d29;border-color:#245245}
 .v441-pickup,.v441-replen{color:#70c9ee;background:#142b3a;border-color:#2a4b60}
 .v441-bakery{color:#f3bd68;background:#33291d;border-color:#63482b}
 .v441-courier{color:#c499fc;background:#2c1f3d;border-color:#58396e}
 .v441-sav{color:#68d0b9;background:#11302e;border-color:#24544b}
 .v441-stv{color:#75aefb;background:#17283f;border-color:#304c72}
 .v441-inter{color:#e4a5db;background:#302038;border-color:#593862}
 .v441-home-tabs{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin:14px 0 20px}
 .v441-home-tabs button{display:grid;justify-items:start;align-content:start;gap:10px;min-width:0;min-height:152px;padding:16px;border:1px solid #29374e;border-radius:20px;color:#e4eaf4;background:linear-gradient(135deg,#101d2e,#0b1522);text-align:left;cursor:pointer;font:inherit;transition:border-color .15s,background .15s}
 .v441-home-tabs button[aria-selected=true]{border-color:#7e5bd0;background:linear-gradient(135deg,#211c38,#111b2b)}
 .v441-home-tabs button[aria-controls=v441-finance-panel][aria-selected=true]{border-color:#388d72;background:linear-gradient(135deg,#132c2a,#111b2b)}
 .v441-home-tabs b{font-size:17px;line-height:1.25;overflow-wrap:anywhere}.v441-home-tabs small{font-size:12px;color:#98a9bf}
 .v441-home button:focus-visible,.v441-cost-tabs button:focus-visible,.v441-auth:focus-visible{outline:2px solid #bea1ff;outline-offset:3px}
 .v441-finance-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
 .v441-finance-card{display:flex;align-items:center;gap:12px;min-height:100px;padding:16px;color:#edf2fa;background:#0d1928;border:1px solid #29394f;border-radius:18px;text-align:left;font:inherit;cursor:pointer}
 .v441-finance-card>span:nth-child(2){flex:1;min-width:0}.v441-finance-card b{display:block;font-size:16px;line-height:1.4}.v441-finance-card small{display:block;font-size:12px;line-height:1.4;color:#94a8be;margin-top:5px}.v441-chevron{color:#94a8be;font-size:26px}
 .v441-home .v431-block-head,.v441-home .v431-courier-head{padding:14px 12px!important;border:1px solid #263750!important;border-radius:16px!important;background:#0c1826!important;margin-bottom:10px;min-height:72px}
 .v441-home .v431-block-head b,.v441-home .v431-courier-head b{gap:12px;font-size:16px;min-width:0}
 .v441-home .v431-courier-head small{margin-left:54px;font-size:12px;color:#a3b1c4}
 .v441-home .v431-block{margin-bottom:14px!important}.v441-home .v436-block-body{padding-bottom:8px}
 .v441-cost-tabs{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin:14px 0}
 .v441-cost-tabs button{display:flex;align-items:center;gap:8px;min-width:0;min-height:62px;text-align:left;font:inherit;font-size:14px!important}.v441-cost-tabs .v441-icon{width:32px;height:32px;padding:6px;border-radius:10px}
 .v441-cost-tabs button.on{background:#25213a!important;border-color:#815fc1!important}
 .v44-costs>.v43-back{min-height:44px;font-size:14px}.v44-costs>h2{font-size:24px;line-height:1.25;margin:14px 0}
 #v43-period .v43-period-buttons{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px}
 #v43-period .v43-period-buttons button{font-size:14px;min-height:44px;padding:9px 5px}
 .v441-single-date{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px;align-items:end;margin-top:10px}.v441-single-date label{color:#a8b8cb;font-size:14px}.v441-single-date button[type=submit]{min-height:46px}
 .v435-period-status{display:grid;grid-template-columns:1fr auto;gap:12px;padding:12px 0 0;align-items:center}.v435-period-status small{font-size:13px!important;line-height:1.4}
 .v441-refresh-button{display:flex;align-items:center;justify-content:center;gap:7px;color:#e1d4ff!important;min-height:46px;background:#201b34!important;border-color:#544078!important;font-size:14px}
 .v441-refresh-button .v441-icon{width:20px;height:20px;padding:0;border:0;background:none;color:inherit}
 .v441-data-status{display:grid;gap:4px;margin:10px 0;color:#95a9c0;font-size:12px;line-height:1.5;overflow-wrap:anywhere}.v441-data-status p{margin:0}.v441-data-status time{color:#c0cfdf}
 .v441-refresh-modes{display:flex;gap:8px}.v441-refresh-modes button{flex:1;font-size:14px}.v441-refresh-modes button[aria-pressed=true]{background:#352455!important;border-color:#8a63cd!important}
 .v441-note{color:#a6b5c9;font-size:14px;line-height:1.5;margin:4px 0}
 body .login{background:#060e18;color:#eff3fb}.login .loginbox{background:linear-gradient(145deg,#101b2b,#0a1420)!important;border:1px solid #26374e;border-radius:24px!important;box-shadow:0 16px 44px #0004!important;padding:28px!important}
 body .loginbox .logo,body header.top .logo{display:block!important;object-fit:contain!important;object-position:center!important;transform:none!important;clip-path:none!important;border-radius:0!important;padding:0!important;overflow:visible!important;flex-shrink:0!important;height:auto!important;max-width:100%!important}
 body .loginbox .logo{width:94px!important;aspect-ratio:1;margin:0 auto 20px!important}
 body header.top{height:auto!important;min-height:78px!important;max-height:none!important;overflow:visible!important;background:#0b1522!important;border-bottom:1px solid #223148;padding:max(10px,env(safe-area-inset-top)) 14px 10px!important;gap:10px!important;position:relative!important;align-items:center!important;flex-wrap:nowrap!important}
 body header.top .logo{width:52px!important;aspect-ratio:1}
 header.top>div{min-width:0;flex:1}header.top .brand{white-space:normal!important;overflow:visible!important;text-overflow:clip!important;font-size:17px!important;line-height:1.25!important}
 header.top .sub{font-size:12px}.loginbox h1{font-size:27px;line-height:1.3;margin:10px 0}.loginbox .note{color:#99aac0;font-size:14px;line-height:1.5}
 body .v441-auth{display:flex!important;align-items:center;justify-content:center;gap:8px;min-height:46px;padding:10px 14px!important;border-radius:13px!important;background:#211c33!important;border:1px solid #594475!important;color:#eee7ff!important;font:inherit;font-size:14px!important;font-weight:700!important;flex:none;cursor:pointer}
 body .loginbox .v441-auth{background:linear-gradient(135deg,#6a42dd,#8050ed)!important;border-color:#9665ed!important;font-size:16px!important}
 .v441-auth .v441-icon{width:20px;height:20px;padding:0;border:0;background:none;color:inherit}
 .loginbox input{font-size:16px!important;min-height:48px;background:#091320!important;border-color:#2d3b50!important;color:#eef3fa!important}
 @media(max-width:600px){.v441-finance-grid{grid-template-columns:1fr}.v441-cost-tabs{grid-template-columns:repeat(2,minmax(0,1fr))}.v441-home-tabs{gap:10px}.v441-home-tabs button{padding:14px;min-height:158px}.v441-home-tabs b{font-size:16px}}
 @media(max-width:360px){body header.top{padding-left:10px!important;padding-right:10px!important;gap:8px!important}body header.top .logo{width:42px!important}header.top .brand{font-size:15px!important}.v441-auth span:not(.v441-icon){font-size:13px}.v441-home-tabs button{padding:12px}.v435-period-status{grid-template-columns:1fr}.v441-refresh-button{width:100%}}
 @media(prefers-reduced-motion:reduce){.v441-home-tabs button{transition:none}}
 `;document.head.append(style);
})();
