-- Additive Source Identity Safe Sync v2. Existing production/STV/SAV tables are untouched.
create extension if not exists pgcrypto;

create table public.cube_sync_runs_v2 (
  id uuid primary key default gen_random_uuid(), source_namespace text not null, source_contract text not null,
  file_name text, source_json_sha256 text not null, requested_from date, requested_to date,
  source_facts_total integer not null check(source_facts_total>=0), status text not null default 'staging'
    check(status in ('staging','validated','promoted','failed')),
  validation_report jsonb not null default '{}'::jsonb, diagnostics jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(), validated_at timestamptz, promoted_at timestamptz,
  unique(source_namespace,source_json_sha256)
);
create table public.cube_sync_stage_documents_v2 (
  run_id uuid not null references public.cube_sync_runs_v2(id) on delete cascade, financial_key text not null,
  source_contract text not null, source_namespace text not null, source_firm_id text not null, source_sale_id text not null,
  source_operation_id text, document_date date, route_delivery_id text, operation_group_id text, operation_code text,
  sale_code text, customer_id text, address_id text, delivery_address_object_id text, expeditor_id text, employee_id text,
  sender text, customer_name text, delivery_address text, expeditor_name text, employee_name text, settlement text,
  district text, region text, bottles numeric not null, places numeric not null, weight numeric not null,
  pallets numeric not null, order_amount numeric not null, included_trade_line_count integer,
  measure_issue_line_count integer, raw_identity jsonb not null,
  primary key(run_id,financial_key), unique(run_id,source_namespace,source_firm_id,source_sale_id)
);
create table public.cube_sync_stage_base_links_v2 (
  run_id uuid not null, base_row_no integer not null, financial_key text not null, document_date date,
  route_delivery_id text, operation_group_id text, operation_code text, sale_code text, warehouse text,
  expeditor_name text, customer_id text, customer_name text, address_id text, delivery_address text,
  employee_id text, business_unit text, base_bottles numeric, base_places numeric, base_weight numeric,
  base_pallets numeric, base_order_amount numeric, raw_base jsonb not null,
  primary key(run_id,base_row_no), foreign key(run_id,financial_key)
    references public.cube_sync_stage_documents_v2(run_id,financial_key) on delete cascade
);
create table public.cube_sync_stage_movements_v2 (
  run_id uuid not null, financial_key text not null, source_move_id text not null, source_firm_id text,
  source_operation_id text, source_warehouse_id text, warehouse_address_id text, warehouse text, raw_movement jsonb not null,
  primary key(run_id,financial_key,source_move_id), foreign key(run_id,financial_key)
    references public.cube_sync_stage_documents_v2(run_id,financial_key) on delete cascade
);
create table public.cube_sync_stage_business_units_v2 (
  run_id uuid not null, financial_key text not null, source_business_unit_id text not null,
  business_unit_name text, membership_count integer, raw_business_unit jsonb not null,
  primary key(run_id,financial_key,source_business_unit_id), foreign key(run_id,financial_key)
    references public.cube_sync_stage_documents_v2(run_id,financial_key) on delete cascade
);

create table public.cube_documents_current_v2 (
  financial_key text primary key, source_contract text not null, source_namespace text not null,
  source_firm_id text not null, source_sale_id text not null, source_operation_id text, document_date date,
  route_delivery_id text, operation_group_id text, operation_code text, sale_code text, customer_id text,
  address_id text, delivery_address_object_id text, expeditor_id text, employee_id text, sender text,
  customer_name text, delivery_address text, expeditor_name text, employee_name text, settlement text,
  district text, region text, bottles numeric not null, places numeric not null, weight numeric not null,
  pallets numeric not null, order_amount numeric not null, included_trade_line_count integer,
  measure_issue_line_count integer, raw_identity jsonb not null,
  promoted_run_id uuid not null references public.cube_sync_runs_v2(id),
  unique(source_namespace,source_firm_id,source_sale_id)
);
create table public.cube_base_links_current_v2 (
  promoted_run_id uuid not null references public.cube_sync_runs_v2(id), base_row_no integer not null,
  financial_key text not null references public.cube_documents_current_v2(financial_key) on delete cascade,
  document_date date, route_delivery_id text, operation_group_id text, operation_code text, sale_code text,
  warehouse text, expeditor_name text, customer_id text, customer_name text, address_id text,
  delivery_address text, employee_id text, business_unit text, base_bottles numeric, base_places numeric,
  base_weight numeric, base_pallets numeric, base_order_amount numeric, raw_base jsonb not null,
  primary key(promoted_run_id,base_row_no)
);
create table public.cube_movements_current_v2 (
  financial_key text not null references public.cube_documents_current_v2(financial_key) on delete cascade,
  source_move_id text not null, source_firm_id text, source_operation_id text, source_warehouse_id text,
  warehouse_address_id text, warehouse text, raw_movement jsonb not null,
  promoted_run_id uuid not null references public.cube_sync_runs_v2(id), primary key(financial_key,source_move_id)
);
create table public.cube_business_units_current_v2 (
  financial_key text not null references public.cube_documents_current_v2(financial_key) on delete cascade,
  source_business_unit_id text not null, business_unit_name text, membership_count integer,
  raw_business_unit jsonb not null, promoted_run_id uuid not null references public.cube_sync_runs_v2(id),
  primary key(financial_key,source_business_unit_id)
);
create index cube_stage_base_links_financial_idx on public.cube_sync_stage_base_links_v2(run_id,financial_key);
create index cube_documents_current_date_idx on public.cube_documents_current_v2(document_date);
create index cube_documents_current_route_idx on public.cube_documents_current_v2(document_date,route_delivery_id);

create function public.validate_cube_sync_run_v2(p_run_id uuid,p_expected jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare r public.cube_sync_runs_v2%rowtype; docs integer; links integer; moves integer; businesses integer;
  total_bottles numeric; total_places numeric; total_weight numeric;
  total_pallets numeric; total_amount numeric;
begin
  select * into r from public.cube_sync_runs_v2 where id=p_run_id for update;
  if not found or r.status<>'staging' then raise exception 'staging sync run not found'; end if;
  if not (p_expected ?& array[
    'baseRows','matchedRows','unmatchedRows','financialFacts','duplicateBaseRows',
    'financialCollisionGroups','movementLinks','businessLinks','totalBottles',
    'totalPlaces','totalWeight','totalPallets','totalOrderAmount','validationPassed','promoted'
  ]) then raise exception 'validation report is incomplete'; end if;
  select count(*),coalesce(sum(bottles),0),coalesce(sum(places),0),coalesce(sum(weight),0),
    coalesce(sum(pallets),0),coalesce(sum(order_amount),0)
  into docs,total_bottles,total_places,total_weight,total_pallets,total_amount
  from public.cube_sync_stage_documents_v2 where run_id=p_run_id;
  select count(*) into links from public.cube_sync_stage_base_links_v2 where run_id=p_run_id;
  select count(*) into moves from public.cube_sync_stage_movements_v2 where run_id=p_run_id;
  select count(*) into businesses from public.cube_sync_stage_business_units_v2 where run_id=p_run_id;
  if (p_expected->>'validationPassed')::boolean is not true or (p_expected->>'unmatchedRows')::integer<>0
    or (p_expected->>'baseRows')::integer<>(p_expected->>'matchedRows')::integer
    or (p_expected->>'promoted')::boolean is true
    or links<>(p_expected->>'baseRows')::integer or links<>(p_expected->>'matchedRows')::integer
    or docs<>(p_expected->>'financialFacts')::integer
    or links-docs<>(p_expected->>'duplicateBaseRows')::integer
    or moves<>(p_expected->>'movementLinks')::integer or businesses<>(p_expected->>'businessLinks')::integer
    or (p_expected->>'financialCollisionGroups')::integer<>0
    or abs(total_bottles-(p_expected->>'totalBottles')::numeric)>0.0001
    or abs(total_places-(p_expected->>'totalPlaces')::numeric)>0.0001
    or abs(total_weight-(p_expected->>'totalWeight')::numeric)>0.0001
    or abs(total_pallets-(p_expected->>'totalPallets')::numeric)>0.0001
    or abs(total_amount-(p_expected->>'totalOrderAmount')::numeric)>0.01
  then raise exception 'safe sync staging validation failed'; end if;
  update public.cube_sync_runs_v2 set status='validated',validation_report=p_expected,validated_at=now() where id=p_run_id;
  return p_expected;
end $$;

create function public.promote_cube_sync_run_v2(p_run_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare r public.cube_sync_runs_v2%rowtype; docs integer; links integer; result jsonb;
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('cube-current-v2-promotion'));
  select * into r from public.cube_sync_runs_v2 where id=p_run_id for update;
  if not found then raise exception 'sync run not found'; end if;
  if r.status='promoted' then return r.validation_report||jsonb_build_object('runId',p_run_id,'promoted',true,'idempotent',true); end if;
  if r.status<>'validated' or (r.validation_report->>'validationPassed')::boolean is not true then raise exception 'validated sync run required'; end if;
  delete from public.cube_business_units_current_v2; delete from public.cube_movements_current_v2;
  delete from public.cube_base_links_current_v2; delete from public.cube_documents_current_v2;
  insert into public.cube_documents_current_v2 select financial_key,source_contract,source_namespace,source_firm_id,
    source_sale_id,source_operation_id,document_date,route_delivery_id,operation_group_id,operation_code,sale_code,
    customer_id,address_id,delivery_address_object_id,expeditor_id,employee_id,sender,customer_name,delivery_address,
    expeditor_name,employee_name,settlement,district,region,bottles,places,weight,pallets,order_amount,
    included_trade_line_count,measure_issue_line_count,raw_identity,p_run_id
    from public.cube_sync_stage_documents_v2 where run_id=p_run_id;
  insert into public.cube_base_links_current_v2 select p_run_id,base_row_no,financial_key,document_date,route_delivery_id,
    operation_group_id,operation_code,sale_code,warehouse,expeditor_name,customer_id,customer_name,address_id,
    delivery_address,employee_id,business_unit,base_bottles,base_places,base_weight,base_pallets,base_order_amount,raw_base
    from public.cube_sync_stage_base_links_v2 where run_id=p_run_id;
  insert into public.cube_movements_current_v2 select financial_key,source_move_id,source_firm_id,source_operation_id,
    source_warehouse_id,warehouse_address_id,warehouse,raw_movement,p_run_id
    from public.cube_sync_stage_movements_v2 where run_id=p_run_id;
  insert into public.cube_business_units_current_v2 select financial_key,source_business_unit_id,business_unit_name,
    membership_count,raw_business_unit,p_run_id from public.cube_sync_stage_business_units_v2 where run_id=p_run_id;
  select count(*) into docs from public.cube_documents_current_v2 where promoted_run_id=p_run_id;
  select count(*) into links from public.cube_base_links_current_v2 where promoted_run_id=p_run_id;
  if docs<>(r.validation_report->>'financialFacts')::integer or links<>(r.validation_report->>'baseRows')::integer
    then raise exception 'atomic promotion verification failed'; end if;
  result=r.validation_report||jsonb_build_object('runId',p_run_id,'promoted',true,'idempotent',false);
  update public.cube_sync_runs_v2 set status='promoted',promoted_at=now(),validation_report=result where id=p_run_id;
  return result;
end $$;

alter table public.cube_sync_runs_v2 enable row level security;
alter table public.cube_sync_stage_documents_v2 enable row level security;
alter table public.cube_sync_stage_base_links_v2 enable row level security;
alter table public.cube_sync_stage_movements_v2 enable row level security;
alter table public.cube_sync_stage_business_units_v2 enable row level security;
alter table public.cube_documents_current_v2 enable row level security;
alter table public.cube_base_links_current_v2 enable row level security;
alter table public.cube_movements_current_v2 enable row level security;
alter table public.cube_business_units_current_v2 enable row level security;
revoke all on public.cube_sync_runs_v2,public.cube_sync_stage_documents_v2,
  public.cube_sync_stage_base_links_v2,public.cube_sync_stage_movements_v2,
  public.cube_sync_stage_business_units_v2,public.cube_documents_current_v2,
  public.cube_base_links_current_v2,public.cube_movements_current_v2,
  public.cube_business_units_current_v2 from anon,authenticated;
revoke all on function public.validate_cube_sync_run_v2(uuid,jsonb),public.promote_cube_sync_run_v2(uuid) from public,anon,authenticated;
grant all on public.cube_sync_runs_v2,public.cube_sync_stage_documents_v2,public.cube_sync_stage_base_links_v2,
  public.cube_sync_stage_movements_v2,public.cube_sync_stage_business_units_v2,public.cube_documents_current_v2,
  public.cube_base_links_current_v2,public.cube_movements_current_v2,public.cube_business_units_current_v2 to service_role;
grant execute on function public.validate_cube_sync_run_v2(uuid,jsonb),public.promote_cube_sync_run_v2(uuid) to service_role;
