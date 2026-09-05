const {chromium}=require(process.env.TRTS_PLAYWRIGHT_MODULE||'playwright');
const fs=require('node:fs'),http=require('node:http'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),dist=path.join(root,'web/dist');
const expected='v44.8',live=process.env.TRTS_BASE_URL;
const reference=JSON.parse(fs.readFileSync(path.join(root,'web/reference-v39.js'),'utf8').match(/TRTS_V39_EXPEDITOR_COVERAGE=(\{[^\n]*?\});/)[1]);
const date=new Date().toISOString().slice(0,10);
const types=['ФОП','Самовивіз',"Кур'єр",'STV','SAV','Пекарня'];
const names=types.map(t=>Object.keys(reference).find(n=>reference[n]===t));
assert.ok(names.every(Boolean),'Fixture categories must exist in the system reference');
const db={
 profiles:[{id:'00000000-0000-0000-0000-000000000443',full_name:'Тестовий користувач',role:'admin',active:true}],
 routes:names.map((name,i)=>({id:i+1,route_date:date,route_delivery_id:'TEST-'+(i+1),expeditor_name:name,warehouse:i===1?'Львівська обл., Жовківський р-н, с.Малехів, вул. Тараса Дороша 20 А':'Чайки STV',total_points:1,total_documents:1,total_weight:6.2,total_pallets:.011,total_bottles:5,total_order_amount:1000})),
 route_points:[1,2,3,4,5,6].map(id=>({id:id*10,route_id:id,customer_id:'customer-'+id,customer_name:'Тестова ТТ '+id,location_id:id,documents_count:1,weight:6.2,pallets:.011,bottles:5,order_amount:1000})),
 locations:[1,2,3,4,5,6].map(id=>({id,address_id:'address-'+id,delivery_address:'Тестова адреса '+id})),
 source_documents:[1,2,3,4,5,6].map(id=>({id,route_delivery_id:'TEST-'+id,document_date:date,sale_code:'INV-'+id,customer_id:'customer-'+id,address_id:'address-'+id,business_unit:'HoReCa',employee_id:'8000020908296',weight:6.2,pallets:.011,bottles:5,order_amount:1000})),
 route_facts:[{id:1,route_id:1,carrier_name:'Тестовий перевізник',tariff:1000,wave:'24'}],
 transport_carriers:[{id:1,name:'Тестовий перевізник',active:true}],
 courier_carriers:[{id:1,name:'Тестовий перевізник',active:true}],
 warehouse_display_map:[{source_warehouse:'Чайки STV',display_name:'Чайки STV',active:true},{source_warehouse:'Львівська обл., Жовківський р-н, с.Малехів, вул. Тараса Дороша 20 А',display_name:'Львів STV',active:true}],
 employee_directory:[{employee_id:'8000020908296',employee_name:'Мамедов Ельвін Ельхан Огли'}],
 transport_waves:[{id:1,name:'24',active:true}]
};
const archivedFixture=new Set(),fixtureAudit=[];
async function mockApi(route){
 const req=route.request(),u=new URL(req.url());
 if(u.pathname==='/auth/v1/token'){
  return route.fulfill({json:{access_token:'isolated-runtime-fixture',refresh_token:'isolated-runtime-refresh-fixture',token_type:'bearer',expires_in:3600}});
 }
 if(u.pathname==='/auth/v1/user')return route.fulfill({json:{id:'00000000-0000-0000-0000-000000000443',email:'test@example.invalid'}});
 if(u.pathname==='/auth/v1/logout')return route.fulfill({status:204});
 if(req.headers()['authorization']!=='Bearer isolated-runtime-fixture')return route.fulfill({status:401,json:{message:'Authentication required'}});
 if(u.pathname==='/functions/v1/transport-adapter-read'){
  const request=req.postDataJSON(),tables={routes:'routes',routePoints:'route_points',locations:'locations',sourceDocuments:'source_documents',businessAllocations:'route_business_allocations',routeFacts:'route_facts',routeExtraPoints:'route_extra_points'},table=tables[request.resource];
  assert.ok(table,'Only allowlisted adapter resources are readable');
  const rows=(db[table]||[]).filter(row=>(request.filters||[]).every(({field,op,value})=>op==='in'?value.map(String).includes(String(row[field])):op==='gte'?String(row[field])>=String(value):op==='lte'?String(row[field])<=String(value):op==='eq'?String(row[field])===String(value):false));
  const offset=Number(request.offset||0),limit=Number(request.limit||1000);
  return route.fulfill({json:{resource:request.resource,rows:rows.slice(offset,offset+limit),limit,offset}});
 }
 if(u.pathname==='/rest/v1/rpc/transport_archive_route'){
  const id=req.postDataJSON().target_route_id;
  if(db.profiles[0].role!=='admin')return route.fulfill({status:403,json:{message:'Administrator only'}});
  assert.equal(id,44500,'Delete only dedicated synthetic fixture');
  archivedFixture.add(id);fixtureAudit.push({action:'route_archived',entity:'routes',entity_key:String(id)});
  return route.fulfill({json:{ok:true}});
 }
 assert.equal(req.method(),'GET','Runtime fixture must never write real data');
 // Delayed legacy metadata must never replace the modern screen after it has rendered.
 if(u.pathname.endsWith('/profiles'))await new Promise(resolve=>setTimeout(resolve,400));
 const table=u.pathname.split('/').at(-1),rows=(db[table]||[]).filter(row=>table!=='routes'||!archivedFixture.has(row.id));
 const matches=row=>[...u.searchParams].every(([k,v])=>
  v.startsWith('eq.')?String(row[k])===v.slice(3):
  v.startsWith('in.')?v.slice(4,-1).split(',').map(x=>x.replaceAll('"','')).includes(String(row[k])):
  v.startsWith('gte.')?String(row[k])>=v.slice(4):
  v.startsWith('lte.')?String(row[k])<=v.slice(4):true);
 const offset=Number(u.searchParams.get('offset')||0),limit=Number(u.searchParams.get('limit')||1000);
 await route.fulfill({json:rows.filter(matches).slice(offset,offset+limit)});
}
function runtimeProbe(){
 window.__runtimeTicks=0;window.__runtimeRunaways=0;window.__runawayCallbacks=[];
 let callbacks=0;
 const Native=window.MutationObserver;
 // Stop a regression before it freezes the CI browser; a stop ALWAYS fails the test.
 window.MutationObserver=class extends Native{
  constructor(callback){super((records,observer)=>{
   if(++callbacks>1000){window.__runtimeRunaways++;window.__runawayCallbacks.push(String(callback).slice(0,1200));observer.disconnect();return}
   callback(records,observer);
  })}
 };
 setInterval(()=>{callbacks=0;window.__runtimeTicks++},100);
}
async function healthy(frame,label){
 await frame.waitForFunction(()=>window.__runtimeTicks>=10,null,{timeout:15000});
 const runaways=await frame.evaluate(()=>window.__runtimeRunaways);
 if(runaways)console.error('Runaway callbacks',await frame.evaluate(()=>window.__runawayCallbacks));
 assert.equal(runaways,0,label+': observer runaway');
 assert.equal(await frame.locator('#trts-update span').innerText(),'TEST · '+expected);
 assert.match(await frame.locator('#trts-update').innerText(),/Оновити/);
 assert.equal(await frame.evaluate(()=>document.documentElement.dataset.trtsBuild),expected);
 const mutations=await frame.evaluate(()=>new Promise(resolve=>{
  let count=0;const o=new MutationObserver(records=>count+=records.length);
  o.observe(document.body,{childList:true,subtree:true});
  setTimeout(()=>{o.disconnect();resolve(count)},500);
 }));
 assert.ok(mutations<20,label+': idle page must settle, mutations='+mutations);
 const before=await frame.evaluate(()=>window.__runtimeTicks);
 await frame.waitForFunction(n=>window.__runtimeTicks>n+3,before,{timeout:5000});
 console.log('PASS full runtime responsive: '+label+'; idle mutations='+mutations);
}
async function dashboard(frame,label){
 await frame.locator('[data-summary=local]').waitFor({state:'visible'});
 if(await frame.locator('#v444-notice').isVisible()){assert.ok((await frame.locator('#v444-notice').innerText()).includes('Застосунок оновлено до версії '+expected));await frame.locator('#v444-ack').click();assert.equal(await frame.evaluate(()=>localStorage.trts_update_ack),expected);}
 if(process.env.TRTS_CAPTURE==='1')console.log('VISUAL:v443-'+label.replaceAll(' ','-')+':'+(await frame.screenshot({type:'jpeg',quality:65})).toString('base64'));
 assert.equal(await frame.locator('#v442-nav button').count(),5);
 assert.deepEqual(await frame.locator('#v442-nav button>span:last-child').allTextContents(),['Дашборд','Аналітика','Маршрути','Довідник витрат','Меню']);
 await frame.locator('#v442-nav').getByRole('button',{name:'Маршрути',exact:true}).click();
 try{await frame.locator('.v431-fop').waitFor({state:'visible',timeout:15000})}catch(e){console.error('Runtime state '+label,await frame.locator('body').innerText());throw e}
 await frame.locator('#v431-courier').waitFor({state:'visible',timeout:15000});
 await frame.locator('.v437-pick-card').waitFor({state:'visible',timeout:15000});
 await healthy(frame,label);
 const titles=await frame.locator('.v431-block-head,.v431-courier-head').allTextContents();
 assert.equal(titles.length,8,'All eight route subblocks may be rendered: '+JSON.stringify(titles));
 assert.ok(titles.some(t=>t.startsWith('STV')));assert.ok(titles.some(t=>t.startsWith('SAV')));
 for(const id of [4,5])assert.equal(await frame.locator('[data-section="'+(id===4?'stv':'sav')+'"]').getByText('TEST-'+id,{exact:true}).count(),1,'Approved partner route must be present');
 assert.equal(await frame.locator('.v437-pick-card .v437-exp b').innerText(),names[1]);
 assert.equal(await frame.locator('.v437-pick-card .v437-warehouse b').innerText(),'Львів STV');
 await frame.locator('.v437-pick-card').click();
 await frame.locator('.v437-tt').waitFor({state:'visible'});
 assert.match(await frame.locator('.v437-meta').innerText(),/Мамедов Ельвін Ельхан Огли/);
 assert.equal(await frame.locator('.v437-inv,.v436-invoice-table').count(),0);
 await frame.locator('.v437-tt').click();
 assert.match(await frame.locator('.v439-invoice').innerText(),/INV-2/);
 assert.match(await frame.locator('.v439-invoice').innerText(),/6,2/);
 await frame.locator('.v43-back').click();
 await healthy(frame,label+' pickup details');
 await frame.locator('.v437-detail-head button').first().click();
 await frame.locator('.v431-fop').waitFor({state:'visible'});
 await frame.locator('.v431-fop [data-route-id="1"]').click();
 assert.match(await frame.locator('[data-point-id="10"]').innerText(),/Мамедов Ельвін Ельхан Огли/);
 await frame.getByRole('button',{name:'Назад до маршрутів',exact:true}).click();
 await frame.getByRole('button',{name:'+ Додати поповнення',exact:true}).click();
 assert.equal(await frame.locator('input[name="rp-sender"]').count(),2);
 assert.equal(await frame.locator('#rp-receiver option').count(),3);
 assert.ok(await frame.locator('#rp-carrier option').count()>1);
 await frame.locator('#v43-modal').getByRole('button',{name:'Скасувати',exact:true}).click();
 await frame.locator('#v442-nav').getByRole('button',{name:'Аналітика',exact:true}).click();await frame.locator('[data-summary=local]').waitFor({state:'visible'});
 assert.match(await frame.locator('#view').innerText(),/Самовивіз не включено/);await healthy(frame,label+' analytics');
 await frame.locator('#v442-nav').getByRole('button',{name:'Довідник витрат',exact:true}).click();assert.equal(await frame.locator('#v441-finance-panel button').count(),4);
 await frame.locator('#v442-nav').getByRole('button',{name:'Меню',exact:true}).click();assert.equal(await frame.locator('.v443-settings').count(),1);
 await frame.locator('#v442-nav').getByRole('button',{name:'Дашборд',exact:true}).click();assert.equal(await frame.locator('[data-summary=local]').count(),1);
 await frame.locator('#v442-nav').getByRole('button',{name:'Маршрути',exact:true}).click();await frame.locator('.v431-fop').waitFor({state:'visible'});
}
(async()=>{
 const server=live?null:http.createServer((req,res)=>{
  const url=new URL(req.url,'http://localhost'),file=path.resolve(dist,'.'+(url.pathname==='/'?'/index.html':decodeURIComponent(url.pathname)));
  if(!file.startsWith(dist+path.sep)){res.writeHead(403).end();return}
  fs.readFile(file,(err,body)=>{
   if(err){res.writeHead(404).end();return}
   const mime={'.css':'text/css','.html':'text/html','.js':'application/javascript','.webmanifest':'application/manifest+json','.png':'image/png'};
   res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'}).end(body);
  });
 });
 if(server)await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const localBase=server?'http://127.0.0.1:'+server.address().port:null,base=live||'https://transport-report-ts-web.pages.dev';
 const browser=await chromium.launch({headless:true,...(process.env.TRTS_CHROME?{executablePath:process.env.TRTS_CHROME}:{})});
 try{
  for(const scenario of [
   {name:'desktop',url:'/',width:1360,height:1000},
   {name:'mobile',url:'/',width:390,height:844},
   {name:'phone-preview',url:'/phone-preview.html',width:1360,height:1000}
  ]){
   const context=await browser.newContext({viewport:{width:scenario.width,height:scenario.height},serviceWorkers:'block'});
   let logoutFault=false,logoutCalls=0,deleteDecision=null;const dialogs=[],logoutWarnings=[];
   const errors=[],securityFixture=await require('./security-edge-fixture.cjs')();
   if(!live)await context.route('https://transport-report-ts-web.pages.dev/**',async route=>{const u=new URL(route.request().url()),r=await fetch(localBase+u.pathname+u.search);await route.fulfill({status:r.status,headers:{'content-type':r.headers.get('content-type')||'text/html'},body:Buffer.from(await r.arrayBuffer())})});
   await context.addInitScript(runtimeProbe);
   // All backend traffic is isolated, even when checking the live deployed frontend.
   await context.route('https://*.supabase.co/**',async route=>{const req=route.request(),u=new URL(req.url());if(u.pathname==='/auth/v1/logout'){logoutCalls++;if(logoutFault)return scenario.name==='phone-preview'?route.abort('failed'):route.fulfill({status:500,json:{error:'isolated logout failure'}})}if(logoutFault&&u.pathname==='/functions/v1/transport-security'&&req.postDataJSON()?.action==='disable')return route.fulfill({status:503,json:{error:'isolated device failure'}});if(route.request().url().includes('/functions/v1/transport-security')){const req=route.request(),r=await securityFixture.handle(new Request(req.url(),{method:req.method(),headers:req.headers(),body:req.postData()||undefined}));return route.fulfill({status:r.status,headers:Object.fromEntries(r.headers),body:await r.text()})}return mockApi(route)});
   const page=await context.newPage();page.setDefaultTimeout(15000);
   page.on('pageerror',e=>errors.push(e.message));
   page.on('dialog',async d=>{if(deleteDecision!==null){assert.equal(d.message(),'Видалити маршрут DELETE-FIXTURE? Цю дію неможливо скасувати.');return deleteDecision?d.accept():d.dismiss()}dialogs.push(d.message());await d.dismiss()});
   page.on('console',m=>{if(m.type()==='warning'&&m.text().includes('[auth.logout]'))logoutWarnings.push(m.text())});
   const servedScripts=[];
   page.on('response',response=>{const u=new URL(response.url());if(u.origin===new URL(base).origin&&u.pathname.endsWith('.js'))servedScripts.push({response,body:response.body().then(body=>({body}),error=>({error}))})});
   const response=await page.goto(base+scenario.url,{waitUntil:'load',timeout:30000});
   const frame=scenario.url.includes('phone-preview')?await page.locator('iframe').elementHandle().then(el=>el.contentFrame()):page;
   if(live){
    // Exercise the user's existing Update button, including stale CDN/PWA entry documents.
    await frame.locator('#trts-update').waitFor();
    servedScripts.length=0;
    await Promise.all([frame.waitForNavigation({waitUntil:'load'}),frame.locator('#trts-update').click()]);
    // Pages can switch the HTML edge before the runtime asset edge. Never accept
    // a mixed release: retry a fresh document + the real Update action, then
    // retain exact byte checks and every functional assertion below.
    for(let attempt=0;attempt<4;attempt++){
     try{await frame.waitForFunction(build=>document.documentElement.dataset.trtsBuild===build,expected);break}
     catch(error){
      console.log('Deployment propagation diagnostic',await frame.evaluate(()=>({runtime:document.documentElement.dataset.trtsBuild,meta:document.querySelector('meta[name="trts-build"]')?.content,scripts:[...document.scripts].filter(s=>s.src.includes('runtime')).map(s=>s.src)})));
      if(attempt===3)throw error;
      const fresh=new URL(frame.url());fresh.searchParams.set('release-check',Date.now());
      await frame.goto(fresh.href,{waitUntil:'load'});await frame.locator('#trts-update').waitFor();
      servedScripts.length=0;
      await Promise.all([frame.waitForNavigation({waitUntil:'load'}),frame.locator('#trts-update').click()]);
     }
    }
    console.log('PASS deployed Update button reaches exact '+expected+' on '+scenario.name);
    for(const item of servedScripts){const response=item.response,file=path.join(dist,new URL(response.url()).pathname);if(fs.existsSync(file)){const captured=await item.body;if(captured.error)throw captured.error;const delivered=captured.body,built=fs.readFileSync(file);assert.ok(delivered.equals(built),'Deployed script differs from tested build: '+new URL(response.url()).pathname)}}
   }
   await frame.locator('#loginForm').waitFor({state:'visible'});
   assert.ok(await frame.locator('#loginForm button').evaluate(el=>getComputedStyle(el).display==='flex'),'Login button uses shared design');
   assert.ok(await frame.locator('.loginbox .logo').evaluate(el=>getComputedStyle(el).objectFit==='contain'&&getComputedStyle(el).transform==='none'),'Logo must be contained without crop');
   await healthy(frame,scenario.name+' login');
   await frame.locator('#email').fill('runtime-test@example.invalid');
   await frame.locator('#password').fill('isolated-fixture-only');
   await frame.locator('#loginForm button').click();
   await dashboard(frame,scenario.name+' signed in');
   await page.reload({waitUntil:'load'});
   const reloaded=scenario.url.includes('phone-preview')?await page.locator('iframe').elementHandle().then(el=>el.contentFrame()):page;
   await dashboard(reloaded,scenario.name+' stored session');
   assert.ok(await reloaded.locator('header.top .logo').evaluate(el=>getComputedStyle(el).objectFit==='contain'&&el.getBoundingClientRect().height>0));
   assert.ok(await reloaded.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'No full runtime horizontal overflow');
   if(scenario.name==='mobile'){
    await require('./theme-v445-flows.cjs')({page,frame:reloaded,capture:async label=>console.log('VISUAL:'+label+':'+(await page.screenshot({type:'jpeg',quality:70})).toString('base64'))});
    // RLS/archive simulation is entirely inside the intercepted backend.
    const fixture={...db.routes[0],id:44500,route_delivery_id:'DELETE-FIXTURE'};
    db.routes.push(fixture);db.route_points.push({...db.route_points[0],id:445000,route_id:44500});
    db.route_facts.push({route_id:44500,tariff:50,carrier_name:'ФОП Діденко'});
    db.source_documents.push({...db.source_documents[0],id:4450000,route_delivery_id:'DELETE-FIXTURE'});
    await reloaded.evaluate(async()=>{await v435Refresh();v442Nav('routes')});
    const action=reloaded.locator('[data-route-id="44500"] .v445-route-delete');
    await action.waitFor({state:'visible'});await action.click();await reloaded.locator('#v446-confirm [data-confirm=false]').click();assert.equal(archivedFixture.size,0,'Cancel must not delete');
    await action.click();assert.match(await reloaded.locator('#v446-confirm').innerText(),/Видалити маршрут DELETE-FIXTURE\? Цю дію неможливо скасувати\./);await reloaded.locator('#v446-confirm [data-confirm=true]').click();await reloaded.waitForFunction(()=>!TRTS_OPS.dat().routes.some(r=>r.id===44500));
    deleteDecision=null;assert.equal(fixtureAudit.length,1);assert.equal(fixtureAudit[0].action,'route_archived');
    assert.equal(await reloaded.locator('[data-route-id="44500"]').count(),0);
    assert.equal(await reloaded.evaluate(()=>TRTS_APP.buildReport().lines.some(x=>Number(x.routeId)===44500)),false);
    await reloaded.evaluate(()=>v442Nav('dashboard'));await reloaded.locator('[data-chart=cost]').waitFor();
    assert.equal(await reloaded.evaluate(async()=>(await TRTS_DASHBOARD.reports()).current.lines.some(x=>Number(x.routeId)===44500)),false);
    console.log('PASS visible Administrator delete, exact confirm, cancel, isolated archive/audit and exclusion from Dashboard/Analytics');
   }
   await require('./release-flows.cjs')({page,frame:reloaded});
   if(scenario.name==='mobile'){
    await reloaded.evaluate(()=>{v442Nav('routes');v43OpenRoute(1);v43OpenTT(1,10)});
    await reloaded.locator('.v439-invoice').waitFor();
    await reloaded.evaluate(()=>{
     const target=document.getElementById('view'),t=(x,y)=>new Touch({identifier:1,target,clientX:x,clientY:y});
     target.dispatchEvent(new TouchEvent('touchstart',{bubbles:true,touches:[t(10,400)]}));
     target.dispatchEvent(new TouchEvent('touchmove',{bubbles:true,cancelable:true,touches:[t(125,405)]}));
     target.dispatchEvent(new TouchEvent('touchend',{bubbles:true,changedTouches:[t(125,405)]}));
    });
    await reloaded.locator('.v436-detail').waitFor();assert.equal(await reloaded.locator('.v443-delete').count(),1);
    db.profiles[0].role='logistician';await reloaded.evaluate(async()=>{await TRTS_SECURITY.identify();v442Nav('menu')});
    for(const name of ['Користувачі та права','Довідники','Журнал змін','Експорт даних'])assert.equal(await reloaded.locator('.v443-settings').getByRole('button',{name,exact:false}).count(),0);
    await reloaded.evaluate(()=>{v43OpenRoute(1);v443DeleteRoute(1)});assert.equal(await reloaded.locator('.v443-delete,.v445-route-delete').count(),0);
    await reloaded.evaluate(()=>v442Nav('routes'));await reloaded.locator('.v437-pick-card').waitFor();assert.equal(await reloaded.locator('.v445-route-delete').count(),0);
    db.profiles[0].role='admin';await reloaded.evaluate(()=>TRTS_SECURITY.identify());
    console.log('PASS edge swipe TT to route, restored Administrator delete action, non-admin Menu and delete actions hidden/blocked');
    await require('./security-flows.cjs')({page,context,frame:reloaded,handler:securityFixture.handle});
   }
   await reloaded.evaluate(()=>v443Theme('light'));
   const logoutBaseline=logoutCalls;logoutFault=true;
   await Promise.all([reloaded.waitForNavigation({waitUntil:'load'}),reloaded.evaluate(()=>{void logout()})]);
   await reloaded.locator('#loginForm').waitFor({state:'visible'});
   assert.equal(await reloaded.locator('#app').isVisible(),false);
   assert.equal(await reloaded.evaluate(()=>localStorage.getItem('trts_token')),null);
   assert.equal(logoutCalls-logoutBaseline,1,'Auth signOut attempted even if device revocation fails');
   assert.deepEqual(dialogs,[],'Logout must not display a technical alert');
   assert.ok(logoutWarnings.length>0,'Remote error logged technically');
   for(const name of ['trts_token','trts_refresh','trts_vault'])assert.equal(await reloaded.evaluate(k=>localStorage.getItem(k),name),null);
   await page.reload({waitUntil:'load'});
   const afterLogout=scenario.url.includes('phone-preview')?await page.locator('iframe').elementHandle().then(el=>el.contentFrame()):page;
   await afterLogout.locator('#loginForm').waitFor({state:'visible'});
   assert.equal(await afterLogout.locator('#v443-unlock').count(),0,'Old PIN/biometric session must not return');
   assert.equal(await afterLogout.locator('#app').isVisible(),false);
   assert.equal(await afterLogout.evaluate(()=>localStorage.trts_theme),'light');assert.equal(await afterLogout.locator('html').getAttribute('data-theme'),'light','Theme persists across full logout and restart');
   console.log('PASS failed remote logout clears session and PIN/biometrics; reopen requires email/password: '+scenario.name);
   assert.deepEqual(errors,[],scenario.name+': uncaught browser errors');
   console.log('PASS complete built scripts, isolated login/reload, five screens and eight route subblocks: '+scenario.name);
   await context.close();
  }
 }finally{await browser.close();if(server)await new Promise(resolve=>server.close(resolve))}
})().catch(e=>{console.error(e);process.exitCode=1});
