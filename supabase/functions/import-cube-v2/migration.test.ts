import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const sql=readFileSync(new URL("../../migrations/20260904090000_source_identity_safe_sync_v2.sql",import.meta.url),"utf8");
test("migration uses text source IDs and payload idempotency key",()=>{assert.match(sql,/source_sale_id text not null/);assert.match(sql,/source_move_id text not null/);assert.match(sql,/unique\(source_namespace,source_json_sha256\)/)});
test("validation is mandatory before current snapshot mutation",()=>{const validate=sql.indexOf("status='validated'");const requireValidated=sql.indexOf("validated sync run required");const mutate=sql.indexOf("delete from public.cube_documents_current_v2");assert.ok(validate>=0&&requireValidated>validate&&mutate>requireValidated)});
test("promotion is serialized and implemented by one database function",()=>{assert.match(sql,/pg_advisory_xact_lock/);assert.match(sql,/create function public\.promote_cube_sync_run_v2/);assert.match(sql,/atomic promotion verification failed/)});
test("RLS and restricted function execution are present",()=>{assert.equal((sql.match(/enable row level security/g)??[]).length,9);assert.match(sql,/revoke all on function public\.validate_cube_sync_run_v2/);assert.match(sql,/from public,anon,authenticated/)});
test("migration does not mutate legacy production tables",()=>{const mutations=[...sql.matchAll(/\b(?:insert into|update|delete from|truncate table)\s+public\.([a-z0-9_]+)/gi)].map(x=>x[1]);assert.ok(mutations.length>0);assert.ok(mutations.every(name=>name.endsWith("_v2")),mutations.join(", "))});
