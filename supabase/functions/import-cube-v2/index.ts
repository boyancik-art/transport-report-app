import { createClient } from "npm:@supabase/supabase-js@2.112.4";
import { buildSafeSync, type JsonRecord, type SafeSyncBuild } from "./core.ts";
import { executeSafeSync, type SafeSyncStore } from "./workflow.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cube-sync-token",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers:{...CORS,"Content-Type":"application/json"} });
const details = (error: any) => ({message:error?.message ?? String(error),code:error?.code ?? null,details:error?.details ?? null,hint:error?.hint ?? null});
async function sha256(bytes: Uint8Array) { const digest=await crypto.subtle.digest("SHA-256",bytes); return [...new Uint8Array(digest)].map(x=>x.toString(16).padStart(2,"0")).join(""); }
async function must<T>(stage:string, operation:PromiseLike<{data:T;error:any}>){const {data,error}=await operation;if(error)throw {stage,...details(error)};return data;}
const chunks=<T>(rows:T[],size=250)=>Array.from({length:Math.ceil(rows.length/size)},(_,i)=>rows.slice(i*size,(i+1)*size));

Deno.serve(async(req)=>{
  if(req.method==="OPTIONS") return new Response("ok",{headers:CORS});
  if(req.method!=="POST") return json({ok:false,error:"POST only"},405);
  let stage="authorization"; let runId:string|null=null;
  const syncToken=Deno.env.get("CUBE_SYNC_V2_TOKEN");
  if(!syncToken || req.headers.get("x-cube-sync-token")!==syncToken)
    return json({ok:false,stage,error:{message:"Unauthorized safe-sync request"},validationPassed:false,promoted:false},401);

  const db=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  try {
    stage="read_source_identity";
    const form=await req.formData(); const file=form.get("source_identity");
    if(!(file instanceof File)) throw new Error("field 'source_identity' JSON file required");
    const bytes=new Uint8Array(await file.arrayBuffer()); const sourceHash=await sha256(bytes);
    stage="validate_payload";
    const built=buildSafeSync(JSON.parse(new TextDecoder().decode(bytes)),sourceHash,file.name);

    const withRun=(rows:JsonRecord[])=>rows.map(row=>({run_id:runId,...row}));
    const store:SafeSyncStore={
      find:async(namespace,hash)=>{
        stage="idempotency_lookup";
        return await must("idempotency_lookup",db.from("cube_sync_runs_v2").select("id,status,validation_report").eq("source_namespace",namespace).eq("source_json_sha256",hash).maybeSingle()) as any;
      },
      stage:async(build:SafeSyncBuild)=>{
        stage="create_staging_run";
        const created:any=await must("create_staging_run",db.from("cube_sync_runs_v2").insert({
          source_namespace:build.run.source_namespace,source_contract:build.run.source_contract,
          file_name:build.run.file_name,source_json_sha256:sourceHash,requested_from:build.run.requested_from,
          requested_to:build.run.requested_to,source_facts_total:build.run.source_facts_total,
          status:"staging",validation_report:build.report,
        }).select("id").single());
        runId=created.id;
        for(const [name,table,rows] of [
          ["stage_documents","cube_sync_stage_documents_v2",build.documents],
          ["stage_base_links","cube_sync_stage_base_links_v2",build.baseLinks],
          ["stage_movements","cube_sync_stage_movements_v2",build.movements],
          ["stage_business_links","cube_sync_stage_business_units_v2",build.businessLinks],
        ] as const) {
          stage=name;
          for(const part of chunks(withRun(rows))) await must(name,db.from(table).insert(part));
        }
        return runId!;
      },
      validate:async(id,expected)=>{stage="validate_staging";await must("validate_staging",db.rpc("validate_cube_sync_run_v2",{p_run_id:id,p_expected:expected}));},
      promote:async(id)=>{stage="atomic_promotion";return await must("atomic_promotion",db.rpc("promote_cube_sync_run_v2",{p_run_id:id})) as JsonRecord;},
    };
    const promotionRequested=new URL(req.url).searchParams.get("promote") === "true";
    const result=await executeSafeSync(store,built,sourceHash,{promote:promotionRequested});
    runId=result.runId;
    return json({ok:true,...result,legacyProductionTablesTouched:false});
  } catch(error){
    const failure=details(error); console.error("import-cube-v2 failed",{stage,runId,error:failure});
    if(runId) await db.from("cube_sync_runs_v2").update({status:"failed",diagnostics:{failureStage:stage,error:failure}}).eq("id",runId).neq("status","promoted");
    return json({ok:false,stage,runId,error:failure,validationPassed:false,promoted:false,legacyProductionTablesTouched:false},400);
  }
});
