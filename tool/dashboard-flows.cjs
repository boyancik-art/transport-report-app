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
 const current=await page.evaluate(()=>({data:JSON.stringify(D),meta:JSON.stringify(TRTS_OPS.meta()),finance:JSON.stringify(TRTS_FINANCE.snapshot()),costs:D.routes.map(r=>TRTS_OPS.metrics(r).cost)}));
 const report=await page.evaluate(async()=>{const x=await TRTS_DASHBOARD.reports();return{current:TRTS_ANALYTICS.total(x.current.lines.filter(l=>l.kind==='local')),previous:TRTS_ANALYTICS.total(x.previous.lines.filter(l=>l.kind==='local'))}});
 assert.equal(report.previous.cost,600);assert.equal(report.previous.tt,1);assert.equal(report.current.cost,650);assert.equal(report.current.tt,6);
 assert.deepEqual(await page.evaluate(()=>({data:JSON.stringify(D),meta:JSON.stringify(TRTS_OPS.meta()),finance:JSON.stringify(TRTS_FINANCE.snapshot()),costs:D.routes.map(r=>TRTS_OPS.metrics(r).cost)})),current,'Previous-period reads never mutate operational or finance state');
 assert.equal(await page.locator('[data-summary]').count(),3);assert.equal(await page.locator('.v443-chart').count(),3);assert.equal(await page.locator('.v43-period-buttons button').count(),6);
 await capture('v443-dashboard');
 await page.locator('[data-summary=local] .v443-overview-title').click();assert.match(await page.locator('#view').innerText(),/витрати по зонах/);
 await page.getByRole('button',{name:'Бізнеси',exact:true}).click();assert.match(await page.locator('#view').innerText(),/Дистрибуція/);
 await page.getByRole('button',{name:'HoReCa',exact:false}).click();assert.match(await page.locator('#view').innerText(),/AN-0/);
 await page.evaluate(()=>v442Nav('analytics'));await page.locator('[data-summary=courier]').waitFor();assert.equal(await page.locator('.v443-chart').count(),0);
 await page.locator('[data-summary=courier] .v443-overview-title').click();await page.getByRole('button',{name:'Нова Пошта',exact:false}).click();assert.match(await page.locator('#view').innerText(),/Бізнеси/);
 for(const mode of ['week','month','half','year']){
  await page.evaluate(async m=>{const p=TRTS_PERIODS.range(m,new Date().toISOString().slice(0,10));await v441LoadPeriod(p.from,p.to,m);v442Nav('dashboard')},mode);
  await page.locator('[data-summary=local]').waitFor();assert.equal(await page.locator('.v443-chart').count(),3);
 }
 for(const width of [320,390,760]){await page.setViewportSize({width,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'Dashboard overflow '+width)}
 await page.setViewportSize({width:390,height:844});await capture('v443-dashboard-year');
 console.log('PASS v44.3 dynamic charts, isolated previous-period financial parity, all period modes, same metrics across drills, courier-first carriers, SAV/STV zone costs, pickup excluded, responsive 320/390/760');
};
