-- Source Identity v2 safe-sync layer.
-- Additive only: existing production tables/routes/STV/SAV logic are not modified.
-- Base.xlsx defines actuality; Source Identity defines stable document identity.

create extension if not exists pgcrypto;

create table if not exists public.cube_sync_runs_v2 (
  id uuid primary key default gen_random_uuid(),
  source_namespace text not null,
  source_contract text not null,
  file_name text,
  source_json_sha256 text,
  requested_from date,
  requested_to date,
  base_rows integer not null default 0 check (base_rows >= 0),
  matched_base_rows integer not null default 0 check (matched_base_rows >= 0),
  unmatched_base_rows integer not null default 0 check (unmatched_base_rows >= 0),
  source_facts_total integer not null default 0 check (source_facts_total >= 0),
  active_financial_facts integer not null default 0 check (active_financial_facts >= 0),
  duplicate_base_rows integer not null default 0 check (duplicate_base_rows >= 0),
  base_amount numeric(20,4) not null default 0,
  financial_amount numeric(20,4) not null default 0,
  status text not null default 'staging' check (status in ('staging','validated','promoted','failed')),
  diagnostics jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  validated_at timestamptz,
  promoted_at timestamptz
);

create table if not exists public.cube_sync_stage_documents_v2 (
  run_id uuid not null references public.cube_sync_runs_v2(id) on delete cascade,
  financial_key text not null,
  source_contract text not null,
  source_namespace text not null,
  source_firm_id text not null,
  source_sale_id text not null,
  source_operation_id text,
  document_date date,
  route_delivery_id text,
  operation_group_id text,
  operation_code text,
  sale_code text,
  customer_id text,
  address_id text,
  delivery_address_object_id text,
  expeditor_id text,
  employee_id text,
  sender text,
  customer_name text,
  delivery_address text,
  expeditor_name text,
  employee_name text,
  settlement text,
  district text,
  region text,
  bottles numeric,
  places numeric,
  weight numeric,
  pallets numeric,
  order_amount numeric,
  included_trade_line_count integer,
  measure_issue_line_count integer,
  raw_identity jsonb not null,
  primary key (run_id, financial_key),
  unique (run_id, source_namespace, source_firm_id, source_sale_id)
);

create table if not exists public.cube_sync_stage_base_links_v2 (
  run_id uuid not null references public.cube_sync_runs_v2(id) on delete cascade,
  base_row_no integer not null,
  financial_key text not null,
  document_date date,
  route_delivery_id text,
  operation_group_id text,
  operation_code text,
  sale_code text,
  warehouse text,
  expeditor_name text,
  customer_id text,
  customer_name text,
  address_id text,
  delivery_address text,
  employee_id text,
  business_unit text,
  base_bottles numeric,
  base_places numeric,
  base_weight numeric,
  base_pallets numeric,
  base_order_amount numeric,
  raw_base jsonb not null,
  primary key (run_id, base_row_no),
  foreign key (run_id, financial_key) references public.cube_sync_stage_documents_v2(run_id, financial_key) on delete cascade
);

create table if not exists public.cube_sync_stage_movements_v2 (
  run_id uuid not null,
  financial_key text not null,
  source_move_id text not null,
  source_firm_id text,
  source_operation_id text,
  source_warehouse_id text,
  warehouse_address_id text,
  warehouse text,
  raw_movement jsonb not null,
  primary key (run_id, financial_key, source_move_id),
  foreign key (run_id, financial_key) references public.cube_sync_stage_documents_v2(run_id, financial_key) on delete cascade
);

create table if not exists public.cube_sync_stage_business_units_v2 (
  run_id uuid not null,
  financial_key text not null,
  source_business_unit_id text not null,
  business_unit_name text,
  membership_count integer,
  raw_business_unit jsonb not null,
  primary key (run_id, financial_key, source_business_unit_id),
  foreign key (run_id, financial_key) references public.cube_sync_stage_documents_v2(run_id, financial_key) on delete cascade
);

-- Promoted/current v2 snapshot. These tables are intentionally separate from the
-- legacy app tables until v2 control totals are approved.
create table if not exists public.cube_documents_current_v2 (
  financial_key text primary key,
  source_contract text not null,
  source_namespace text not null,
  source_firm_id text not null,
  source_sale_id text not null,
  source_operation_id text,
  document_date date,
  route_delivery_id text,
  operation_group_id text,
  operation_code text,
  sale_code text,
  customer_id text,
  address_id text,
  delivery_address_object_id text,
  expeditor_id text,
  employee_id text,
  sender text,
  customer_name text,
  delivery_address text,
  expeditor_name text,
  employee_name text,
  settlement text,
  district text,
  region text,
  bottles numeric,
  places numeric,
  weight numeric,
  pallets numeric,
  order_amount numeric,
  included_trade_line_count integer,
  measure_issue_line_count integer,
  raw_identity jsonb not null,
  promoted_run_id uuid not null references public.cube_sync_runs_v2(id),
  unique (source_namespace, source_firm_id, source_sale_id)
);

create table if not exists public.cube_base_links_current_v2 (
  promoted_run_id uuid not null references public.cube_sync_runs_v2(id),
  base_row_no integer not null,
  financial_key text not null references public.cube_documents_current_v2(financial_key) on delete cascade,
  document_date date,
  route_delivery_id text,
  operation_group_id text,
  operation_code text,
  sale_code text,
  warehouse text,
  expeditor_name text,
  customer_id text,
  customer_name text,
  address_id text,
  delivery_address text,
  employee_id text,
  business_unit text,
  base_bottles numeric,
  base_places numeric,
  base_weight numeric,
  base_pallets numeric,
  base_order_amount numeric,
  raw_base jsonb not null,
  primary key (promoted_run_id, base_row_no)
);

create table if not exists public.cube_movements_current_v2 (
  financial_key text not null references public.cube_documents_current_v2(financial_key) on delete cascade,
  source_move_id text not null,
  source_firm_id text,
  source_operation_id text,
  source_warehouse_id text,
  warehouse_address_id text,
  warehouse text,
  raw_movement jsonb not null,
  promoted_run_id uuid not null references public.cube_sync_runs_v2(id),
  primary key (financial_key, source_move_id)
);

create table if not exists public.cube_business_units_current_v2 (
  financial_key text not null references public.cube_documents_current_v2(financial_key) on delete cascade,
  source_business_unit_id text not null,
  business_unit_name text,
  membership_count integer,
  raw_business_unit jsonb not null,
  promoted_run_id uuid not null references public.cube_sync_runs_v2(id),
  primary key (financial_key, source_business_unit_id)
);

create index if not exists cube_stage_base_links_financial_idx on public.cube_sync_stage_base_links_v2(run_id, financial_key);
create index if not exists cube_documents_current_date_idx on public.cube_documents_current_v2(document_date);
create index if not exists cube_documents_current_route_idx on public.cube_documents_current_v2(document_date, route_delivery_id);
create index if not exists cube_base_links_current_financial_idx on public.cube_base_links_current_v2(financial_key);

create or replace function public.promote_cube_sync_run_v2(p_run_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.cube_sync_runs_v2%rowtype;
  staged_docs integer;
  staged_links integer;
  staged_amount numeric;
begin
  select * into r from public.cube_sync_runs_v2 where id = p_run_id for update;
  if not found then raise exception 'sync run not found'; end if;
  if r.status <> 'validated' then raise exception 'sync run must be validated before promotion'; end if;
  if r.unmatched_base_rows <> 0 then raise exception 'unmatched base rows must be zero'; end if;
  if r.base_rows <> r.matched_base_rows then raise exception 'base rows and matched rows differ'; end if;

  select count(*), coalesce(sum(order_amount),0) into staged_docs, staged_amount
  from public.cube_sync_stage_documents_v2 where run_id = p_run_id;
  select count(*) into staged_links from public.cube_sync_stage_base_links_v2 where run_id = p_run_id;

  if staged_docs <> r.active_financial_facts then raise exception 'staged financial fact count mismatch'; end if;
  if staged_links <> r.base_rows then raise exception 'staged base link count mismatch'; end if;
  if abs(staged_amount - r.financial_amount) > 0.01 then raise exception 'staged financial amount mismatch'; end if;

  delete from public.cube_business_units_current_v2;
  delete from public.cube_movements_current_v2;
  delete from public.cube_base_links_current_v2;
  delete from public.cube_documents_current_v2;

  insert into public.cube_documents_current_v2
  select financial_key,source_contract,source_namespace,source_firm_id,source_sale_id,source_operation_id,
         document_date,route_delivery_id,operation_group_id,operation_code,sale_code,customer_id,address_id,
         delivery_address_object_id,expeditor_id,employee_id,sender,customer_name,delivery_address,expeditor_name,
         employee_name,settlement,district,region,bottles,places,weight,pallets,order_amount,included_trade_line_count,
         measure_issue_line_count,raw_identity,p_run_id
  from public.cube_sync_stage_documents_v2 where run_id = p_run_id;

  insert into public.cube_base_links_current_v2
  select p_run_id,base_row_no,financial_key,document_date,route_delivery_id,operation_group_id,operation_code,sale_code,
         warehouse,expeditor_name,customer_id,customer_name,address_id,delivery_address,employee_id,business_unit,
         base_bottles,base_places,base_weight,base_pallets,base_order_amount,raw_base
  from public.cube_sync_stage_base_links_v2 where run_id = p_run_id;

  insert into public.cube_movements_current_v2
  select financial_key,source_move_id,source_firm_id,source_operation_id,source_warehouse_id,warehouse_address_id,
         warehouse,raw_movement,p_run_id
  from public.cube_sync_stage_movements_v2 where run_id = p_run_id;

  insert into public.cube_business_units_current_v2
  select financial_key,source_business_unit_id,business_unit_name,membership_count,raw_business_unit,p_run_id
  from public.cube_sync_stage_business_units_v2 where run_id = p_run_id;

  update public.cube_sync_runs_v2 set status='promoted', promoted_at=now() where id=p_run_id;

  return jsonb_build_object('runId',p_run_id,'financialFacts',staged_docs,'baseRows',staged_links,'financialAmount',staged_amount);
end;
$$;

revoke all on public.cube_sync_runs_v2,
  public.cube_sync_stage_documents_v2,public.cube_sync_stage_base_links_v2,
  public.cube_sync_stage_movements_v2,public.cube_sync_stage_business_units_v2,
  public.cube_documents_current_v2,public.cube_base_links_current_v2,
  public.cube_movements_current_v2,public.cube_business_units_current_v2
from anon, authenticated;

revoke all on function public.promote_cube_sync_run_v2(uuid) from public, anon, authenticated;
