(()=>{
const fmt=s=>{const m=String(s||'').match(/^(\d{4})-(\d{2})-(\d{2})$/);return m?`${m[3]}.${m[2]}.${m[1]}`:String(s||'')};
function clean(){
 const old=document.querySelector('#v43-period');if(old)old.style.display='none';
 const view=document.getElementById('view')||document.getElementById('content');if(!view)return;
 const screen=view.querySelector('.v43-screen');if(screen){screen.querySelectorAll('.v43-head small').forEach(x=>{if(/Реальні дані/i.test(x.textContent||''))x.style.display='none'})}
 const date=document.querySelector('input[type="date"]');
 const legacy=[...document.querySelectorAll('div,span,small')].find(x=>/Реальні дані\s*[·•]/i.test(x.textContent||'')&&/маршрут/i.test(x.textContent||'')&&x.children.length===0);
 if(legacy){legacy.textContent=legacy.textContent.replace(/(\d{4})-(\d{2})-(\d{2})/g,(_,y,m,d)=>`${d}.${m}.${y}`);legacy.classList.add('v431-realdata')}
 const upd=[...document.querySelectorAll('button')].find(x=>/^Оновити$/i.test((x.textContent||'').trim()));if(upd)upd.classList.add('v431-refresh');
 if(date){date.setAttribute('lang','uk-UA');date.classList.add('v431-date')}
 const b=document.getElementById('trts-update');if(b)b.textContent='TEST · v43.1';
}
const css=`.v431-refresh{background:linear-gradient(135deg,#7040ff,#994cff)!important;border-color:#8552ff!important;color:#fff!important}.v431-realdata{background:#111925!important;color:#c7b5ff!important;border:1px solid #30394a!important;border-radius:12px!important;box-shadow:none!important}.v431-date{color-scheme:dark}.v43-head>div>small{display:none!important}`;
let s=document.createElement('style');s.textContent=css;document.head.appendChild(s);
new MutationObserver(()=>setTimeout(clean,0)).observe(document.body,{childList:true,subtree:true});setTimeout(clean,250);
})();