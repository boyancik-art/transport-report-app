const assert=require('node:assert/strict');
const test=require('node:test');
const {readFileSync}=require('node:fs');
const joins=require('./stable-key-joins.js');
const adapter=require('./adapter-read-client.js');

test('reused route_delivery_id is isolated by route_key and point_key',()=>{
 const routes=[
  {id:11,route_date:'2026-08-27',route_delivery_id:'198004777635303',route_key:'rt2_first'},
  {id:22,route_date:'2026-09-03',route_delivery_id:'198004777635303',route_key:'rt2_second'},
  {id:33,route_date:'2026-08-27',route_delivery_id:'198004777711088',route_key:'rt2_third'},
  {id:44,route_date:'2026-08-28',route_delivery_id:'198004777711088',route_key:'rt2_fourth'}
 ];
 const points=[
  {id:111,route_id:11,point_key:'pt2_first',customer_id:'customer'},
  {id:222,route_id:22,point_key:'pt2_second',customer_id:'customer'},
  {id:333,route_id:33,point_key:'pt2_third',customer_id:'customer'},
  {id:444,route_id:44,point_key:'pt2_fourth',customer_id:'customer'}
 ];
 const documents=[
  {financial_key:'fin_first',route_delivery_id:'198004777635303',route_key:'rt2_first',point_key:'pt2_first',order_amount:100,pallets:1,weight:10},
  {financial_key:'fin_second',route_delivery_id:'198004777635303',route_key:'rt2_second',point_key:'pt2_second',order_amount:250,pallets:2.5,weight:25},
  {financial_key:'fin_third',route_delivery_id:'198004777711088',route_key:'rt2_third',point_key:'pt2_third',order_amount:300,pallets:3,weight:30},
  {financial_key:'fin_fourth',route_delivery_id:'198004777711088',route_key:'rt2_fourth',point_key:'pt2_fourth',order_amount:450,pallets:4.5,weight:45}
 ];
 const metrics=(route,point)=>{
  const docs=joins.pointDocuments(documents,route,point);
  return{documents:docs.map(x=>x.financial_key),tt:docs.length?1:0,sales:docs.reduce((n,x)=>n+x.order_amount,0),pallets:docs.reduce((n,x)=>n+x.pallets,0),weight:docs.reduce((n,x)=>n+x.weight,0)};
 };
 assert.deepEqual(joins.routeDocuments(documents,routes[0]).map(x=>x.financial_key),['fin_first']);
 assert.deepEqual(joins.routeDocuments(documents,routes[1]).map(x=>x.financial_key),['fin_second']);
 assert.deepEqual(metrics(routes[0],points[0]),{documents:['fin_first'],tt:1,sales:100,pallets:1,weight:10});
 assert.deepEqual(metrics(routes[1],points[1]),{documents:['fin_second'],tt:1,sales:250,pallets:2.5,weight:25});
 assert.deepEqual(metrics(routes[2],points[2]),{documents:['fin_third'],tt:1,sales:300,pallets:3,weight:30});
 assert.deepEqual(metrics(routes[3],points[3]),{documents:['fin_fourth'],tt:1,sales:450,pallets:4.5,weight:45});
 assert.deepEqual(joins.pointDocuments(documents,routes[0],{...points[0],point_key:'pt2_second'}),[]);
});

test('legacy contract falls back only when stable keys are absent',()=>{
 const route={route_delivery_id:'legacy-route'},point={customer_id:'customer'},location={address_id:'address'};
 const documents=[{id:1,route_delivery_id:'legacy-route',customer_id:'customer',address_id:'address'}];
 assert.deepEqual(joins.pointDocuments(documents,route,point,location),documents);
});

test('operations runtime delegates both document joins to stable keys',()=>{
 const operations=readFileSync(require.resolve('./patch-v43-operations.js'),'utf8');
 const build=readFileSync(require.resolve('./build.mjs'),'utf8');
 assert.match(operations,/TRTS_STABLE_KEY_JOINS\.routeDocuments\(dat\(\)\.docs\|\|\[\],r\)/);
 assert.match(operations,/TRTS_STABLE_KEY_JOINS\.pointDocuments\(dat\(\)\.docs\|\|\[\],r,p,loc\(p\)\)/);
  assert.ok(build.indexOf('stable-key-joins.js?v=4470')<build.indexOf('patch-v43-operations.js?v=4470'));
});

test('snapshot reads the v2 adapter contract through the Edge proxy while operational writes remain legacy',()=>{
 const operations=readFileSync(require.resolve('./patch-v43-operations.js'),'utf8');
 for(const resource of ['routes','routePoints','sourceDocuments','businessAllocations','routeFacts','routeExtraPoints','locations'])assert.match(operations,new RegExp("['\"]"+resource+"['\"]"));
 assert.match(operations,/TRTS_ADAPTER_READ\.all\(api,resource,filters,sort\)/);
 assert.doesNotMatch(operations,/\/rest\/v1\/cube_[a-z_]+_legacy_adapter_v2/);
 assert.match(operations,/api\('\/rest\/v1\/route_facts'/);
});

test('adapter client pages exclusively through the read proxy',async()=>{
 const calls=[];const api=async(path,opt)=>{calls.push({path,opt,body:JSON.parse(opt.body)});return{rows:calls.length===1?[{id:1}]:[]}};
 assert.deepEqual(await adapter.all(api,'routes',[],[]),[{id:1}]);
 assert.equal(calls[0].path,'/functions/v1/transport-adapter-read');assert.equal(calls[0].opt.method,'POST');assert.equal(calls[0].body.limit,1000);
});

test('adapter permission contract is service-only and excludes unmapped history',()=>{
 const migration=readFileSync(require.resolve('../supabase/migrations/20260904210000_legacy_contract_adapter_views_v2.sql'),'utf8');
 assert.equal((migration.match(/security_invoker\s*=\s*true/g)||[]).length,9);
 assert.match(migration,/from public,anon,authenticated/);
 assert.match(migration,/to service_role/);
 assert.doesNotMatch(migration,/grant select[\s\S]*to authenticated/i);
 assert.doesNotMatch(migration,/route_deletions/);
 assert.match(migration,/legacy_match_status = 'exact'/);
});
