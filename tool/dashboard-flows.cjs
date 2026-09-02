const assert=require('node:assert/strict');
module.exports=async({page,capture})=>{
 await page.evaluate(async()=>{
  const d=new Date().toISOString().slice(0,10),previous=TRTS_PERIODS.days(d,-1);
  db.routes.push({...db.routes[0],id:999,route_delivery_id:'PREVIOUS',route_date:previous});
  db.route_points.push({...db.route_points[0],id:9990,route_id:999});
  db.route_facts.push({id:999,route_id:999,tariff:600,carrier_name:'ФОП Діденко'});
  db.source_documents.push({...db.source_documents[0],id:99900,route_delivery_id:'PREVIOUS',document_date:previous});
  await v441LoadPeriod(d,d,'day');v442Nav('dashboard');
 });
 await page.locator('[data-summary=local]').waitFor();
 const state=()=>page.evaluate(()=>({data:JSON.stringify(D),meta:JSON.stringify(TRTS_OPS.meta()),finance:JSON.stringify(TRTS_FINANCE.snapshot()),costs:D.routes.map(r=>TRTS_OPS.metrics(r).cost)}));
 const initial=await state();
 const report=await page.evaluate(async()=>{const x=await TRTS_DASHBOARD.reports();return{current:TRTS_ANALYTICS.total(x.current.lines.filter(l=>l.kind==='local')),previous:TRTS_ANALYTICS.total(x.previous.lines.filter(l=>l.kind==='local'))}});
 assert.equal(report.previous.cost,600);assert.equal(report.previous.tt,1);assert.equal(report.current.cost,650);assert.equal(report.current.tt,6);
 const chartParity=async()=>{
  const info=await page.evaluate(()=>TRTS_GRAPH_DASHBOARD.snapshot());
  for(const key of info.kind==='replen'?['pallets','cost','costPal']:['tt','pallets','sales','cost','costTT','log']){
   const val=key==='costPal'?(info.totals.pallets?info.totals.cost/info.totals.pallets:null):info.totals[key];
   assert.equal(await page.locator('[data-kpi='+key+']').getAttribute('data-value'),String(val??''),'All chart totals use reporting core: '+key);
  }
  assert.equal(await page.locator('.v443-overview,.v442-metric-card,table').count(),0,'Dashboard has charts, not Analytics KPI cards or tables');
  const plot=page.locator('.v445-plot').first();await plot.focus();await plot.press('ArrowRight');assert.ok(await plot.locator('.v445-tooltip').isVisible());await plot.press('Escape');await page.evaluate(()=>scrollTo(0,0));
 };
 for(const theme of ['dark','light']){
  await page.evaluate(theme=>{document.documentElement.dataset.theme=theme;v442Nav('dashboard')},theme);await page.locator('[data-summary=local]').waitFor();
  assert.equal(await page.locator('[data-chart]').count(),1);await chartParity();await capture('v446-'+theme+'-overall');
  await page.locator('[data-summary=local]').click();await chartParity();await capture('v446-'+theme+'-local');
  // Full connected business -> branch -> carrier -> section -> zone path.
  for(const [key,name] of [['business','HoReCa'],['branch','Львів'],['carrier','STV'],['section','STV'],['zone','Зона 1']]){
   await page.evaluate(k=>(v445Axis(k),document.querySelector('.v446-explore').open=true),key);
   await page.locator('.v445-ranks button').filter({hasText:name}).first().click();
   await chartParity();
  }
  assert.equal((await page.evaluate(()=>TRTS_GRAPH_DASHBOARD.snapshot())).totals.cost,150);
  await capture('v446-'+theme+'-stv-zone');
  for(const key of ['routeId','pointId']){await page.evaluate(k=>(v445Axis(k),document.querySelector('.v446-explore').open=true),key);await page.locator('.v445-ranks button').first().click();await chartParity()}
  assert.equal(await page.locator('.v445-ranks button').count(),0,'Last graphical TT level has no dead links');
  await page.evaluate(()=>v445Crumb(-1));await page.locator('[data-summary=local]').click();await page.evaluate(()=>(v445Axis('section'),document.querySelector('.v446-explore').open=true));await page.locator('.v445-ranks button').filter({hasText:/^SAV/}).click();await chartParity();await page.evaluate(()=>(v445Axis('zone'),document.querySelector('.v446-explore').open=true));await page.locator('.v445-ranks button').filter({hasText:'Без зони'}).click();await chartParity();
  await page.evaluate(()=>v445Crumb(-1));await page.locator('[data-summary=courier]').click();
  assert.equal(await page.locator('.v445-axes [aria-pressed=true]').innerText(),'Перевізники');
  await page.evaluate(()=>document.querySelector('.v446-explore').open=true);await page.locator('.v445-ranks button').filter({hasText:'Нова Пошта'}).click();await chartParity();await page.evaluate(()=>(v445Axis('business'),document.querySelector('.v446-explore').open=true));await page.locator('.v445-ranks button').filter({hasText:'HoReCa'}).click();await page.evaluate(()=>(v445Axis('branch'),document.querySelector('.v446-explore').open=true));await page.locator('.v445-ranks button').filter({hasText:'Київ'}).click();await chartParity();await capture('v446-'+theme+'-courier');
  await page.evaluate(()=>v445Crumb(-1));await page.locator('[data-summary=replen]').click();
  assert.equal(await page.locator('[data-chart]').count(),1);assert.equal(await page.locator('[data-kpi=log],[data-kpi=costTT]').count(),0);
  await page.evaluate(()=>document.querySelector('.v446-explore').open=true);await page.locator('.v445-ranks button').filter({hasText:'Львів'}).click();await chartParity();assert.equal(await page.locator('[data-kpi=costPal]').getAttribute('data-value'),'200');await capture('v446-'+theme+'-replen');
 }
 assert.deepEqual(await state(),initial,'All themes/drilldowns are read-only: previous reads never mutate operational or finance state');
 await page.evaluate(()=>{document.documentElement.dataset.theme='dark';v442Nav('analytics')});await page.locator('[data-summary=courier]').waitFor();assert.equal(await page.locator('[data-chart]').count(),0);
 await page.locator('[data-summary=courier] .v443-overview-title').click();await page.getByRole('button',{name:'Нова Пошта',exact:false}).click();assert.match(await page.locator('#view').innerText(),/Бізнеси/);
 for(const mode of ['week','month','half','year','custom']){
  await page.evaluate(async m=>{const d=new Date().toISOString().slice(0,10),p=m==='custom'?{from:TRTS_PERIODS.days(d,-8),to:d}:TRTS_PERIODS.range(m,d);await v441LoadPeriod(p.from,p.to,m);v442Nav('dashboard')},mode);
  await page.locator('[data-summary=local]').waitFor();assert.equal(await page.locator('[data-chart]').count(),1);await chartParity();
 }
 for(const width of [320,390,760]){await page.setViewportSize({width,height:844});for(const theme of ['dark','light']){await page.evaluate(t=>document.documentElement.dataset.theme=t,theme);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'Dashboard overflow '+width+' '+theme)}}
 await page.setViewportSize({width:390,height:844});await page.evaluate(()=>document.documentElement.dataset.theme='dark');await capture('v446-period-trends');
 console.log('PASS v44.6 compact executive + varied graphs and all drill levels in both themes, SAV/STV full metrics, carrier dimension, courier/replenishment, accessible tooltips, previous period financial parity, every period mode, 320/390/760 responsive');
};
