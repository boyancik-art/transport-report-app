import type { JsonRecord, SafeSyncBuild } from "./core.ts";

export const CHUNK_SIZE = 250;
export type EntityType = "documents" | "baseLinks" | "movements" | "businessLinks";
export const ENTITY_TYPES: EntityType[] = ["documents", "baseLinks", "movements", "businessLinks"];

export function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.entries(value as JsonRecord).sort(([a],[b])=>a<b?-1:a>b?1:0).map(([k,v])=>`${JSON.stringify(k)}:${stableJson(v)}`).join(",")}}`;
  return JSON.stringify(value);
}
export async function checksum(records: JsonRecord[]): Promise<string> {
  const digest=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(stableJson(records)));
  return [...new Uint8Array(digest)].map(x=>x.toString(16).padStart(2,"0")).join("");
}
export function splitBuild(build: SafeSyncBuild,size=CHUNK_SIZE) {
  if(!Number.isInteger(size)||size<1||size>500) throw new Error("chunk size must be between 1 and 500");
  return ENTITY_TYPES.flatMap(entityType=>{const rows=build[entityType] as JsonRecord[];return Array.from({length:Math.ceil(rows.length/size)},(_,chunkIndex)=>({entityType,chunkIndex,records:rows.slice(chunkIndex*size,(chunkIndex+1)*size)}));});
}
export function chunkCounts(build: SafeSyncBuild,size=CHUNK_SIZE):Record<EntityType,number>{return Object.fromEntries(ENTITY_TYPES.map(type=>[type,Math.ceil((build[type] as JsonRecord[]).length/size)])) as Record<EntityType,number>;}
