/* Display adapters only. No tariff or allocation calculation is performed here. */
(()=>{
 const O=TRTS_OPS,E=O.E,T=x=>String(x??'').trim();
 function coverage(r){return ['sav','stv'].includes(O.sectionKey(r))?[...new Set(O.points(r).map(p=>TRTS_FINANCE.quote(r,p)?.branch).filter(Boolean))].join(' / ')||'Не визначено':TRTS_APP.routeBranch(r)}
 function tariff(r){
  const key=O.sectionKey(r),f=O.facts(r);if(key==='pickup')return'';
  const carrier=key==='courier'?v439CourierDefault(r):f.carrier_name;
  let label='Тариф',value='',more='';
  if(TRTS_COSTS.own(carrier))value='0 ₴ · власний парк';
  else if(['sav','stv'].includes(key)){
   const month=r.route_date.slice(0,7)+'-01',rate=TRTS_FINANCE.snapshot().state.rates.find(x=>x.carrier===key.toUpperCase()&&x.month===month),zones=[...new Set(O.points(r).map(p=>TRTS_FINANCE.quote(r,p)?.zone).filter(Boolean))].sort();
   label='Зональний тариф · '+month.slice(0,7);
   if(!rate)value='Не задано за цей місяць';
   else{
    value=(rate.tt_fixed==null?'Не задано':O.M2(rate.tt_fixed))+' / ТТ + за палету';
    more=(zones.length?zones:[1,2,3,4,5]).map(z=>'Зона '+z+': '+(rate['zone'+z]==null?'не задано':O.M2(rate['zone'+z])+'/пал.')).join(' · ');
   }
  }else if(key==='courier'){
   const c=TRTS_COURIER.snapshot(),links=c.links.filter(l=>+l.route_id===+r.id),ids=[...new Set(links.map(x=>String(x.shipment_id)))];
   const tariffs=ids.map(id=>c.links.filter(l=>String(l.shipment_id)===id).reduce((s,l)=>s+Number(l.delivery_cost||0),0));
   label='Тариф ТТ / спільних груп';
   value=!tariffs.length?'Не задано':tariffs.length===1?O.M2(tariffs[0]):O.M2(Math.min(...tariffs))+' – '+O.M2(Math.max(...tariffs))+' · '+tariffs.length+' груп';
   if(tariffs.length>1)more=tariffs.map((n,i)=>'Група '+(i+1)+': '+O.M2(n)).join(' · ');
  }else{
   const group=f.tariff_group_id&&O.meta().groups.find(g=>String(g.id)===String(f.tariff_group_id));
   if(group)label='Спільний тариф';
   const amount=group?group.tariff:f.corrected_tariff??f.tariff;
   value=f.tariff_unknown||amount==null?'Не задано':O.M2(amount);
  }
  return '<div class="v446-tariff" data-route-tariff><span>'+E(label)+'</span><b>'+E(value)+'</b>'+(more?'<details onclick="event.stopPropagation()"><summary>Ставки</summary><small>'+E(more)+'</small></details>':'')+'</div>';
 }
 function analyticsCard(group){
  const id=String(group.name),r=O.dat().routes.find(r=>String(r.id)===id);
  if(!r){const manual=O.meta().manual.find(r=>'m:'+r.id===id);return manual?O.manualCard(manual):'<p class="v43-empty">Маршрут недоступний</p>'}
  return '<div class="v446-analytics-route">'+v436RouteCard(r).replace('onclick="v43OpenRoute('+r.id+')"','onclick="v446AnalyticsRoute('+r.id+')"')+'<small class="v446-slice-note">Картка показує маршрут цілком. У вибраному зрізі: '+O.F(group.tt)+' ТТ · '+O.M2(group.cost)+' витрат.</small></div>';
 }
 window.v446AnalyticsRoute=id=>{TRTS_NAVIGATION.reportReturn(()=>TRTS_DASHBOARD.show());v43OpenRoute(id)};
 window.TRTS_UI446={coverage,tariff,analyticsCard};
})();
