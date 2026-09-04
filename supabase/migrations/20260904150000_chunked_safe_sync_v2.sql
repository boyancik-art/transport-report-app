-- Additive transport metadata for low-memory, idempotent Safe Sync v2 staging.
-- No legacy tables or current-v2 rows are mutated by this migration.
alter table public.cube_sync_stage_documents_v2 alter column raw_identity drop not null;
alter table public.cube_sync_stage_base_links_v2 alter column raw_base drop not null;
alter table public.cube_sync_stage_movements_v2 alter column raw_movement drop not null;
alter table public.cube_sync_stage_business_units_v2 alter column raw_business_unit drop not null;
alter table public.cube_documents_current_v2 alter column raw_identity drop not null;
alter table public.cube_base_links_current_v2 alter column raw_base drop not null;
alter table public.cube_movements_current_v2 alter column raw_movement drop not null;
alter table public.cube_business_units_current_v2 alter column raw_business_unit drop not null;

create table public.cube_sync_chunks_v2 (
  run_id uuid not null references public.cube_sync_runs_v2(id) on delete cascade,
  entity_type text not null check(entity_type in ('documents','baseLinks','movements','businessLinks')),
  chunk_index integer not null check(chunk_index>=0), checksum text not null check(checksum~'^[0-9a-f]{64}$'),
  record_count integer not null check(record_count between 1 and 500), received_at timestamptz not null default now(),
  primary key(run_id,entity_type,chunk_index)
);
alter table public.cube_sync_chunks_v2 enable row level security;
revoke all on public.cube_sync_chunks_v2 from anon,authenticated;
grant all on public.cube_sync_chunks_v2 to service_role;

create function public.ingest_cube_sync_chunk_v2(
  p_run_id uuid,p_entity_type text,p_chunk_index integer,p_checksum text,p_records jsonb
) returns jsonb language plpgsql security definer set search_path='' as $$
declare r public.cube_sync_runs_v2%rowtype; prior public.cube_sync_chunks_v2%rowtype; n integer;
begin
  select * into r from public.cube_sync_runs_v2 where id=p_run_id for update;
  if not found or r.status<>'staging' then raise exception 'staging sync run not found'; end if;
  if p_entity_type not in ('documents','baseLinks','movements','businessLinks') or p_chunk_index<0
    or jsonb_typeof(p_records)<>'array' then raise exception 'invalid chunk envelope'; end if;
  n=jsonb_array_length(p_records); if n<1 or n>500 then raise exception 'invalid chunk record count'; end if;
  select * into prior from public.cube_sync_chunks_v2 where run_id=p_run_id and entity_type=p_entity_type and chunk_index=p_chunk_index;
  if found then
    if prior.checksum<>p_checksum or prior.record_count<>n then raise exception 'chunk retry checksum mismatch'; end if;
    return jsonb_build_object('idempotent',true,'recordCount',n);
  end if;
  if p_entity_type='documents' then
    insert into public.cube_sync_stage_documents_v2
      select (x).* from jsonb_populate_recordset(null::public.cube_sync_stage_documents_v2,
        (select jsonb_agg(value||jsonb_build_object('run_id',p_run_id)) from jsonb_array_elements(p_records))) x;
  elsif p_entity_type='baseLinks' then
    insert into public.cube_sync_stage_base_links_v2
      select (x).* from jsonb_populate_recordset(null::public.cube_sync_stage_base_links_v2,
        (select jsonb_agg(value||jsonb_build_object('run_id',p_run_id)) from jsonb_array_elements(p_records))) x;
  elsif p_entity_type='movements' then
    insert into public.cube_sync_stage_movements_v2
      select (x).* from jsonb_populate_recordset(null::public.cube_sync_stage_movements_v2,
        (select jsonb_agg(value||jsonb_build_object('run_id',p_run_id)) from jsonb_array_elements(p_records))) x;
  else
    insert into public.cube_sync_stage_business_units_v2
      select (x).* from jsonb_populate_recordset(null::public.cube_sync_stage_business_units_v2,
        (select jsonb_agg(value||jsonb_build_object('run_id',p_run_id)) from jsonb_array_elements(p_records))) x;
  end if;
  insert into public.cube_sync_chunks_v2 values(p_run_id,p_entity_type,p_chunk_index,p_checksum,n,now());
  return jsonb_build_object('idempotent',false,'recordCount',n);
end $$;

create function public.finalize_cube_sync_run_v2(p_run_id uuid,p_expected jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare r public.cube_sync_runs_v2%rowtype; entity text; expected_chunks integer; actual_chunks integer; min_chunk integer; max_chunk integer;
begin
  select * into r from public.cube_sync_runs_v2 where id=p_run_id for update;
  if not found or r.status<>'staging' then raise exception 'staging sync run not found'; end if;
  if p_expected is distinct from r.validation_report then raise exception 'final controls differ from start controls'; end if;
  foreach entity in array array['documents','baseLinks','movements','businessLinks'] loop
    expected_chunks=coalesce((r.diagnostics->'expectedChunks'->>entity)::integer,-1);
    select count(*),min(chunk_index),max(chunk_index) into actual_chunks,min_chunk,max_chunk
      from public.cube_sync_chunks_v2 where run_id=p_run_id and entity_type=entity;
    if expected_chunks<0 or actual_chunks<>expected_chunks
      or (expected_chunks>0 and (min_chunk<>0 or max_chunk<>expected_chunks-1))
      then raise exception 'missing or non-contiguous chunks for %',entity; end if;
  end loop;
  perform public.validate_cube_sync_run_v2(p_run_id,p_expected);
  return p_expected||jsonb_build_object('status','validated','validationPassed',true,'promoted',false);
end $$;

revoke all on function public.ingest_cube_sync_chunk_v2(uuid,text,integer,text,jsonb),public.finalize_cube_sync_run_v2(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.ingest_cube_sync_chunk_v2(uuid,text,integer,text,jsonb),public.finalize_cube_sync_run_v2(uuid,jsonb) to service_role;
