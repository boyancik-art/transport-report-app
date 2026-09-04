import type { JsonRecord, SafeSyncBuild } from "./core.ts";

export type ExistingRun = { id: string; status: "staging"|"validated"|"promoted"|"failed"; validation_report?: JsonRecord };
export interface SafeSyncStore {
  find(namespace: unknown, hash: string): Promise<ExistingRun|null>;
  stage(build: SafeSyncBuild): Promise<string>;
  validate(runId: string, expected: JsonRecord): Promise<void>;
  promote(runId: string): Promise<JsonRecord>;
}

export type SafeSyncOptions = { promote?: boolean };

export async function executeSafeSync(store: SafeSyncStore, build: SafeSyncBuild, hash: string, options: SafeSyncOptions = {}) {
  const promotionRequested=options.promote === true;
  const existing=await store.find(build.run.source_namespace,hash);
  if(existing?.status==="promoted") return {...existing.validation_report,runId:existing.id,idempotent:true,promoted:true};
  if(existing?.status==="failed") throw new Error("Identical payload previously failed validation");
  if(existing?.status==="staging") throw new Error("Identical payload has an incomplete staging run");
  if(existing?.status==="validated" && !promotionRequested)
    return {...existing.validation_report,runId:existing.id,idempotent:true,status:"validated",validationPassed:true,promoted:false};
  const runId=existing?.id ?? await store.stage(build);
  if(!existing) await store.validate(runId,build.report);
  if(!promotionRequested)
    return {...build.report,runId,idempotent:false,status:"validated",validationPassed:true,promoted:false};
  const promoted=await store.promote(runId);
  return {...promoted,runId,idempotent:Boolean(existing),validationPassed:true,promoted:true};
}
