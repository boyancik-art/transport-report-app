import { createClient } from "npm:@supabase/supabase-js@2.112.4";
import { checksum, ENTITY_TYPES, type EntityType } from "./chunk-protocol.ts";

const CORS={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type, x-cube-sync-token"};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...CORS,"Content-Type":"application/json"}});
const details=(error:any)=>({message:error?.message??String(error),code:error?.code??null,details:error?.details??null,hint:error?.hint??null});
async function must<T>(stage:string,operation:PromiseLike<{data:T;error:any}>){const {data,error}=await operation;if(error)throw {stage,...details(error)};return data;}

Deno.serve(async(req)=>{
  if(req.method==="OPTIONS")return new Response("ok",{headers:CORS});
  if(req.method!=="POST")return json({ok:false,error:"POST only"},405);
  let stage="authorization";let runId:string|null=null;
  const token=Deno.env.get("CUBE_SYNC_V2_TOKEN");
  if(!token||req.headers.get("x-cube-sync-token")!==token)return json({ok:false,stage,error:{message:"Unauthorized safe-sync request"},promoted:false},401);
  const db=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  try{
    const body=await req.json();const action=body?.action;
    if(action==="start"){
      stage="start_run";if(body.promote===true)throw new Error("promotion is a separate explicit operation");
      const run=body.run,expected=body.expected,expectedChunks=body.expectedChunks;if(!run||!expected||!expectedChunks)throw new Error("run, expected and expectedChunks are required");
      for(const type of ENTITY_TYPES)if(!Number.isInteger(expectedChunks[type])||expectedChunks[type]<0)throw new Error(`invalid expected chunk count: ${type}`);
      const existing:any=await must("idempotency_lookup",db.from("cube_sync_runs_v2").select("id,status,validation_report").eq("source_namespace",run.source_namespace).eq("source_json_sha256",run.source_json_sha256).maybeSingle());
      if(existing)return json({ok:true,runId:existing.id,status:existing.status,idempotent:true,promoted:existing.status==="promoted"});
      const created:any=await must("start_run",db.from("cube_sync_runs_v2").insert({source_namespace:run.source_namespace,source_contract:run.source_contract,file_name:run.file_name,source_json_sha256:run.source_json_sha256,requested_from:run.requested_from,requested_to:run.requested_to,source_facts_total:run.source_facts_total,status:"staging",validation_report:expected,diagnostics:{transport:"chunked-v2",expectedChunks}}).select("id").single());
      return json({ok:true,runId:created.id,status:"staging",idempotent:false,promoted:false});
    }
    runId=String(body?.runId??"");if(!runId)throw new Error("runId is required");
    if(action==="chunk"){
      stage="verify_chunk";const entityType=body.entityType as EntityType,records=body.records,chunkIndex=body.chunkIndex,supplied=body.checksum;
      if(!ENTITY_TYPES.includes(entityType)||!Number.isInteger(chunkIndex)||chunkIndex<0||!Array.isArray(records)||!records.length||records.length>500)throw new Error("invalid chunk envelope");
      if(await checksum(records)!==supplied)return json({ok:false,stage,error:{message:"chunk checksum mismatch"},runId,promoted:false},400);
      stage="ingest_chunk";const result:any=await must("ingest_chunk",db.rpc("ingest_cube_sync_chunk_v2",{p_run_id:runId,p_entity_type:entityType,p_chunk_index:chunkIndex,p_checksum:supplied,p_records:records}));
      return json({ok:true,runId,entityType,chunkIndex,...result,promoted:false});
    }
    if(action==="finalize"){
      stage="finalize";if(body.promote===true)throw new Error("finalize never promotes");
      const result:any=await must("finalize",db.rpc("finalize_cube_sync_run_v2",{p_run_id:runId,p_expected:body.expected}));
      return json({ok:true,runId,...result,status:"validated",validationPassed:true,promoted:false});
    }
    if(action==="promote"){
      stage="explicit_promotion";const result:any=await must("explicit_promotion",db.rpc("promote_cube_sync_run_v2",{p_run_id:runId}));return json({ok:true,runId,...result,promoted:true});
    }
    throw new Error("action must be start, chunk, finalize, or promote");
  }catch(error){const failure=details(error);console.error("import-cube-v2 failed",{stage,runId,error:failure});return json({ok:false,stage,runId,error:failure,validationPassed:false,promoted:false,legacyProductionTablesTouched:false},400);}
});
