import assert from "node:assert/strict";
import test from "node:test";
import {buildAdapterUrl,createHandler,RESOURCES} from "./core.ts";

const origin="https://transport-report-ts-web.pages.dev";
const request=(body:unknown,token="user-token",method="POST")=>new Request("https://edge/functions/v1/transport-adapter-read",{method,headers:{origin,"content-type":"application/json",...(token?{authorization:`Bearer ${token}`}:{})},body:method==="POST"?JSON.stringify(body):undefined});
function fetchMock(options:{user?:boolean;active?:boolean;rows?:unknown[]}={}){
 const calls:string[]=[];
 const mock=async(input:RequestInfo|URL,init?:RequestInit)=>{const url=String(input);calls.push(url);
  if(url.includes("/auth/v1/user"))return new Response(options.user===false?JSON.stringify({error:"invalid"}):JSON.stringify({id:"123e4567-e89b-12d3-a456-426614174000"}),{status:options.user===false?401:200});
  if(url.includes("/rest/v1/profiles"))return Response.json(options.active===false?[]:[{id:"123e4567-e89b-12d3-a456-426614174000"}]);
  return Response.json(options.rows??[{id:1}]);
 };
 return{calls,mock:mock as typeof fetch};
}
const handler=(options:Parameters<typeof fetchMock>[0]={})=>{const f=fetchMock(options);return{...f,handle:createHandler({url:"https://project.supabase.co",anonKey:"public",serviceKey:"server-secret",fetchImpl:f.mock})}};

test("all nine resources map only to the fixed adapter allowlist",()=>{
 assert.equal(Object.keys(RESOURCES).length,9);
 for(const [resource,config] of Object.entries(RESOURCES)){
  const url=buildAdapterUrl("https://project.supabase.co",{resource,filters:[],limit:1,offset:0});
  assert.match(url,new RegExp(`/rest/v1/${config.view}\\?`));
  assert.ok(new URL(url).searchParams.get("order"));
 }
});

test("missing and invalid JWT return 401 before adapter access",async()=>{
 let h=handler();let response=await h.handle(request({resource:"routes"},""));assert.equal(response.status,401);assert.equal(h.calls.length,0);
 h=handler({user:false});response=await h.handle(request({resource:"routes"}));assert.equal(response.status,401);assert.equal(h.calls.some(x=>x.includes("cube_routes")),false);
});

test("inactive profile returns 403",async()=>{const h=handler({active:false});const response=await h.handle(request({resource:"routes"}));assert.equal(response.status,403);assert.equal(h.calls.some(x=>x.includes("cube_routes")),false)});

test("active user can read and service secret never appears in response",async()=>{
 const h=handler({rows:[{route_key:"rt2_key"}]});const response=await h.handle(request({resource:"routes",filters:[{field:"route_date",op:"eq",value:"2026-09-04"}],limit:10,offset:0}));
 assert.equal(response.status,200);const text=await response.text();assert.doesNotMatch(text,/server-secret/);assert.deepEqual(JSON.parse(text).rows,[{route_key:"rt2_key"}]);
});

test("unknown resources, invalid pagination, filters, sorts, and injection are rejected",()=>{
 for(const body of [
  {resource:"routes;delete from routes",filters:[]},
  {resource:"routes",filters:[],limit:1001},
  {resource:"routes",filters:[{field:"warehouse",op:"eq",value:"x"}]},
  {resource:"routes",filters:[{field:"route_date",op:"eq",value:"2026-09-04)or(true"}]},
  {resource:"routePoints",filters:[{field:"route_id",op:"in",value:["1","2);drop"]}]},
  {resource:"routes",filters:[],sort:[{field:"warehouse",direction:"asc"}]}
 ])assert.throws(()=>buildAdapterUrl("https://project.supabase.co",body));
});

test("only POST is accepted and request body cannot select writes",async()=>{
 const h=handler();assert.equal((await h.handle(request({},"user-token","DELETE"))).status,405);
 const response=await h.handle(request({resource:"routes",operation:"delete",filters:[]}));
 assert.equal(response.status,400);assert.equal(h.calls.some(x=>/insert|update|delete/i.test(x)),false);
});

test("valid filters are encoded from typed values, never raw SQL",()=>{
 const url=buildAdapterUrl("https://project.supabase.co",{resource:"routes",filters:[{field:"route_date",op:"gte",value:"2026-08-24"},{field:"route_date",op:"lte",value:"2026-09-04"},{field:"id",op:"in",value:[1,2]}],sort:[{field:"route_date",direction:"asc"}],limit:1000,offset:0});
 const parsed=new URL(url);assert.deepEqual(parsed.searchParams.getAll("route_date"),["gte.2026-08-24","lte.2026-09-04"]);assert.equal(parsed.searchParams.get("id"),"in.(1,2)");assert.equal(parsed.searchParams.get("order"),"route_date.asc");
});
