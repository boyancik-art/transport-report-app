const assert=require('node:assert/strict');
module.exports=async({page,capture})=>{
 await page.evaluate(async()=>{
  const day=new Date().toISOString().slice(0,10),month=day.slice(0,7);
  Object.assign(TRTS_V39_EXPEDITOR_COVERAGE,{AN_FOP:'ФОП',AN_BAK:'Пекарня',AN_COURIER:'Кур’єр',AN_STV:'STV',AN_SAV:'SAV',AN_PICKUP:'Самовивіз'});
  db.routes=['AN_FOP','AN_BAK','AN_COURIER','AN_STV','AN_SAV','AN_PICKUP','UNCLASSIFIED'].map((expeditor_name,i)=>({id:500+i,route_delivery_id:'AN-'+i,expeditor_name,warehouse:i===1?'Львів STV':i===2?'Чайки Ecol':'Київ TS',route_date:day}));
  db.route_points=db.routes.map((r,i)=>({id:5000+i,route_id:r.id,customer_id:'AN-C'+i,location_id:500+i,customer_name:'Аналітика ТТ '+i,documents_count:1}));
  db.locations=db.routes.map((r,i)=>({id:500+i,address_id:'AN-A'+i,region:'Львівська',district:i===4?'Невідомий район':'Львівський'}));
  db.source_documents=db.routes.map((r,i)=>({id:50000+i,route_delivery_id:r.route_delivery_id,document_date:day,customer_id:'AN-C'+i,address_id:'AN-A'+i,sale_code:'AN-INV'+i,pallets:1,bottles:10,weight:100,order_amount:1000,business_unit:i===1?'Крафт':'HoReCa'}));
  db.source_documents.push({...db.source_documents[0],id:59999,sale_code:'AN-MIXED',business_unit:'Підрозділ ОПТ у м. Київ'});db.route_points[0].documents_count=2;
  db.route_facts=[{id:500,route_id:500,carrier_name:'ФОП Діденко',tariff:300},{id:501,route_id:501,carrier_name:'ФОП Різун',tariff:200},{id:502,route_id:502,carrier_name:'Нова Пошта'},{id:505,route_id:505,carrier_name:'ФОП Діденко',tariff:9999}];
  db.route_extra_points=[{id:555,route_id:500,tt_count:2,name:'Додаткові',point_type:'extra_tt',pallets:0,bottles:0,weight:0}];db.fop_manual_routes=[];db.tariff_groups=[];db.fleet_cost_entries=[];db.route_business_allocations=[];
  db.courier_shipments=[{id:700,shipment_date:day,carrier_name:'Нова Пошта',created_at:day}];db.courier_shipment_points=[{id:701,shipment_id:700,route_id:502,route_point_id:5002,delivery_cost:80}];
  db.transport_delivery_coverage=[{id:'an-zone',carrier:'STV',region:'Львівська',district:'Львівський',branch:'Львів',zone:1,active:true}];
  db.transport_monthly_rates=[{id:'an-rate',carrier:'STV',month:month+'-01',tt_fixed:100,zone1:50,zone2:60,zone3:70,zone4:80,zone5:90}];
  db.branch_replenishments=[{id:600,shipment_date:day,receiver_warehouse:'Львів STV',sender_warehouses:['Чайки STV'],pallets:2,tariff:400,carrier_name:'ФОП Діденко'},{id:601,shipment_date:day,receiver_warehouse:'Київ TS',sender_warehouses:['Львів STV'],pallets:3,tariff:300,carrier_name:'ФОП Різун'}];
  await v43SetPeriod('today');v442Nav('routes');
 });
 await page.locator('#v431-courier').waitFor({state:'attached'});
 const before=await page.evaluate(()=>({writes:writes.length,db:JSON.stringify(db),costs:D.routes.filter(r=>['fop','bakery','stv','sav'].includes(TRTS_OPS.sectionKey(r))).map(r=>v437AllocationSnapshot(r.id))}));
 assert.deepEqual(await page.locator('#view [data-section]').evaluateAll(es=>es.map(e=>e.dataset.section)),['base','fop','bakery','courier','replen','sav','stv','pickup']);
 const base=page.locator('[data-section=base]');if(await base.locator('button.v431-block-head').getAttribute('aria-expanded')==='false')await base.locator('button.v431-block-head').click();
 assert.equal(await base.locator('[data-base-route]').count(),7);assert.match(await base.innerText(),/Блок не визначено/);
 await base.locator('[data-base-route="502"]').click();await page.locator('.v436-detail').waitFor();assert.match(await page.locator('.v43-route-detail').innerText(),/Нова Пошта/);assert.match(await page.locator('.v436-detail time').innerText(),/\d{2}\.\d{2}\.\d{4}/);await page.getByRole('button',{name:'Назад до маршрутів',exact:true}).click();await page.locator('#v431-courier').waitFor({state:'attached'});
 for(const key of ['fop','bakery','sav','stv']){const head=page.locator('[data-section='+key+']>.v431-block-head');if(await head.getAttribute('aria-expanded')==='false')await head.click()}
 assert.equal(await page.locator('[data-section=stv]').getByRole('button',{name:/Без зони/}).count(),0,'A resolved zone with missing monthly tariff must not be a missing zone');
 assert.equal(await page.locator('[data-section=sav]').getByRole('button',{name:'Без зони · 1',exact:true}).count(),1);
 await page.locator('[data-section=sav]').getByRole('button',{name:'Без зони · 1',exact:true}).click();
 assert.equal(await page.locator('[data-section=sav] [data-route-id]').count(),1);
 assert.equal(await page.locator('[data-section=sav]').getByRole('button',{name:'Без зони · 1',exact:true}).getAttribute('aria-pressed'),'true');
 const courierHead=page.locator('#v431-courier>.v431-courier-head');if(await courierHead.getAttribute('aria-expanded')==='false')await courierHead.click();
 for(const [key,carrier] of [['fop','ФОП Діденко'],['bakery','ФОП Різун'],['courier','Нова Пошта']]){await page.locator('[data-carrier-filter='+key+']').selectOption(carrier);await page.locator('[data-carrier-filter='+key+']').waitFor();assert.equal(await page.locator('[data-carrier-filter='+key+']').inputValue(),carrier);await page.locator('[data-carrier-filter='+key+']').selectOption('')}
 assert.match(await page.locator('#v431-courier .v436-route time').innerText(),/\d{2}\.\d{2}\.\d{4}/);
 await page.locator('#v442-nav').getByRole('button',{name:'Аналітика',exact:true}).click();await page.locator('[data-analytics=local]').waitFor();
 const totals=await page.evaluate(()=>{const r=TRTS_APP.buildReport(),local=r.lines.filter(x=>x.kind==='local'),courier=r.lines.filter(x=>x.kind==='courier');return{local:TRTS_ANALYTICS.total(local),courier:TRTS_ANALYTICS.total(courier),branches:TRTS_ANALYTICS.group(local,'branch'),business:TRTS_ANALYTICS.group(local,'business'),replen:TRTS_ANALYTICS.total(r.replen),ids:r.lines.map(x=>x.pointId)}});
 assert.equal(totals.local.tt,6);assert.equal(totals.courier.tt,1);assert.equal(totals.courier.cost,80);assert.equal(totals.replen.pallets,5);assert.equal(totals.replen.cost,700);
 assert.equal(totals.ids.includes('p:5005'),false,'Pickup excluded');assert.equal(totals.ids.includes('p:5006'),false,'Unclassified kept in base, not attributed to local delivery');
 assert.equal(totals.local.cost,before.costs.reduce((s,x)=>s+Math.round(x.routeCost*100),0)/100);
 assert.equal(totals.business.reduce((s,x)=>s+Math.round(x.cost*100),0),Math.round(totals.local.cost*100));
 assert.equal(totals.local.missing>=1,true);assert.equal(totals.local.costTT,null);
 assert.equal(totals.branches.find(x=>x.name==='Київ').tt,3);assert.equal(totals.business.some(x=>x.name==='Дистрибуція'),true);
 await capture('v442-analytics');
 await page.locator('[data-analytics=local]').getByRole('button',{name:'Київ',exact:false}).click();assert.match(await page.locator('#view').innerText(),/Дистрибуція/);assert.match(await page.locator('#view').innerText(),/HoReCa/);assert.match(await page.locator('#view').innerText(),/Крафт/);await capture('v442-branch-business');
 await page.getByRole('button',{name:'‹ Аналітика',exact:true}).click();await page.locator('[data-analytics=replen]').getByRole('button',{name:/По філіях/}).click();assert.match(await page.locator('#view').innerText(),/200,00 ₴/);assert.match(await page.locator('#view').innerText(),/100,00 ₴/);
 for(const width of [320,390,760]){await page.setViewportSize({width,height:844});for(const key of ['dashboard','analytics','routes','expenses','menu']){await page.evaluate(key=>v442Nav(key),key);if(key==='analytics')await page.locator('[data-analytics=local]').waitFor();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'No overflow '+key+' '+width);assert.equal(await page.locator('#v442-nav button').count(),5)}}
 await page.setViewportSize({width:390,height:740});await page.evaluate(()=>v442Nav('dashboard'));await capture('v442-dashboard');
 assert.equal(await page.locator('.v442-dashboard-placeholder').count(),1);assert.equal(await page.locator('table,canvas').count(),0);
 assert.deepEqual(await page.evaluate(()=>({writes:writes.length,db:JSON.stringify(db),costs:D.routes.filter(r=>['fop','bakery','stv','sav'].includes(TRTS_OPS.sectionKey(r))).map(r=>v437AllocationSnapshot(r.id))})),before,'Read-only navigation, filters and reporting preserve all records/allocations');
 // Navigation during a pending courier request must not restore the old report.
 await page.evaluate(()=>{v442Nav('analytics');v442Nav('menu')});await page.waitForTimeout(120);assert.equal(await page.locator('.v442-menu').count(),1);
 await page.evaluate(()=>{window.failRead='courier_shipments';v442Nav('analytics')});await page.getByRole('alert').waitFor();assert.match(await page.getByRole('alert').innerText(),/Не вдалося завантажити аналітику/);
 await page.getByRole('button',{name:'Спробувати ще раз',exact:true}).click();await page.locator('[data-analytics=local]').waitFor();
 await page.evaluate(()=>v441LoadPeriod('2025-01-01','2025-01-01','date'));await page.locator('[data-analytics=local]').waitFor();assert.match(await page.locator('#view').innerText(),/Даних за цей період немає/);
 console.log('PASS v44.2: Base, all five tabs, carrier/zone filters, courier date, read-only local/courier/business/replenishment analytics, pickup excluded, period change, retry and navigation race, responsive layouts');
};
