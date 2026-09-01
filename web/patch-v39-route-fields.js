(()=>{
 const txt=v=>String(v??'').trim();
 const cov=r=>(window.rules?.[txt(r?.expeditor_name)]||window.TRTS_V39_EXPEDITOR_COVERAGE?.[txt(r?.expeditor_name)]||'');
 const secOf=r=>{const c=cov(r);if(c==='STV'||c==='SAV')return c;if(c==='ФОП'||c==='TS')return'ФОП/TS';if(['Пекарня','Фреш','TS/Пекарня'].includes(c))return'Пекарня/Фреш';if(c==="Кур'єр"||c==='Кур’єр')return'Кур’єрські відправлення';if(c==='Самовивіз')return'Самовивози';return'База'};
 const wh=r=>txt(r?.warehouse)||'—';
 const reg=r=>{const s=secOf(r),w=wh(r),e=txt(r?.expeditor_name);if(/Київ/i.test(w)||/м\.?\s*Київ/i.test(e))return'Київ';if(s==='SAV'){if(/Біл.*Церк/i.test(e))return'Білоцерківський район';if(/Уман/i.test(e))return'Уманський район'}return'—'};
 function extra(root,r){let box=root.querySelector('.v39-extra-route');if(!box){box=document.createElement('div');box.className='grid39 v39-extra-route';const exp=root.querySelector('.exp39');if(exp)exp.insertAdjacentElement('afterend',box)}box.innerHTML=`<div class="mini39"><label>Склад відвантаження</label><b>${wh(r)}</b></div><div class="mini39"><label>Регіон покриття</label><b>${reg(r)}</b></div>`}
 function clean(root,r){const exp=root.querySelector('.exp39 b');if(exp)exp.textContent=txt(r.expeditor_name)||'—';extra(root,r);const s=secOf(r);if(['STV','SAV','Самовивози','Кур’єрські відправлення'].includes(s)){root.querySelectorAll('.mini39').forEach(x=>{const l=txt(x.querySelector('label')?.textContent);if(['Водій','Авто','Хвиля'].includes(l))x.remove()});const wave=root.querySelector('.wave39');if(wave)wave.style.display='none';}}
 function list(){const cards=[...document.querySelectorAll('.route39')];for(const card of cards){const id=card.getAttribute('onclick')?.match(/v39Route\((\d+)\)/)?.[1];const r=(window.D?.routes||[]).find(x=>+x.id===+id);if(r)clean(card,r)}}
 const oldLog=window.logistics;if(typeof oldLog==='function')window.logistics=function(){const x=oldLog();setTimeout(list,0);return x};
 const oldRoute=window.v39Route;if(typeof oldRoute==='function')window.v39Route=function(id){const x=oldRoute(id);setTimeout(()=>{const r=(window.D?.routes||[]).find(a=>+a.id===+id),card=document.querySelector('.route39');if(r&&card)clean(card,r)},0);return x};
 const obs=new MutationObserver(()=>setTimeout(list,0));obs.observe(document.getElementById('view')||document.body,{childList:true,subtree:true});
 setTimeout(list,100);
})();