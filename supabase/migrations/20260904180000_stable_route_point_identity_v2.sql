-- Additive identity/adapter foundation. Does not mutate legacy or current-v2 facts.
create function public.cube_route_key_v2(p_document_date date,p_route_delivery_id text) returns text
language sql immutable parallel safe returns null on null input
return case when nullif(trim(p_route_delivery_id),'') is null then null else
  'rt2_'||encode(digest(convert_to('route-v2|d:10:'||p_document_date::text||'|r:'||octet_length(trim(p_route_delivery_id))::text||':'||trim(p_route_delivery_id),'UTF8'),'sha256'),'hex') end;

create function public.cube_point_key_v2(p_route_key text,p_customer_id text,p_address_id text) returns text
language sql immutable parallel safe
return case when nullif(trim(p_route_key),'') is null or (nullif(trim(p_customer_id),'') is null and nullif(trim(p_address_id),'') is null) then null else
  'pt2_'||encode(digest(convert_to('point-v2|r:'||octet_length(trim(p_route_key))::text||':'||trim(p_route_key)||
  '|c:'||case when nullif(trim(p_customer_id),'') is null then 'n' else 's:'||octet_length(trim(p_customer_id))::text||':'||trim(p_customer_id) end||
  '|a:'||case when nullif(trim(p_address_id),'') is null then 'n' else 's:'||octet_length(trim(p_address_id))::text||':'||trim(p_address_id) end,'UTF8'),'sha256'),'hex') end;

create view public.cube_route_identity_candidates_v2 with (security_invoker=true) as
select document_date,trim(route_delivery_id) route_delivery_id,
  public.cube_route_key_v2(document_date,route_delivery_id) route_key,
  case when document_date is null then 'missing_document_date' when nullif(trim(route_delivery_id),'') is null then 'missing_route_delivery_id' else 'valid' end identity_status,
  array_agg(distinct nullif(trim(warehouse),'')) filter(where nullif(trim(warehouse),'') is not null) warehouses,
  array_agg(distinct nullif(trim(expeditor_name),'')) filter(where nullif(trim(expeditor_name),'') is not null) expeditors
from public.cube_base_links_current_v2 group by document_date,trim(route_delivery_id);

create view public.cube_point_identity_candidates_v2 with (security_invoker=true) as
select r.route_key,b.document_date,trim(b.route_delivery_id) route_delivery_id,nullif(trim(b.customer_id),'') customer_id,
  nullif(trim(b.address_id),'') address_id,public.cube_point_key_v2(r.route_key,b.customer_id,b.address_id) point_key,
  case when r.route_key is null then 'invalid_route' when nullif(trim(b.customer_id),'') is null and nullif(trim(b.address_id),'') is null then 'missing_customer_and_address' else 'valid' end identity_status
from (select distinct document_date,route_delivery_id,customer_id,address_id from public.cube_base_links_current_v2) b
join public.cube_route_identity_candidates_v2 r on r.document_date is not distinct from b.document_date and r.route_delivery_id is not distinct from trim(b.route_delivery_id);

create view public.cube_financial_membership_adapter_v2 with (security_invoker=true) as
select distinct p.route_key,p.point_key,b.financial_key,b.document_date,trim(b.route_delivery_id) route_delivery_id,
  nullif(trim(b.customer_id),'') customer_id,nullif(trim(b.address_id),'') address_id
from public.cube_base_links_current_v2 b join public.cube_point_identity_candidates_v2 p
 on p.document_date is not distinct from b.document_date and p.route_delivery_id is not distinct from trim(b.route_delivery_id)
 and p.customer_id is not distinct from nullif(trim(b.customer_id),'') and p.address_id is not distinct from nullif(trim(b.address_id),'')
where p.identity_status='valid';

create view public.cube_point_documents_adapter_v2 with (security_invoker=true) as
select m.route_key,m.point_key,m.financial_key,d.source_namespace,d.source_firm_id,d.source_sale_id,d.document_date,
 d.route_delivery_id,d.customer_id,d.address_id,d.customer_name,d.delivery_address,d.region,d.district,d.employee_id,
 d.bottles,d.places,d.weight,d.pallets,d.order_amount,
 (select array_agg(distinct u.business_unit_name order by u.business_unit_name) from public.cube_business_units_current_v2 u where u.financial_key=d.financial_key) business_units
from public.cube_financial_membership_adapter_v2 m join public.cube_documents_current_v2 d using(financial_key);

create view public.cube_points_adapter_v2 with (security_invoker=true) as
select route_key,point_key,min(customer_id) customer_id,min(address_id) address_id,min(customer_name) customer_name,
 min(delivery_address) delivery_address,min(region) region,min(district) district,count(*) documents_count,
 sum(bottles) bottles,sum(places) places,sum(weight) weight,sum(pallets) pallets,sum(order_amount) order_amount
from public.cube_point_documents_adapter_v2 group by route_key,point_key;

create view public.cube_routes_adapter_v2 with (security_invoker=true) as
select r.route_key,r.document_date route_date,r.route_delivery_id,
 case when cardinality(r.warehouses)=1 then r.warehouses[1] end warehouse,
 case when cardinality(r.expeditors)=1 then r.expeditors[1] end expeditor_name,
 r.warehouses,r.expeditors,count(p.point_key) total_points,coalesce(sum(p.documents_count),0) total_documents,
 coalesce(sum(p.weight),0) total_weight,coalesce(sum(p.pallets),0) total_pallets,
 coalesce(sum(p.bottles),0) total_bottles,coalesce(sum(p.places),0) total_places,coalesce(sum(p.order_amount),0) total_order_amount
from public.cube_route_identity_candidates_v2 r left join public.cube_points_adapter_v2 p using(route_key)
where r.identity_status='valid' group by r.route_key,r.document_date,r.route_delivery_id,r.warehouses,r.expeditors;

create table public.route_identity_map_v2(
 route_key text primary key,document_date date not null,route_delivery_id text not null,legacy_route_id bigint unique references public.routes(id) on delete set null,
 legacy_match_status text not null check(legacy_match_status in('exact','missing','ambiguous')),created_at timestamptz not null default now(),
 unique(document_date,route_delivery_id)
);
create table public.point_identity_map_v2(
 point_key text primary key,route_key text not null references public.route_identity_map_v2(route_key) on delete cascade,
 customer_id text,address_id text,legacy_route_point_id bigint unique references public.route_points(id) on delete set null,
 legacy_match_status text not null check(legacy_match_status in('exact','missing','ambiguous')),created_at timestamptz not null default now(),
 check(customer_id is not null or address_id is not null),unique(route_key,customer_id,address_id)
);
alter table public.route_identity_map_v2 enable row level security;
alter table public.point_identity_map_v2 enable row level security;
revoke all on public.route_identity_map_v2,public.point_identity_map_v2 from anon,authenticated;
grant all on public.route_identity_map_v2,public.point_identity_map_v2 to service_role;
revoke all on function public.cube_route_key_v2(date,text),public.cube_point_key_v2(text,text,text) from public,anon,authenticated;
grant execute on function public.cube_route_key_v2(date,text),public.cube_point_key_v2(text,text,text) to service_role;
