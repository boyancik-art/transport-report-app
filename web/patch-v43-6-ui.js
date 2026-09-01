(()=>{
const E=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const paths={person:'<circle cx="12" cy="7" r="4"/><path d="M5 22v-3a7 7 0 0114 0v3"/>',warehouse:'<path d="M3 10l9-6 9 6v11H3zM8 21v-7h8v7M2 10h20"/>',truck:'<path d="M2 5h12v13H2zM14 9h5l3 4v5h-8"/><circle cx="6" cy="19" r="2"/><circle cx="18" cy="19" r="2"/>',wave:'<path d="M2 8c4-8 8 8 12 0s8 0 8 0M2 16c4-8 8 8 12 0s8 0 8 0"/>',swap:'<path d="M3 7h18l-5-5M21 17H3l5 5M21 7l-5 5M3 17l5-5"/>',edit:'<path d="M3 21h18M5 16l1-4L17 1l4 4-11 11z"/>',back:'<path d="M21 12H3l8-8M3 12l8 8"/>',chevron:'<path d="M9 4l8 8-8 8"/>',plus:'<circle cx="12" cy="12" r="10"/><path d="M12 7v10M7 12h10"/>',calendar:'<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 2v6M17 2v6M3 11h18"/>',box:'<path d="M3 7l9-5 9 5-9 5zM3 7v12l9 4 9-4V7M12 12v11"/>',bottle:'<path d="M10 2h4v5l3 4v10H7V11l3-4zM7 14h10"/>',refresh:'<path d="M20 8A9 9 0 004 5L2 8m0-6v6h6M4 16a9 9 0 0016 3l2-3m0 6v-6h-6"/>',check:'<path d="M4 12l5 5L21 5"/>'};
const icon=(name,cls='')=>`<span class="v436-icon ${cls}" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${paths[name]||paths.box}</svg></span>`;
const months=['Січень','Лютий','Березень','Квітень','Травень','Червень','Липень','Серпень','Вересень','Жовтень','Листопад','Грудень'];
const iso=d=>d.toISOString().slice(0,10),parse=s=>/^\d{4}-\d{2}-\d{2}$/.test(s)?new Date(s+'T12:00:00Z'):new Date(NaN);
const valid=s=>Number.isFinite(+parse(s))&&iso(parse(s))===s;
const fmt=s=>valid(s)?new Intl.DateTimeFormat('uk-UA',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'}).format(parse(s)):'Оберіть дату';
const dateField=(id,value)=>`<input id="${E(id)}" type="hidden" value="${E(value)}"><button type="button" class="v436-date-button" data-date-target="${E(id)}" aria-haspopup="dialog" onclick="v436OpenCalendar('${E(id)}')">${icon('calendar')}<span>${E(fmt(value))}</span>${icon('chevron')}</button>`;
let cal=null;
function renderCalendar(focus=true){
 const el=document.getElementById('v436-calendar');if(!cal||!el)return;
 const start=new Date(Date.UTC(cal.year,cal.month,1,12)),offset=(start.getUTCDay()+6)%7,last=new Date(Date.UTC(cal.year,cal.month+1,0,12)).getUTCDate(),today=iso(new Date());
 el.innerHTML=`<div class="v436-cal-backdrop"><section class="v436-cal" role="dialog" aria-modal="true" aria-labelledby="v436-cal-title"><div class="v436-cal-title"><h3 id="v436-cal-title">Оберіть дату</h3><button type="button" aria-label="Закрити календар" onclick="v436CloseCalendar()">×</button></div><div class="v436-cal-nav"><button type="button" aria-label="Попередній місяць" onclick="v436CalendarMove(-1)">‹</button><select aria-label="Місяць" onchange="v436CalendarMonth(this.value)">${months.map((m,i)=>`<option value="${i}" ${i===cal.month?'selected':''}>${m}</option>`).join('')}</select><input id="v436-cal-year" type="number" min="1900" max="9999" step="1" aria-label="Рік" value="${cal.year}" onchange="v436CalendarYear(this.value)"><button type="button" aria-label="Наступний місяць" onclick="v436CalendarMove(1)">›</button></div><div class="v436-weekdays">${['Пн','Вт','Ср','Чт','Пт','Сб','Нд'].map(d=>`<span>${d}</span>`).join('')}</div><div class="v436-cal-days">${'<span></span>'.repeat(offset)}${Array.from({length:last},(_,i)=>{const day=iso(new Date(Date.UTC(cal.year,cal.month,i+1,12)));return`<button type="button" data-day="${day}" class="${day===cal.selected?'selected':''} ${day===today?'today':''}" tabindex="${day===cal.cursor?'0':'-1'}" aria-label="${E(new Intl.DateTimeFormat('uk-UA',{dateStyle:'full',timeZone:'UTC'}).format(parse(day)))}" aria-pressed="${day===cal.selected}" onclick="v436CalendarPick('${day}')">${i+1}</button>`}).join('')}</div><div class="v436-cal-selected">${E(fmt(cal.selected))}</div><div class="v436-cal-actions"><button type="button" onclick="v436CalendarToday()">Сьогодні</button><button type="button" class="primary" onclick="v436CalendarDone()">Готово</button></div></section></div>`;
 el.querySelector('.v436-cal-backdrop').onclick=e=>{if(e.target===e.currentTarget)v436CloseCalendar()};
 if(focus)(el.querySelector('[data-day="'+cal.cursor+'"]')||el.querySelector('.selected')||el.querySelector('[data-day]'))?.focus();
}
window.v436OpenCalendar=id=>{
 const input=document.getElementById(id);if(!input)return;
 if(cal)v436CloseCalendar();const selected=valid(input.value)?input.value:iso(new Date()),d=parse(selected);
 cal={input,opener:document.activeElement,selected,cursor:selected,year:d.getUTCFullYear(),month:d.getUTCMonth()};
 const el=document.createElement('div');el.id='v436-calendar';document.body.appendChild(el);document.body.classList.add('trts-calendar-open');renderCalendar();
};
window.v436CloseCalendar=()=>{const opener=cal?.opener;document.getElementById('v436-calendar')?.remove();cal=null;document.body.classList.remove('trts-calendar-open');if(opener?.isConnected)opener.focus()};
window.v436CalendarMove=delta=>{const d=new Date(Date.UTC(cal.year,cal.month+delta,1,12));if(d.getUTCFullYear()<1900||d.getUTCFullYear()>9999)return;cal.year=d.getUTCFullYear();cal.month=d.getUTCMonth();cal.cursor=iso(d);renderCalendar()};
window.v436CalendarMonth=value=>{cal.month=Number(value);cal.cursor=iso(new Date(Date.UTC(cal.year,cal.month,1,12)));renderCalendar(false)};
window.v436CalendarYear=value=>{const year=Number(value);if(!Number.isInteger(year)||year<1900||year>9999)return;cal.year=year;cal.cursor=iso(new Date(Date.UTC(year,cal.month,1,12)));renderCalendar(false)};
window.v436CalendarPick=value=>{cal.selected=cal.cursor=value;renderCalendar()};
window.v436CalendarToday=()=>{const d=new Date();cal.selected=cal.cursor=iso(d);cal.year=d.getUTCFullYear();cal.month=d.getUTCMonth();renderCalendar()};
window.v436CalendarDone=()=>{if(!cal?.input.isConnected)return v436CloseCalendar();const input=cal.input;input.value=cal.selected;document.querySelectorAll('[data-date-target]').forEach(b=>{if(b.dataset.dateTarget===input.id)b.querySelector('span:not(.v436-icon)').textContent=fmt(input.value)});input.dispatchEvent(new Event('change',{bubbles:true}));v436CloseCalendar()};
document.addEventListener('keydown',e=>{
 if(!cal)return;
 if(e.key==='Escape'){e.preventDefault();v436CloseCalendar();return}
 const dialog=document.querySelector('.v436-cal');
 if(e.key==='Tab'){const els=[...dialog.querySelectorAll('button:not([tabindex="-1"]),select,input')],first=els[0],last=els.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}return}
 if(!e.target.matches('[data-day]'))return;
 const step={ArrowLeft:-1,ArrowRight:1,ArrowUp:-7,ArrowDown:7}[e.key];if(step==null)return;e.preventDefault();const d=parse(cal.cursor);d.setUTCDate(d.getUTCDate()+step);cal.cursor=iso(d);cal.year=d.getUTCFullYear();cal.month=d.getUTCMonth();renderCalendar();
});
window.TRTS_UI={icon,dateField,validDate:valid,formatDate:fmt};
const style=document.createElement('style');style.textContent=`
:root{--tr-bg:#060e18;--tr-card:#0b1522;--tr-line:#1f3148;--tr-muted:#98a9bf;--tr-purple:#7545ff;--tr-green:#00d993}
body.pk-only{background:var(--tr-bg)!important;color:#f2f4fa}
.pk-only .wrap{max-width:780px!important;margin:0 auto!important;padding:10px 12px 86px!important}
.trts-route-view header.top,.trts-route-view #v43-period{display:none!important}
.pk-only .primary,.pk-only .v431-refresh{background:linear-gradient(135deg,#6940ec,#7547ff)!important;border-color:#855bff!important}
#trts-update{border:1px solid #303a48!important;background:#101c28!important;color:#eef2f8!important;border-radius:999px!important;padding:8px 11px!important;font-family:inherit;font-size:11px!important;font-weight:700;line-height:1.2;box-shadow:0 3px 14px #0004}
.v43-screen{padding:8px 0 70px;max-width:760px}
#v43-period{padding:0;max-width:760px}
.v436-icon{display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;flex:none;color:#8453ff}
.v436-icon svg{width:100%;height:100%}
.v436-route,.v436-address{background:linear-gradient(120deg,#0d1827,#09131f)!important;border:1px solid var(--tr-line)!important;border-radius:22px!important;padding:16px!important;box-shadow:none!important;margin-bottom:14px}
.v436-route.warn{border-color:#6e4351!important}
.v436-route-top{display:flex;gap:9px;align-items:center;flex-wrap:wrap;margin-bottom:12px;color:var(--tr-muted);font-size:12px}
.v436-route-id{color:#eef0ff;font-size:13px;font-weight:750;overflow-wrap:anywhere}
.v436-detail .v436-route-id{padding:7px 9px;background:#251a50;border-radius:9px}
.v436-route button{font-family:inherit}
.v436-change{display:flex;gap:6px;align-items:center;margin-left:auto;min-height:38px;border:1px solid var(--tr-line)!important;background:#101c2c!important;color:#f2f4fa;border-radius:10px!important;padding:7px 10px!important;font-size:12px}
.v436-change .v436-icon{color:#e2e8f4;width:16px;height:16px}
.v436-exp{display:flex;align-items:center;gap:12px;background:linear-gradient(110deg,#37248b,#2e1b63);border:1px solid #6d3fe2;border-radius:14px;padding:13px;margin-bottom:12px}
.v436-exp>.v436-icon{width:38px;height:38px;padding:8px;background:#4436c2;border-radius:11px;color:#f4f1ff}
.v436-exp>div{flex:1;min-width:0}
.v436-exp small{display:block;font-size:12px;color:#c5bfec;margin-bottom:4px}
.v436-exp b{display:block;font-size:18px;line-height:1.3;overflow-wrap:anywhere;color:#f6f3ff}
.v436-swap{display:grid;place-items:center;width:42px;height:42px;flex:none;border:0!important;border-radius:12px!important;background:linear-gradient(135deg,#7950ff,#5d2edc)!important;padding:9px!important;color:white}
.v436-swap .v436-icon{color:white}
.v436-route-fields{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:10px}
.v436-route-fields.compact{grid-template-columns:1fr}
.v436-field{display:flex;align-items:center;gap:10px;width:100%;min-width:0;border:1px solid var(--tr-line)!important;border-radius:14px!important;background:#091522!important;padding:13px!important;text-align:left;min-height:78px;color:#eff2fa}
.v436-field>span:not(.v436-icon){flex:1;min-width:0}
.v436-field>.v436-icon:first-child{width:35px;height:35px;padding:6px;background:#111f30;border-radius:10px}
.v436-field>.v436-icon:last-child:not(:first-child){width:14px;height:14px;color:var(--tr-muted)}
.v436-field small,.v436-metrics small,.v436-total small,.v436-finance small,.v436-business small{display:block;color:var(--tr-muted);font-size:11px;line-height:1.3;text-transform:uppercase;letter-spacing:.045em}
.v436-field b{display:block;font-size:16px;line-height:1.3;margin-top:5px;overflow-wrap:anywhere}
.v436-wave>.v436-icon:first-child{color:#25d2e9}
.v436-metrics{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));border:1px solid var(--tr-line);border-radius:14px;background:#091522;padding:10px 0;align-items:center}
.v436-metrics>div{padding:4px 12px;min-width:0}
.v436-metrics>div+div{border-left:1px solid var(--tr-line)}
.v436-metrics b{display:block;font-size:18px;margin-top:9px;overflow-wrap:anywhere;color:#f1f3fa}
.v436-total{margin-top:12px;background:#091522;border:1px solid var(--tr-line);border-radius:13px;padding:12px 14px}
.v436-total b{display:block;font-size:22px;color:var(--tr-green);margin-top:5px;font-weight:800}
.v436-finance{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:12px}
.v436-finance>div{background:#091522;border:1px solid var(--tr-line);border-radius:13px;padding:12px}
.v436-finance b{display:block;margin-top:6px;color:#bd9dff;font-size:18px}
.v436-detail-head{display:flex;gap:18px;align-items:center;margin:6px 0 20px}
.v436-detail-head .v43-back{display:grid;place-items:center;width:36px;height:44px;padding:5px;flex:none}
.v436-detail-head .v436-icon{color:white;width:28px;height:28px}
.v436-detail-head h2{font-size:26px;line-height:1.15;margin:0 0 5px;font-weight:800}
.v436-detail-head small{font-size:13px;letter-spacing:.035em;color:var(--tr-muted)}
.v436-address-title{display:flex;align-items:center;justify-content:space-between;gap:10px;margin:23px 0 13px}
.v436-address-title h3{margin:0;font-size:18px;text-transform:uppercase;letter-spacing:.01em}
.v436-address-title button{display:flex;align-items:center;gap:7px;min-height:40px;padding:8px 10px;border:1px solid #412a77;background:#0c1323;border-radius:11px;color:#9569ff;font-family:inherit;font-size:12px;font-weight:700;white-space:nowrap}
.v436-address-title .v436-icon{width:17px;height:17px}
.v436-address-head{display:flex;align-items:flex-start;gap:13px;width:100%;border:0;background:transparent;padding:0;text-align:left;color:#f1f3fa;cursor:pointer;font:inherit}
.v436-address-head>span:nth-child(2){flex:1;min-width:0}
.v436-number{display:grid;place-items:center;width:44px;height:44px;flex:none;border-radius:12px;background:linear-gradient(135deg,#7745ff,#542ecb);font-weight:800;font-size:20px}
.v436-address-head b{display:block;font-size:17px;line-height:1.3;overflow-wrap:anywhere}
.v436-address-head small{display:block;font-size:13px!important;line-height:1.45!important;letter-spacing:.01em;color:var(--tr-muted);margin-top:5px}
.v436-address-head>.v436-icon{width:16px;height:20px;margin-top:18px;color:var(--tr-muted)}
.v436-business{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:15px}
.v436-business>div{min-width:0;border:1px solid var(--tr-line);background:#091522;border-radius:13px;padding:12px}
.v436-business b{display:block;font-size:16px;line-height:1.35;margin-top:4px;overflow-wrap:anywhere}
.v436-point-metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;padding:12px 0 0;color:var(--tr-muted);font-size:10px}
.v436-point-metrics b{display:block;margin-top:4px;color:#f0f3fa;font-size:14px}
.v436-invoices{margin-top:14px;min-width:0}
.v436-invoice-label{font-size:12px;letter-spacing:.04em;text-transform:uppercase;color:var(--tr-muted);margin:0 3px 7px}
.v436-invoice-table{width:100%;border:1px solid var(--tr-line);border-radius:13px;border-spacing:0;overflow:hidden;background:#081320;table-layout:fixed}
.v436-invoice-table th,.v436-invoice-table td{text-align:left;padding:10px 10px;overflow-wrap:anywhere}
.v436-invoice-table th{font-size:10px;letter-spacing:.035em;text-transform:uppercase;color:var(--tr-muted);font-weight:500;padding-bottom:6px}
.v436-invoice-table td{font-size:14px;font-weight:700;color:#eef1f8}
.v436-invoice-table tbody tr+tr td{border-top:1px solid var(--tr-line)}
.v436-invoice-table th:first-child{width:36%}.v436-invoice-table th:nth-child(2){width:18%}.v436-invoice-table th:nth-child(3){width:20%}
.v436-invoice-table td:last-child{color:var(--tr-green)}
.v436-empty{font-size:12px;color:var(--tr-muted);margin:8px 0}
.v436-bottom{display:flex;align-items:center;justify-content:center;gap:10px;width:100%;padding:14px;border-radius:13px;border:0;color:white;font-size:15px;font-weight:750;margin-top:18px}
.v436-bottom .v436-icon{color:white}
.v431-block{padding:0!important;margin:0 0 8px!important;border:0!important}
.v431-block-head,.v431-courier-head{display:flex;align-items:center;justify-content:space-between;gap:8px;width:100%;padding:16px 2px!important;background:transparent!important;border:0!important;border-top:1px solid #172638!important;border-radius:0!important;color:#f0f3fa;text-align:left;min-height:54px}
.v431-block-head b,.v431-courier-head b{display:flex;align-items:center;gap:8px;font-size:15px;font-weight:750;line-height:1.4}
.v431-block-head>.v431-toggle-label,.v431-courier-head>.v431-toggle-label{font-size:22px;color:#a3b0c4}
.v431-courier-head small{margin-left:32px}
.v436-block-body{display:grid;gap:10px;padding:3px 0 10px}
.v436-block-body>.v43-head h2{display:none}
.v436-block-body>.v43-head{margin:0}
.v436-block-body .v43-actions{width:100%}
.v431-croute{padding:12px!important;border-color:var(--tr-line)!important;background:#091321!important}
.v436-courier-points{margin-top:15px}
.v436-courier-points .v436-address{padding:12px!important;margin-bottom:10px}
.v433-tariff-group .v436-invoice-table td{font-size:12px}.v433-tariff-group .v436-invoice-table th{font-size:9px}
.v436-date-button{display:flex!important;align-items:center;justify-content:space-between;gap:8px;width:100%;min-height:46px;background:#0b1726!important;border:1px solid var(--tr-line)!important;border-radius:11px!important;padding:10px!important;color:#f2f4fa!important;font-size:14px!important;font-weight:600!important;cursor:pointer;box-sizing:border-box}
.v436-date-button .v436-icon{width:18px;height:18px}.v436-date-button .v436-icon:last-child{width:12px;transform:rotate(90deg);color:#a7b5ca}
.v436-date-button>span:not(.v436-icon){flex:1;text-align:left;line-height:1.3}
.v43-custom>.v436-date-button{grid-column:auto}
.trts-calendar-open{overflow:hidden!important}.trts-calendar-open header.top,.trts-calendar-open #trts-update{visibility:hidden!important}
#v436-calendar{position:fixed;inset:0;z-index:300000;isolation:isolate}
.v436-cal-backdrop{position:absolute;inset:0;background:#000b;display:flex;align-items:center;justify-content:center;padding:16px}
.v436-cal{width:min(380px,100%);max-height:calc(100dvh - 32px);overflow:auto;box-sizing:border-box;background:linear-gradient(135deg,#101c2c,#081321);border:1px solid #35445f;border-radius:22px;padding:18px;box-shadow:0 20px 70px #0008;color:#eef2fb;font-family:inherit}
.v436-cal button,.v436-cal select,.v436-cal input{font:inherit;color:#eef2fb;background:#132135;border:1px solid #2d3c56;border-radius:10px;box-sizing:border-box}
.v436-cal button{cursor:pointer;min-height:40px}.v436-cal button:focus-visible{outline:2px solid #b591ff;outline-offset:2px}
.v436-cal-title{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:14px}.v436-cal-title h3{font-size:18px;margin:0}.v436-cal-title button{width:36px;font-size:24px;background:transparent;border:0}
.v436-cal-nav{display:grid;grid-template-columns:34px minmax(0,1fr) 72px 34px;gap:6px;align-items:center}.v436-cal-nav button{font-size:25px;padding:0}.v436-cal-nav select{padding:10px 4px;font-size:15px;min-width:0}.v436-cal-nav input{width:100%;font-size:15px;padding:10px 4px;text-align:center;appearance:textfield}.v436-cal-nav input::-webkit-inner-spin-button{appearance:none}
.v436-weekdays,.v436-cal-days{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:4px;text-align:center}
.v436-weekdays{margin:18px 0 9px;color:#9eacc0;font-size:12px}.v436-weekdays span:nth-last-child(-n+2){color:#aa86ff}
.v436-cal-days button{min-width:0;aspect-ratio:1;min-height:36px;padding:3px;border:1px solid transparent;background:transparent;font-size:15px}
.v436-cal-days button:hover{background:#263150}.v436-cal-days button.today{border-color:#6e4ebb}.v436-cal-days button.selected{background:linear-gradient(135deg,#7547fa,#5b2bd9);border-color:#9b74ff;font-weight:800}
.v436-cal-selected{padding:14px 0;color:#bb9aff;font-size:13px;text-align:center}
.v436-cal-actions{display:flex;gap:10px;justify-content:space-between;border-top:1px solid #24324a;padding-top:12px}.v436-cal-actions button{padding:10px 18px;font-weight:700}
@media(max-width:480px){.v436-route,.v436-address{padding:13px!important;border-radius:18px!important}.v436-route-fields{gap:7px}.v436-field{padding:10px!important;gap:7px;min-height:80px}.v436-field>.v436-icon:first-child{width:25px;height:29px;padding:3px}.v436-field b{font-size:14px}.v436-field small,.v436-metrics small{font-size:9px}.v436-metrics>div{padding:3px 7px}.v436-metrics b{font-size:14px}.v436-exp{gap:9px;padding:11px}.v436-exp>.v436-icon{width:31px;height:35px;padding:6px}.v436-exp b{font-size:16px}.v436-exp small{font-size:11px}.v436-swap{width:36px;height:39px;padding:8px!important}.v436-change{font-size:10px;padding:6px 8px!important}.v436-route-top{font-size:10px}.v436-route-id{font-size:11px}.v436-address-title h3{font-size:16px}.v436-address-title button{font-size:10px;padding:7px}.v436-number{width:36px;height:39px;font-size:18px}.v436-address-head{gap:10px}.v436-address-head b{font-size:16px}.v436-address-head small{font-size:12px!important}.v436-business>div{padding:10px}.v436-business b{font-size:14px}.v436-invoice-table th,.v436-invoice-table td{padding:9px 7px}.v436-invoice-table th{font-size:8px}.v436-invoice-table td{font-size:12px}.v436-total b{font-size:21px}.v436-courier-points .v436-address{padding:10px!important}.v436-courier-points .v436-invoice-table td{font-size:11px}}
@media(max-width:350px){.v436-route-fields:not(.compact){grid-template-columns:1fr}.v436-cal{padding:12px}.v436-cal-backdrop{padding:10px}.v436-cal-nav{grid-template-columns:30px minmax(0,1fr) 65px 30px}.v436-date-button{font-size:12px!important}}
`;document.head.appendChild(style);
})();
