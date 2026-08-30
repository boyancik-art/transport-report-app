(()=>{
const money=n=>new Intl.NumberFormat('uk-UA',{maximumFractionDigits:0}).format(Number(n)||0)+' грн';
const pal=n=>new Intl.NumberFormat('uk-UA',{maximumFractionDigits:3}).format(Number(n)||0);
const norm=s=>String(s||'').trim().toLowerCase();
function uniqueDocsForRoute(r){const rows=(D.docs||[]).filter(d=>String(d.route_delivery_id)===String(r.route_delivery_id)),m=new Map();for(const d of rows){const k=`${d.sale_code||d.operation_code||d.id}|${d.address_id||''}|${d.customer_id||''}`;if(!m.has(k))m.set(k,d)}return [...m.values()]}
function routeNumbers(r){const pts=(D.points||[]).filter(p=>Number(p.route_id)===Number(r.id)),docs=uniqueDocsForRoute(r);return{
 tt:pts.length||Number(r.total_points)||0,
 docs:docs.length||Number(r.total_documents)||0,
 pallets:pts.length?pts.reduce((s,p)=>s+(+p.pallets||0),0):(Number(r.total_pallets)||0),
 sales:docs.length?docs.reduce((s,d)=>s+(+d.order_amount||0),0):(Number(r.total_order_amount)||0)
}}
function repairCards(){document.querySelectorAll('.route-card-v19').forEach(card=>{const m=(card.getAttribute('onclick')||'').match(/routeCard\((\d+)\)/);if(!m)return;const r=(D.routes||[]).find(x=>Number(x.id)===Number(m[1]));if(!r)return;const n=routeNumbers(r);card.querySelectorAll('.mini-stat').forEach(stat=>{const l=norm(stat.querySelector('span')?.textContent),b=stat.querySelector('b');if(!b)return;if(l.includes('тт'))b.textContent=n.tt;if(l==='документи')b.textContent=n.docs;if(l==='палети')b.textContent=pal(n.pallets);if(l==='сума')b.textContent=money(n.sales)});const note=card.querySelector('.route-top .note');if(note&&!note.textContent.includes('Склад:'))note.innerHTML=`${E(r.expeditor_name||'—')}<br><span class="warehouse-inline">Склад: ${E(r.warehouse||'—')}</span>`});}
function repairDetail(id){const r=(D.routes||[]).find(x=>Number(x.id)===Number(id));if(!r)return;const n=routeNumbers(r);document.querySelectorAll('.route-detail-head .mini-stat').forEach(stat=>{const l=norm(stat.querySelector('span')?.textContent),b=stat.querySelector('b');if(!b)return;if(l.includes('тт'))b.textContent=n.tt;if(l==='документи')b.textContent=n.docs;if(l==='палети')b.textContent=pal(n.pallets);if(l==='сума')b.textContent=money(n.sales)});}
const oldLogistics25=logistics;logistics=function(){const out=oldLogistics25();repairCards();setTimeout(repairCards,0);return out};
const oldRouteCard25=routeCard;routeCard=function(id){const out=oldRouteCard25(id);repairDetail(id);setTimeout(()=>repairDetail(id),0);return out};

const THEME_KEY='trts_theme';
function applyTheme(v){document.documentElement.dataset.trTheme=v;localStorage.setItem(THEME_KEY,v);const b=document.getElementById('themeToggle25');if(b)b.innerHTML=v==='dark'?'☀︎':'◐';if(b)b.title=v==='dark'?'Світла тема':'Темна тема'}
function ensureThemeToggle(){let b=document.getElementById('themeToggle25');if(b)return;b=document.createElement('button');b.id='themeToggle25';b.className='theme-toggle25';b.type='button';b.onclick=()=>applyTheme((document.documentElement.dataset.trTheme||'dark')==='dark'?'light':'dark');const logout=document.querySelector('.top>.btn');if(logout)logout.before(b);else document.querySelector('.top')?.appendChild(b);applyTheme(localStorage.getItem(THEME_KEY)||'dark')}
const css=document.createElement('style');css.textContent=`
html[data-tr-theme="dark"]{--bg:#0d1016;--card:#151a22;--ink:#f5f2ee;--muted:#969daa;--line:#2a303b;--soft:#241a1e;--ok:#63c792;--accent:#a92b43;--dark:#090b0f}
html[data-tr-theme="dark"] body{background:radial-gradient(circle at 50% -20%,#28212a 0,#151820 30%,#0d1016 68%,#090b0f 100%)!important;color:var(--ink)!important;background-attachment:fixed!important}
html[data-tr-theme="dark"] .top{background:linear-gradient(145deg,#090b0f 0%,#11151c 55%,#2b1118 100%)!important;border-bottom:1px solid #ffffff10!important;box-shadow:0 18px 45px #0008!important}
html[data-tr-theme="dark"] .route-card-v19,html[data-tr-theme="dark"] .route-detail-head,html[data-tr-theme="dark"] .fact-editor,html[data-tr-theme="dark"] .address-card,html[data-tr-theme="dark"] .tt-card,html[data-tr-theme="dark"] .card,html[data-tr-theme="dark"] .cost-card,html[data-tr-theme="dark"] .day-card{background:linear-gradient(155deg,rgba(26,31,40,.98),rgba(18,22,29,.98))!important;border-color:#303642!important;box-shadow:0 22px 55px #0006,0 1px 0 #ffffff08 inset!important;color:#f5f2ee!important}
html[data-tr-theme="dark"] .mini-stat,html[data-tr-theme="dark"] .doc-mini,html[data-tr-theme="dark"] .tt-geo span{background:linear-gradient(150deg,#202631,#191e27)!important;border-color:#2e3541!important;color:#f5f2ee!important}
html[data-tr-theme="dark"] .mini-stat span,html[data-tr-theme="dark"] .note,html[data-tr-theme="dark"] .address-text,html[data-tr-theme="dark"] .doc-mini-meta,html[data-tr-theme="dark"] .label,html[data-tr-theme="dark"] .tt-geo small{color:#9299a7!important}
html[data-tr-theme="dark"] .data-controls select,html[data-tr-theme="dark"] .data-controls input,html[data-tr-theme="dark"] .fact-row select,html[data-tr-theme="dark"] .fact-row input{background:#151a22!important;color:#f5f2ee!important;border-color:#303642!important;box-shadow:0 12px 30px #0003!important}
html[data-tr-theme="dark"] .bottom{background:rgba(12,15,20,.96)!important;border-top-color:#2c323d!important;box-shadow:0 -16px 40px #0007!important}
html[data-tr-theme="dark"] .bottom button{color:#b9bec8!important;background:transparent!important}
html[data-tr-theme="dark"] .tt-info-pill.business-unit{background:#232b36!important;color:#d7dbe2!important}html[data-tr-theme="dark"] .tt-info-pill{background:#361922!important;color:#f1b7c3!important}
html[data-tr-theme="light"] body{background:radial-gradient(circle at 50% -10%,#fff 0,#f6f4f2 32%,#eef0f3 70%,#e9ecef 100%)!important;background-attachment:fixed!important}
.theme-toggle25{margin-left:auto;width:39px;height:39px;border-radius:13px;border:1px solid #ffffff22;background:#ffffff10;color:#fff;font-size:19px;display:grid;place-items:center;cursor:pointer;backdrop-filter:blur(12px)}.theme-toggle25+.btn{margin-left:6px!important}
html[data-tr-theme="light"] .theme-toggle25{background:#2a2e35;color:#fff;border-color:#2a2e35}
`;
document.head.appendChild(css);ensureThemeToggle();repairCards();
})();