(()=>{
  const tabHost=document.getElementById('tabs');
  const refreshBtn=document.querySelector('.iconbtn');
  const choiceHost=document.getElementById('choices');
  const state={warehouse:'',expeditor:'',sort:'date'};
  const baseByBlock=byBlock;

  const style=document.createElement('style');
  style.textContent=`
  .top{flex-wrap:wrap}.datebox{flex-wrap:wrap;justify-content:flex-end}.period-wrap{width:100%;display:grid;grid-template-columns:1fr 1fr auto;gap:7px;margin-top:-3px;margin-bottom:10px}.period-wrap label{font-size:9px;color:#8f9aac}.period-wrap input{width:100%;border:1px solid #222c38;border-radius:11px;background:#0e141b;color:#fff;padding:9px 8px;font-size:11px}.period-apply{border:1px solid #334254;border-radius:11px;background:#151d27;color:#fff;padding:0 12px;font-weight:800}.v2modal{position:fixed;inset:0;background:#000b;display:grid;align-items:end;z-index:120}.v2modal.hide{display:none}.v2sheet{width:min(560px,100%);margin:auto;background:#111821;border:1px solid #283443;border-radius:24px 24px 0 0;padding:18px 16px calc(22px + env(safe-area-inset-bottom));max-height:88vh;overflow:auto}.v2sheet h3{margin:0 0 12px}.v2field{margin:9px 0}.v2field label{display:block;font-size:10px;color:#8f9aac;margin-bottom:5px}.v2field input,.v2field select{width:100%;padding:11px;border-radius:11px;border:1px solid #273443;background:#0c1218;color:#fff}.v2actions{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:13px}.v2primary{border:0;border-radius:11px;padding:11px;background:linear-gradient(135deg,#5974ff,#6739d9);color:#fff;font-weight:900}.v2secondary{border:1px solid #2b3745;border-radius:11px;padding:11px;background:#0c1218;color:#dce2eb}.route{cursor:pointer}.detail-head{display:flex;justify-content:space-between;gap:10px;align-items:flex-start}.detail-head h3{font-size:20px;margin:0}.detail-code{font-size:10px;color:#8f9aac;margin-top:4px}.detail-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin:14px 0}.detail-kpi{border:1px solid #25313f;border-radius:12px;background:#0c1218;padding:10px}.detail-kpi small{display:block;color:#8f9aac;font-size:9px}.detail-kpi b{display:block;margin-top:4px}.point-list{display:grid;gap:7px}.point-row{border:1px solid #24303d;border-radius:12px;padding:10px;background:#0b1117}.point-row b{font-size:12px}.point-row span{display:block;color:#909bab;font-size:10px;margin-top:4px}
  `;
  document.head.appendChild(style);

  const period=document.createElement('div');
  period.className='period-wrap';
  period.innerHTML='<div><label>Від</label><input id="dayFrom" type="date"></div><div><label>До</label><input id="dayTo" type="date"></div><button class="period-apply" id="periodApply">Показати</button>';
  document.querySelector('.tabs')?.before(period);

  const modal=document.createElement('div');
  modal.className='v2modal hide';modal.id='v2modal';modal.innerHTML='<div class="v2sheet" id="v2sheet"></div>';
  document.body.appendChild(modal);
  modal.addEventListener('click',e=>{if(e.target===modal)modal.classList.add('hide')});

  function fmtDate(d){return d||''}
  function openModal(html){document.getElementById('v2sheet').innerHTML=html;modal.classList.remove('hide')}
  function closeModal(){modal.classList.add('hide')}
  window.closeV2Modal=closeModal;

  byBlock=function(name){
    let arr=baseByBlock(name);
    if(state.warehouse)arr=arr.filter(r=>String(r.warehouse||'')===state.warehouse);
    if(state.expeditor){const q=norm(state.expeditor);arr=arr.filter(r=>norm(r.expeditor_name).includes(q))}
    arr=[...arr];
    if(state.sort==='exp')arr.sort((a,b)=>String(a.expeditor_name||'').localeCompare(String(b.expeditor_name||''),'uk'));
    else if(state.sort==='tt')arr.sort((a,b)=>routePoints(b.id).length-routePoints(a.id).length);
    else if(state.sort==='pal')arr.sort((a,b)=>routePoints(b.id).reduce((s,x)=>s+(+x.pallets||0),0)-routePoints(a.id).reduce((s,x)=>s+(+x.pallets||0),0));
    else arr.sort((a,b)=>String(a.route_date||'').localeCompare(String(b.route_date||''))||String(a.route_delivery_id||'').localeCompare(String(b.route_delivery_id||'')));
    return arr;
  };

  load=async function(){
    try{
      let from=document.getElementById('dayFrom')?.value||document.getElementById('day')?.value;
      let to=document.getElementById('dayTo')?.value||from;
      if(!from)from=to;if(!to)to=from;if(from>to){const x=from;from=to;to=x}
      if(document.getElementById('day'))document.getElementById('day').value=from;
      [routes,rules,manual]=await Promise.all([
        api('/rest/v1/routes?select=id,route_date,route_delivery_id,expeditor_name,warehouse,total_points,total_documents,total_weight,total_pallets,total_order_amount&route_date=gte.'+from+'&route_date=lte.'+to+'&order=route_date,route_delivery_id'),
        api('/rest/v1/transport_expeditor_rules?select=expeditor_name,coverage,target_block&is_active=eq.true'),
        api('/rest/v1/manual_transport_entries?select=*&entry_date=gte.'+from+'&entry_date=lte.'+to+'&order=entry_date,created_at')
      ]);
      let ids=routes.map(x=>x.id),q=ids.length?encodeURIComponent('('+ids.join(',')+')'):'';
      points=ids.length?await api('/rest/v1/route_points?select=id,route_id,customer_name,weight,pallets,order_amount&route_id=in.'+q):[];
      render();
      const dbg=document.getElementById('debug');if(dbg)dbg.textContent='Період '+from+' — '+to+' · '+routes.length+' маршрутів';
    }catch(e){content.innerHTML='<div class="empty">'+E(e.message)+'</div>'}
  };

  if(tabHost){
    tabHost.addEventListener('click',e=>{
      const btn=e.target.closest('.tab');if(!btn)return;e.preventDefault();
      const label=btn.querySelector('b')?.textContent?.trim();if(!label)return;active=label;render();
    });
  }

  if(refreshBtn){
    refreshBtn.removeAttribute('onclick');
    refreshBtn.addEventListener('click',async e=>{e.preventDefault();refreshBtn.disabled=true;const prev=refreshBtn.textContent;refreshBtn.textContent='…';try{await load()}finally{refreshBtn.disabled=false;refreshBtn.textContent=prev||'↻'}});
  }

  document.getElementById('periodApply')?.addEventListener('click',load);

  const initPeriod=()=>{const d=document.getElementById('day')?.value;if(d){if(!dayFrom.value)dayFrom.value=d;if(!dayTo.value)dayTo.value=d}};
  setTimeout(initPeriod,150);

  const originalOpenSheet=window.openSheet;
  window.openSheet=function(id){
    selected=routes.find(r=>Number(r.id)===Number(id));if(!selected)return;
    sheetExp.textContent=selected.expeditor_name||'Невідомий експедитор';
    const blocks=['STV','SAV','ФОП','Курʼєрські','Поповнення філій','Пекарня/Фреш','Самовивіз'];
    choices.innerHTML='';blocks.forEach(name=>{const b=document.createElement('button');b.type='button';b.className='choice';b.textContent=name;b.addEventListener('click',()=>saveRule(name));choices.appendChild(b)});sheet.classList.remove('hide');
  };

  function openFilter(){
    const wh=[...new Set(routes.map(r=>r.warehouse).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'uk'));
    openModal('<h3>Фільтр маршрутів</h3><div class="v2field"><label>Склад</label><select id="vfWh"><option value="">Усі склади</option>'+wh.map(x=>'<option value="'+E(x)+'" '+(x===state.warehouse?'selected':'')+'>'+E(x)+'</option>').join('')+'</select></div><div class="v2field"><label>Експедитор</label><input id="vfExp" value="'+E(state.expeditor)+'" placeholder="Пошук за експедитором"></div><div class="v2actions"><button class="v2secondary" id="vfReset">Скинути</button><button class="v2primary" id="vfApply">Застосувати</button></div>');
    vfApply.onclick=()=>{state.warehouse=vfWh.value;state.expeditor=vfExp.value.trim();closeModal();render()};
    vfReset.onclick=()=>{state.warehouse='';state.expeditor='';closeModal();render()};
  }
  function openSort(){
    openModal('<h3>Сортування</h3><div class="v2field"><label>Порядок</label><select id="vsSort"><option value="date">Дата / маршрут</option><option value="exp">Експедитор</option><option value="tt">ТТ — більше спочатку</option><option value="pal">Палети — більше спочатку</option></select></div><div class="v2actions"><button class="v2secondary" onclick="closeV2Modal()">Скасувати</button><button class="v2primary" id="vsApply">Застосувати</button></div>');
    vsSort.value=state.sort;vsApply.onclick=()=>{state.sort=vsSort.value;closeModal();render()};
  }
  function openRoute(r){
    const p=routePoints(r.id),pal=p.reduce((s,x)=>s+(+x.pallets||0),0),weight=p.reduce((s,x)=>s+(+x.weight||0),0),sales=p.reduce((s,x)=>s+(+x.order_amount||0),0);
    openModal('<div class="detail-head"><div><h3>'+E(r.expeditor_name||'Без експедитора')+'</h3><div class="detail-code">Маршрут '+E(r.route_delivery_id||r.id)+' · '+E(r.route_date||'')+'</div></div><button class="v2secondary" onclick="closeV2Modal()">×</button></div><div class="wh" style="margin-top:9px">'+E(r.warehouse||'—')+'</div><div class="detail-grid"><div class="detail-kpi"><small>ТТ</small><b>'+p.length+'</b></div><div class="detail-kpi"><small>Палети</small><b>'+N(pal)+'</b></div><div class="detail-kpi"><small>Вага</small><b>'+N(weight)+' кг</b></div><div class="detail-kpi"><small>Сума</small><b>'+M(sales)+'</b></div></div><h3 style="font-size:14px">Точки маршруту</h3><div class="point-list">'+(p.length?p.map((x,i)=>'<div class="point-row"><b>'+(i+1)+'. '+E(x.customer_name||'Без назви')+'</b><span>'+N(x.pallets)+' пал. · '+N(x.weight)+' кг · '+M(x.order_amount)+'</span></div>').join(''):'<div class="empty">Точки не знайдені</div>')+'</div>');
  }

  document.getElementById('content')?.addEventListener('click',e=>{
    const btn=e.target.closest('button.ghost');
    if(btn){const t=btn.textContent.trim().toLowerCase();if(t.includes('фільтр')){e.preventDefault();openFilter();return}if(t.includes('сорт')){e.preventDefault();openSort();return}}
    if(e.target.closest('.assign'))return;
    const card=e.target.closest('.route');if(!card)return;
    const code=card.querySelector('.code')?.textContent?.trim();
    const exp=card.querySelector('.exp')?.textContent?.trim();
    let r=routes.find(x=>String(x.route_delivery_id||x.id)===code)||routes.find(x=>String(x.expeditor_name||'').trim()===exp);
    if(r)openRoute(r);
  });

  document.getElementById('day')?.addEventListener('change',e=>{dayFrom.value=e.target.value;dayTo.value=e.target.value;load()});
})();