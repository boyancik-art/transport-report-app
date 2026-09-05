export type AdapterResource="routes"|"routePoints"|"locations"|"sourceDocuments"|"businessAllocations"|"routeFacts"|"routeExtraPoints"|"pointTariffOverrides"|"courierShipmentPoints";
type FieldType="date"|"integer"|"key";
type ResourceConfig={view:string;filters:Record<string,FieldType>;sorts:readonly string[];defaultOrder:readonly string[]};

export const RESOURCES:Record<AdapterResource,ResourceConfig>={
 routes:{view:"cube_routes_legacy_adapter_v2",filters:{route_date:"date",id:"integer",route_key:"key"},sorts:["route_date","route_delivery_id","id"],defaultOrder:["route_date","route_delivery_id","id"]},
 routePoints:{view:"cube_route_points_legacy_adapter_v2",filters:{id:"integer",route_id:"integer",route_key:"key",point_key:"key"},sorts:["id","route_id","route_key","point_key"],defaultOrder:["id"]},
 locations:{view:"cube_locations_legacy_adapter_v2",filters:{id:"integer"},sorts:["id"],defaultOrder:["id"]},
 sourceDocuments:{view:"cube_source_documents_legacy_adapter_v2",filters:{document_date:"date",route_key:"key",point_key:"key"},sorts:["document_date","id","route_key","point_key"],defaultOrder:["id"]},
 businessAllocations:{view:"cube_route_business_allocations_legacy_adapter_v2",filters:{route_point_id:"integer",route_key:"key",point_key:"key"},sorts:["route_point_id","id","route_key","point_key"],defaultOrder:["id"]},
 routeFacts:{view:"cube_route_facts_legacy_adapter_v2",filters:{route_id:"integer",route_key:"key"},sorts:["id","route_id","route_key"],defaultOrder:["id"]},
 routeExtraPoints:{view:"cube_route_extra_points_legacy_adapter_v2",filters:{route_id:"integer",route_key:"key"},sorts:["id","route_id","route_key"],defaultOrder:["id"]},
 pointTariffOverrides:{view:"cube_point_tariff_overrides_legacy_adapter_v2",filters:{route_point_id:"integer",route_key:"key",point_key:"key"},sorts:["id","route_point_id","point_key"],defaultOrder:["id"]},
 courierShipmentPoints:{view:"cube_courier_shipment_points_legacy_adapter_v2",filters:{route_id:"integer",route_point_id:"integer",route_key:"key",point_key:"key"},sorts:["id","route_id","route_point_id","point_key"],defaultOrder:["id"]}
};
const OPS={date:new Set(["eq","gte","lte"]),integer:new Set(["eq","in"]),key:new Set(["eq","in"])};
const DATE=/^\d{4}-\d{2}-\d{2}$/;
const INTEGER=/^[1-9]\d{0,18}$/;
const KEY=/^[A-Za-z0-9_-]{1,128}$/;
const json=(body:unknown,status=200,headers:HeadersInit={})=>new Response(JSON.stringify(body),{status,headers:{"Content-Type":"application/json","Cache-Control":"no-store",...headers}});

function value(type:FieldType,op:string,input:unknown){
 const values:unknown[]=op==="in"?(Array.isArray(input)?input:[]):[input];
 if(!values.length||values.length>150)throw new Error("invalid filter value");
 const pattern=type==="date"?DATE:type==="integer"?INTEGER:KEY;
 const clean=values.map(v=>String(v));if(clean.some(v=>!pattern.test(v)))throw new Error("invalid filter value");
 return op==="in"?`in.(${clean.join(",")})`:`${op}.${clean[0]}`;
}
export function buildAdapterUrl(base:string,body:any){
 if(!body||typeof body!=="object"||Array.isArray(body)||Object.keys(body).some(key=>!["resource","filters","limit","offset","sort"].includes(key)))throw new Error("invalid request fields");
 const config=RESOURCES[body?.resource as AdapterResource];if(!config)throw new Error("unknown resource");
 const limit=body.limit===undefined?1000:Number(body.limit),offset=body.offset===undefined?0:Number(body.offset);
 if(!Number.isInteger(limit)||limit<1||limit>1000)throw new Error("invalid limit");
 if(!Number.isInteger(offset)||offset<0||offset>100000)throw new Error("invalid offset");
 const params=new URLSearchParams({select:"*",limit:String(limit),offset:String(offset)});
 const filters=body.filters??[];if(!Array.isArray(filters)||filters.length>12)throw new Error("invalid filters");
 for(const filter of filters){
  const field=filter?.field,type=config.filters[field];if(!type||!OPS[type].has(filter?.op))throw new Error("filter not allowed");
  params.append(field,value(type,filter.op,filter.value));
 }
 const sorts=body.sort===undefined?[]:Array.isArray(body.sort)?body.sort:[];
 if(sorts.length>3)throw new Error("invalid sort");
 const order=sorts.length?sorts.map((sort:any)=>{if(!sort||!config.sorts.includes(sort.field)||!["asc","desc"].includes(sort.direction))throw new Error("sort not allowed");return `${sort.field}.${sort.direction}`}):config.defaultOrder.map(field=>`${field}.asc`);
 params.set("order",order.join(","));
 return `${base}/rest/v1/${config.view}?${params}`;
}

export type HandlerEnv={url:string;anonKey:string;serviceKey:string;fetchImpl?:typeof fetch};
export function createHandler(env:HandlerEnv){
 const fetchImpl=env.fetchImpl??fetch;
 const serviceHeaders={apikey:env.serviceKey,Authorization:`Bearer ${env.serviceKey}`};
 return async(req:Request)=>{
  const origin=req.headers.get("origin")??"",allowed=/^https:\/\/(?:[a-z0-9-]+\.)?transport-report-ts-web\.pages\.dev$/.test(origin);
  const cors={"Access-Control-Allow-Origin":allowed?origin:"https://transport-report-ts-web.pages.dev","Access-Control-Allow-Headers":"authorization,apikey,content-type","Access-Control-Allow-Methods":"POST,OPTIONS","Vary":"Origin"};
  if(!allowed)return json({error:"Origin not allowed"},403,cors);
  if(req.method==="OPTIONS")return new Response(null,{status:204,headers:cors});
  if(req.method!=="POST")return json({error:"Method not allowed"},405,cors);
  const auth=req.headers.get("authorization")??"";if(!auth.startsWith("Bearer "))return json({error:"Authentication required"},401,cors);
  const userResponse=await fetchImpl(`${env.url}/auth/v1/user`,{headers:{apikey:env.anonKey,Authorization:auth}});
  if(!userResponse.ok)return json({error:"Invalid or expired session"},401,cors);
  const user=await userResponse.json();if(!user?.id)return json({error:"Invalid or expired session"},401,cors);
  const profileUrl=`${env.url}/rest/v1/profiles?id=eq.${encodeURIComponent(user.id)}&active=eq.true&select=id&limit=1`;
  const profileResponse=await fetchImpl(profileUrl,{headers:serviceHeaders});
  if(!profileResponse.ok)return json({error:"Profile verification failed"},503,cors);
  const profiles=await profileResponse.json();if(!Array.isArray(profiles)||profiles.length!==1)return json({error:"Profile access denied"},403,cors);
  const length=Number(req.headers.get("content-length")??0);if(length>16384)return json({error:"Request too large"},413,cors);
  let body;try{const raw=await req.text();if(raw.length>16384)throw new Error("Request too large");body=JSON.parse(raw)}catch(error){return json({error:error instanceof Error?error.message:"Invalid JSON"},400,cors)}
  let url;try{url=buildAdapterUrl(env.url,body)}catch(error){return json({error:error instanceof Error?error.message:"Invalid request"},400,cors)}
  const result=await fetchImpl(url,{headers:serviceHeaders});
  if(!result.ok)return json({error:"Adapter read failed"},result.status>=500?502:400,cors);
  const rows=await result.json();return json({resource:body.resource,rows,limit:body.limit??1000,offset:body.offset??0},200,cors);
 };
}
