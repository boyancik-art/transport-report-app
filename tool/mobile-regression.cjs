const {chromium}=require(process.env.TRTS_PLAYWRIGHT_MODULE||'playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.TRTS_CHROME?{executablePath:process.env.TRTS_CHROME}:{})});
 const page=await browser.newPage({viewport:{width:390,height:740}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('https://trts.test/',route=>route.fulfill({contentType:'text/html',body:`<html><head><style>*{box-sizing:border-box}body{margin:0;background:#090d13;color:white;font-family:Arial}.hide{display:none!important}.top{position:sticky;top:0;z-index:20;background:#1d2025;padding:24px}#trts-update{position:fixed;right:8px;bottom:50px;z-index:99999}</style></head><body><header class="top">Transport TS</header><button id="trts-update">TEST</button><input id="date" type="date"><span id="dataTag"></span><main><div id="view"></div></main></body></html>`}));
 await page.goto('https://trts.test/');
 await page.evaluate(()=>{
  const date=new Date().toISOString().slice(0,10);
  window.D={routes:[],points:[],facts:[],docs:[],alloc:[],locations:[]};
  window.TRTS_V39_EXPEDITOR_COVERAGE={FOP:'ФОП',Pickup:'Самовивіз',Courier:"Кур'єр"};
  window.db={routes:[{id:1,route_delivery_id:'F001',route_date:date,expeditor_name:'FOP',warehouse:'Чайки STV'},{id:2,route_delivery_id:'P001',route_date:date,expeditor_name:'Pickup',warehouse:'Хмельницька обл., м.Хмельницький, пр-т Миру 99/3'},{id:3,route_delivery_id:'C001',route_date:date,expeditor_name:'Courier',warehouse:'Чайки STV'}],route_points:[{id:11,route_id:1,customer_name:'ТТ ФОП',order_amount:10000},...[31,32,33,34].map(id=>({id,route_id:3,customer_name:'Клієнт '+id,location_id:id,customer_id:id,order_amount:1000}))],route_facts:[{id:100,route_id:1,carrier_name:'ФОП Діденко',wave:'24',tariff:3500}],source_documents:[],locations:[31,32,33,34].map(id=>({id,delivery_address:'Київ, адреса '+id})),route_business_allocations:[],route_extra_points:[],employee_directory:[],transport_carriers:[{id:1,name:'ФОП Діденко'},{id:2,name:'ФОП Різун'}],transport_waves:[{name:'24'},{name:'48'},{name:'Мережа'}],warehouse_display_map:[{source_warehouse:'warehouse-khm',display_name:'Хмельницький STV'},{source_warehouse:'Чайки STV',display_name:'Чайки STV'},{source_warehouse:'kyiv',display_name:'Київ TS'}],tariff_groups:[],fop_manual_routes:[],branch_replenishments:[],expeditor_section_rules:[],courier_shipments:[],courier_shipment_points:[],courier_carriers:[{name:'Smartex'},{name:'Нова Пошта'}]};
  Object.values(window.db).forEach(rows=>rows.forEach(row=>{row.active??=true}));
  window.writes=[];let seq=1000;
  window.api=async(url,opt={})=>{
   await new Promise(r=>setTimeout(r,10));const u=new URL(url,'https://test.invalid'),table=u.pathname.split('/').at(-1),rows=window.db[table]||[],method=opt.method||'GET';
   const matches=row=>[...u.searchParams].every(([k,v])=>v.startsWith('eq.')?String(row[k])===v.slice(3):v.startsWith('in.')?v.slice(4,-1).split(',').includes(String(row[k])):true);
   if(method==='GET')return structuredClone(rows.filter(matches));
   const body=JSON.parse(opt.body||'{}');window.writes.push({table,method,body});
   if(window.failTable===table){window.failTable=null;throw Error('Тестова помилка збереження')}
   if(method==='POST'){const add=(Array.isArray(body)?body:[body]).map(x=>({id:seq++,...x}));rows.push(...add);return structuredClone(add)}
   if(method==='PATCH'){const found=rows.filter(matches);found.forEach(x=>Object.assign(x,body));return structuredClone(found)}
   throw Error('Unexpected method '+method);
  };
 });
 // Execute the production operation handlers and styles against an isolated fake API.
 for(const file of ['patch-v43-operations.js','patch-v43-1-blocks.js','patch-v43-1-ops-courier.js','patch-v43-1-header.js'])await page.addScriptTag({content:fs.readFileSync(path.join(root,'web',file),'utf8')});
 await page.waitForSelector('.v431-pickup-card');
 assert.match(await page.locator('.v431-pickup-card .v431-cell').innerText(),/Хмельницький STV/);
 assert.doesNotMatch(await page.locator('.v431-pickup-card .v431-cell').innerText(),/99\/3/);
 await page.evaluate(()=>v43OpenRoute(1));
 await page.getByRole('button',{name:'Перевізник · хвиля · тариф',exact:true}).click();
 await page.locator('#v433-carrier').selectOption('ФОП Різун');await page.locator('#v433-wave').selectOption('48');await page.locator('#v433-tariff').fill('4700');
 await page.evaluate(()=>window.failTable='route_facts');await page.locator('#v433-route-save').click();await page.waitForFunction(()=>document.querySelector('#v433-route-error').textContent.includes('Не збережено'));
 assert.equal(await page.locator('#v433-tariff').inputValue(),'4700');
 await page.locator('#v433-route-save').click();await page.waitForFunction(()=>!document.body.classList.contains('trts-modal-open'));
 assert.deepEqual(await page.evaluate(()=>({carrier:db.route_facts[0].carrier_name,wave:db.route_facts[0].wave,tariff:db.route_facts[0].tariff})),{carrier:'ФОП Різун',wave:'48',tariff:4700});
 assert.equal(await page.evaluate(()=>writes.filter(x=>x.table==='route_facts'&&x.method==='POST').length),0);
 assert.equal(await page.locator('.v43-route-detail').count(),1);
 console.log('PASS route carrier, wave, tariff edit; failed save retains form; PATCH preserves record');
 // Count invoices, not source rows, and scope them to this route and address.
 await page.evaluate(()=>{
  Object.assign(D.points.find(p=>p.id===11),{customer_id:'customer-11',location_id:11,documents_count:2});
  D.locations.push({id:11,address_id:'address-11'});
  const base={route_delivery_id:'F001',customer_id:'customer-11',address_id:'address-11',pallets:.1,bottles:5,weight:6,order_amount:100};
  D.docs=[{...base,id:1,sale_code:'INV-1'},{...base,id:2,sale_code:' INV-1 '},{...base,id:3,sale_code:' ',operation_group_id:'GROUP-2'},{...base,id:4,sale_code:'OTHER-ADDRESS',address_id:'address-12'},{...base,id:5,sale_code:'OTHER-ROUTE',route_delivery_id:'OTHER'}];
  v43OpenRoute(1);
 });
 assert.equal(await page.locator('.v43-tt .v434-doc-count b').innerText(),'2');
 await page.locator('.v43-tt').click();
 assert.equal(await page.locator('.v434-doc-count b').innerText(),'2');
 assert.equal(await page.locator('.v43-invoice').count(),2);
 assert.match(await page.locator('.v43-subtitle').innerText(),/НАКЛАДНІ В ЦІЙ ТТ · 2/);
 assert.match(await page.locator('.v43-invoice').first().innerText(),/INV-1/);
 assert.equal(await page.locator('.v43-invoice').first().locator('.v43-four b').first().innerText(),'10');
 await page.evaluate(()=>{D.docs=[];D.points.find(p=>p.id===11).documents_count=3;v43OpenRoute(1)});
 assert.equal(await page.locator('.v434-doc-count b').innerText(),'3');
 await page.locator('.v43-tt').click();
 assert.equal(await page.locator('.v43-invoice').count(),0);
 assert.match(await page.locator('.v43-empty').innerText(),/Завантажено 0 із 3/);
 await page.evaluate(()=>{D.docs=[{id:1,route_delivery_id:'F001',customer_id:'customer-11',address_id:'address-11',sale_code:'INV-1'}];v43OpenTT(1,11)});
 assert.equal(await page.locator('.v434-doc-count b').innerText(),'3');
 assert.match(await page.locator('.v43-empty').innerText(),/Завантажено 1 із 3/);
 await page.evaluate(()=>{D.docs=[];D.points.find(p=>p.id===11).documents_count=0;v43OpenTT(1,11)});
 assert.equal(await page.locator('.v434-doc-count b').innerText(),'0');
 assert.match(await page.locator('.v43-empty').innerText(),/Накладних у цій ТТ немає/);
 console.log('PASS distinct invoice count, matching detail list, address isolation, imported fallback, partial and empty states');
 await page.evaluate(()=>v43Replenishment());await page.locator('#rp-sender-summary').click();
 await page.locator('input[name="rp-sender"][value="Чайки STV"]').check();await page.locator('input[name="rp-sender"][value="Київ TS"]').check();
 await page.locator('#rp-senders > button').click();assert.equal(await page.locator('#rp-senders').getAttribute('open'),null);
 await page.locator('#rp-receiver').selectOption('Хмельницький STV');await page.locator('#rp-tariff').fill('2500');await page.locator('#rp-carrier').selectOption('ФОП Різун');
 const geometry=await page.locator('#rp-save').evaluate(el=>{const r=el.getBoundingClientRect();return{visible:r.top>=0&&r.bottom<=innerHeight,hit:el.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2))}});
 assert.deepEqual(geometry,{visible:true,hit:true});
 await page.locator('#rp-save').click();await page.waitForFunction(()=>db.branch_replenishments.length===1);
 const replen=await page.evaluate(()=>db.branch_replenishments[0]);assert.deepEqual([...replen.sender_warehouses].sort(),['Чайки STV','Київ TS'].sort());assert.equal(replen.tariff,2500);
 console.log('PASS warehouse multiselect and Done, tariff and save button visible at 390x740');
 await page.waitForSelector('.v433-open-delivery');await page.evaluate(()=>v433OpenDelivery(3));await page.locator('#v431-ccarrier').selectOption('Smartex');
 await page.locator('#v433-cost-31').fill('300.01');await page.locator('[data-group="31"] .v433-add-shared').click();
 await page.locator('input[name="v433-shared-31"][value="32"]').check();await page.locator('input[name="v433-shared-31"][value="33"]').check();await page.locator('#v433-shared-31 button').click();
 assert.equal(await page.locator('.v433-tariff-group').count(),2);await page.locator('#v433-cost-34').fill('50');
 await page.evaluate(()=>window.failTable='courier_shipment_points');await page.locator('#v433-courier-save').click();await page.waitForFunction(()=>document.querySelector('#v433-courier-error').textContent.includes('Не завершено'));
 await page.locator('#v433-courier-save').click();await page.waitForFunction(()=>!document.body.classList.contains('trts-modal-open'));
 const saved=await page.evaluate(()=>({s:db.courier_shipments,l:db.courier_shipment_points}));assert.equal(saved.s.length,2);assert.equal(saved.l.length,4);assert.equal(new Set(saved.l.map(x=>x.route_point_id)).size,4);assert.equal(saved.l.reduce((s,l)=>s+Math.round(l.delivery_cost*100),0),35001);
 assert.deepEqual(saved.l.filter(l=>[31,32,33].includes(l.route_point_id)).map(l=>l.delivery_cost),[100.01,100,100]);
 await page.evaluate(()=>v433OpenDelivery(3));assert.equal(await page.locator('#v433-cost-31').inputValue(),'300.01');await page.locator('#v433-cost-31').fill('600.02');await page.locator('#v433-courier-save').click();await page.waitForFunction(()=>!document.body.classList.contains('trts-modal-open'));
 assert.equal(await page.evaluate(()=>db.courier_shipment_points.reduce((s,l)=>s+Math.round(l.delivery_cost*100),0)),65002);
 assert.equal(await page.evaluate(()=>db.courier_shipments.length),2);
 console.log('PASS shared courier tariff conserved to kopeck, distinct tariff, retry without duplicate rows, reopen and edit');
 await page.waitForTimeout(600);
 const mutationCount=await page.evaluate(()=>new Promise(resolve=>{let n=0;const o=new MutationObserver(r=>n+=r.length);o.observe(document.body,{subtree:true,childList:true});setTimeout(()=>{o.disconnect();resolve(n)},300)}));assert.ok(mutationCount<10,'UI must settle, mutations='+mutationCount);
 assert.deepEqual(errors,[]);
 console.log('PASS idle UI settles with no browser errors');
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
