-- Additive, read-only compatibility facade over current_v2 and exact identity mappings.
-- The views are service-role only until a separately reviewed authenticated read path exists.

create view public.cube_routes_legacy_adapter_v2
with (security_invoker = true) as
select
  m.legacy_route_id as id,
  r.route_date,
  r.route_delivery_id,
  coalesce(r.expeditor_name, legacy.expeditor_name) as expeditor_name,
  coalesce(r.warehouse, legacy.warehouse) as warehouse,
  r.total_points::integer as total_points,
  r.total_documents::integer as total_documents,
  r.total_weight,
  r.total_pallets,
  r.total_bottles,
  r.total_places,
  r.total_order_amount,
  legacy.created_at,
  legacy.updated_at,
  legacy.assigned_logistician_id,
  legacy.assigned_at,
  r.route_key,
  r.warehouses as source_warehouses,
  r.expeditors as source_expeditors,
  case when cardinality(r.warehouses) = 1 then 'single' else 'multiple' end as warehouse_identity_status,
  case when cardinality(r.expeditors) = 1 then 'single' else 'multiple' end as expeditor_identity_status
from public.cube_routes_adapter_v2 r
join public.route_identity_map_v2 m
  on m.route_key = r.route_key
 and m.legacy_match_status = 'exact'
join public.routes legacy
  on legacy.id = m.legacy_route_id;

create view public.cube_route_points_legacy_adapter_v2
with (security_invoker = true) as
select
  pm.legacy_route_point_id as id,
  rm.legacy_route_id as route_id,
  legacy.location_id,
  p.customer_id,
  p.customer_name,
  p.documents_count::integer as documents_count,
  p.weight,
  p.pallets,
  p.bottles,
  p.places,
  p.order_amount,
  legacy.point_delivery_cost,
  legacy.created_at,
  legacy.updated_at,
  p.route_key,
  p.point_key,
  p.address_id,
  p.delivery_address,
  p.region,
  p.district
from public.cube_points_adapter_v2 p
join public.point_identity_map_v2 pm
  on pm.point_key = p.point_key
 and pm.route_key = p.route_key
 and pm.legacy_match_status = 'exact'
join public.route_identity_map_v2 rm
  on rm.route_key = p.route_key
 and rm.legacy_match_status = 'exact'
join public.route_points legacy
  on legacy.id = pm.legacy_route_point_id;

create view public.cube_locations_legacy_adapter_v2
with (security_invoker = true) as
select
  p.location_id as id,
  min(p.address_id) as address_id,
  min(p.customer_id) as customer_id,
  min(p.customer_name) as customer_name,
  min(p.delivery_address) as delivery_address,
  min(d.settlement) as settlement,
  min(p.district) as district,
  min(p.region) as region,
  legacy.created_at,
  legacy.updated_at,
  array_agg(distinct p.route_key order by p.route_key) as route_keys,
  array_agg(distinct p.point_key order by p.point_key) as point_keys
from public.cube_route_points_legacy_adapter_v2 p
left join public.cube_point_documents_adapter_v2 pd
  on pd.point_key = p.point_key
left join public.cube_documents_current_v2 d
  on d.financial_key = pd.financial_key
join public.locations legacy
  on legacy.id = p.location_id
group by p.location_id,legacy.created_at,legacy.updated_at;

create view public.cube_source_documents_legacy_adapter_v2
with (security_invoker = true) as
select
  d.financial_key as id,
  d.financial_key as source_key,
  d.document_date,
  d.route_delivery_id,
  d.operation_group_id,
  d.operation_code,
  d.sale_code,
  d.address_id,
  d.customer_id,
  d.employee_id,
  case when count(distinct u.business_unit_name) = 1 then min(u.business_unit_name) end as business_unit,
  d.expeditor_name,
  d.customer_name,
  d.delivery_address,
  case when count(distinct nullif(trim(b.warehouse),'')) = 1 then min(nullif(trim(b.warehouse),'')) end as warehouse,
  d.bottles,
  d.places,
  d.weight,
  d.order_amount,
  d.pallets,
  null::jsonb as raw_data,
  null::timestamptz as created_at,
  m.route_key,
  m.point_key,
  d.financial_key,
  d.source_namespace,
  d.source_firm_id,
  d.source_sale_id
from public.cube_documents_current_v2 d
join (
  select distinct route_key,point_key,financial_key
  from public.cube_financial_membership_adapter_v2
) m using (financial_key)
left join public.cube_base_links_current_v2 b using (financial_key)
left join public.cube_business_units_current_v2 u using (financial_key)
group by d.financial_key,d.document_date,d.route_delivery_id,d.operation_group_id,d.operation_code,
  d.sale_code,d.address_id,d.customer_id,d.employee_id,d.expeditor_name,d.customer_name,
  d.delivery_address,d.bottles,d.places,d.weight,d.order_amount,d.pallets,
  m.route_key,m.point_key,d.source_namespace,d.source_firm_id,d.source_sale_id;

create view public.cube_route_business_allocations_legacy_adapter_v2
with (security_invoker = true) as
select
  'ba2_' || pg_catalog.md5(p.point_key || '|' || coalesce(d.employee_id,'') || '|' || coalesce(u.business_unit_name,'')) as id,
  p.id as route_point_id,
  d.employee_id,
  u.business_unit_name as business_unit,
  count(distinct d.financial_key)::integer as documents_count,
  sum(d.weight) as weight,
  sum(d.pallets) as pallets,
  sum(d.bottles) as bottles,
  sum(d.places) as places,
  sum(d.order_amount) as order_amount,
  null::numeric as allocated_delivery_cost,
  null::timestamptz as created_at,
  null::timestamptz as updated_at,
  p.route_key,
  p.point_key
from public.cube_route_points_legacy_adapter_v2 p
join public.cube_point_documents_adapter_v2 pd
  on pd.point_key = p.point_key
join public.cube_documents_current_v2 d
  on d.financial_key = pd.financial_key
join public.cube_business_units_current_v2 u
  on u.financial_key = d.financial_key
group by p.id,p.route_key,p.point_key,d.employee_id,u.business_unit_name;

create view public.cube_route_facts_legacy_adapter_v2
with (security_invoker = true) as
select f.*,m.route_key
from public.route_facts f
join public.route_identity_map_v2 m
  on m.legacy_route_id = f.route_id
 and m.legacy_match_status = 'exact';

create view public.cube_route_extra_points_legacy_adapter_v2
with (security_invoker = true) as
select x.*,m.route_key
from public.route_extra_points x
join public.route_identity_map_v2 m
  on m.legacy_route_id = x.route_id
 and m.legacy_match_status = 'exact';

create view public.cube_point_tariff_overrides_legacy_adapter_v2
with (security_invoker = true) as
select o.*,m.route_key,m.point_key
from public.point_tariff_overrides o
join public.point_identity_map_v2 m
  on m.legacy_route_point_id = o.route_point_id
 and m.legacy_match_status = 'exact';

create view public.cube_courier_shipment_points_legacy_adapter_v2
with (security_invoker = true) as
select c.*,rm.route_key,pm.point_key
from public.courier_shipment_points c
join public.route_identity_map_v2 rm
  on rm.legacy_route_id = c.route_id
 and rm.legacy_match_status = 'exact'
left join public.point_identity_map_v2 pm
  on pm.legacy_route_point_id = c.route_point_id
 and pm.route_key = rm.route_key
 and pm.legacy_match_status = 'exact';

revoke all on
  public.cube_routes_legacy_adapter_v2,
  public.cube_route_points_legacy_adapter_v2,
  public.cube_locations_legacy_adapter_v2,
  public.cube_source_documents_legacy_adapter_v2,
  public.cube_route_business_allocations_legacy_adapter_v2,
  public.cube_route_facts_legacy_adapter_v2,
  public.cube_route_extra_points_legacy_adapter_v2,
  public.cube_point_tariff_overrides_legacy_adapter_v2,
  public.cube_courier_shipment_points_legacy_adapter_v2
from public,anon,authenticated;

grant select on
  public.cube_routes_legacy_adapter_v2,
  public.cube_route_points_legacy_adapter_v2,
  public.cube_locations_legacy_adapter_v2,
  public.cube_source_documents_legacy_adapter_v2,
  public.cube_route_business_allocations_legacy_adapter_v2,
  public.cube_route_facts_legacy_adapter_v2,
  public.cube_route_extra_points_legacy_adapter_v2,
  public.cube_point_tariff_overrides_legacy_adapter_v2,
  public.cube_courier_shipment_points_legacy_adapter_v2
to service_role;
