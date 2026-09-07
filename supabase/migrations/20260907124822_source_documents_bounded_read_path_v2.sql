CREATE OR REPLACE FUNCTION public.transport_read_adapter_v2(p_request jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
declare
  resource text := p_request->>'resource';
  filters jsonb := coalesce(p_request->'filters', '[]'::jsonb);
  sorts jsonb := coalesce(p_request->'sort', '[]'::jsonb);
  page_limit integer := coalesce((p_request->>'limit')::integer, 1000);
  page_offset integer := coalesce((p_request->>'offset')::integer, 0);
  f jsonb;
  field_name text;
  operator_name text;
  sort_item jsonb;
  sort_fields text[] := array[]::text[];
  sort_directions text[] := array[]::text[];
  date_eq date;
  date_from date;
  date_to date;
  ids bigint[];
  route_ids bigint[];
  route_point_ids bigint[];
  route_keys text[];
  point_keys text[];
  result jsonb;
begin
  if p_request is null or jsonb_typeof(p_request) <> 'object'
     or exists (select 1 from jsonb_object_keys(p_request) k where k not in ('resource','filters','limit','offset','sort')) then
    raise exception 'invalid request fields';
  end if;
  if resource not in ('routes','routePoints','locations','sourceDocuments','businessAllocations','routeFacts','routeExtraPoints','pointTariffOverrides','courierShipmentPoints') then
    raise exception 'unknown resource';
  end if;
  if page_limit < 1 or page_limit > 1000 or page_offset < 0 or page_offset > 100000 then
    raise exception 'invalid pagination';
  end if;
  if jsonb_typeof(filters) <> 'array' or jsonb_array_length(filters) > 12
     or jsonb_typeof(sorts) <> 'array' or jsonb_array_length(sorts) > 3 then
    raise exception 'invalid filters or sort';
  end if;

  for f in select value from jsonb_array_elements(filters) loop
    if jsonb_typeof(f) <> 'object' or exists (select 1 from jsonb_object_keys(f) k where k not in ('field','op','value')) then
      raise exception 'invalid filter';
    end if;
    field_name := f->>'field'; operator_name := f->>'op';
    if field_name in ('route_date','document_date') then
      if (resource = 'routes' and field_name <> 'route_date') or (resource = 'sourceDocuments' and field_name <> 'document_date')
         or resource not in ('routes','sourceDocuments') or operator_name not in ('eq','gte','lte')
         or (f->>'value') !~ '^\d{4}-\d{2}-\d{2}$' then raise exception 'filter not allowed'; end if;
      if operator_name = 'eq' then date_eq := (f->>'value')::date;
      elsif operator_name = 'gte' then date_from := (f->>'value')::date;
      else date_to := (f->>'value')::date; end if;
    elsif field_name in ('id','route_id','route_point_id') then
      if operator_name not in ('eq','in') then raise exception 'filter not allowed'; end if;
      if (field_name = 'id' and resource not in ('routes','routePoints','locations'))
         or (field_name = 'route_id' and resource not in ('routePoints','routeFacts','routeExtraPoints','courierShipmentPoints'))
         or (field_name = 'route_point_id' and resource not in ('businessAllocations','pointTariffOverrides','courierShipmentPoints')) then
        raise exception 'filter not allowed';
      end if;
      if operator_name = 'eq' then
        if (f->>'value') !~ '^[1-9][0-9]{0,18}$' then raise exception 'invalid filter value'; end if;
        if field_name='id' then ids:=array[(f->>'value')::bigint]; elsif field_name='route_id' then route_ids:=array[(f->>'value')::bigint]; else route_point_ids:=array[(f->>'value')::bigint]; end if;
      else
        if jsonb_typeof(f->'value') <> 'array' or jsonb_array_length(f->'value') < 1 or jsonb_array_length(f->'value') > 150
           or exists(select 1 from jsonb_array_elements_text(f->'value') x where x !~ '^[1-9][0-9]{0,18}$') then raise exception 'invalid filter value'; end if;
        if field_name='id' then select array_agg(x::bigint) into ids from jsonb_array_elements_text(f->'value') x;
        elsif field_name='route_id' then select array_agg(x::bigint) into route_ids from jsonb_array_elements_text(f->'value') x;
        else select array_agg(x::bigint) into route_point_ids from jsonb_array_elements_text(f->'value') x; end if;
      end if;
    elsif field_name in ('route_key','point_key') then
      if operator_name not in ('eq','in') or (field_name='route_key' and resource='locations')
         or (field_name='point_key' and resource not in ('routePoints','sourceDocuments','businessAllocations','pointTariffOverrides','courierShipmentPoints')) then raise exception 'filter not allowed'; end if;
      if operator_name='eq' then
        if (f->>'value') !~ '^[A-Za-z0-9_-]{1,128}$' then raise exception 'invalid filter value'; end if;
        if field_name='route_key' then route_keys:=array[f->>'value']; else point_keys:=array[f->>'value']; end if;
      else
        if jsonb_typeof(f->'value') <> 'array' or jsonb_array_length(f->'value') < 1 or jsonb_array_length(f->'value') > 150
           or exists(select 1 from jsonb_array_elements_text(f->'value') x where x !~ '^[A-Za-z0-9_-]{1,128}$') then raise exception 'invalid filter value'; end if;
        if field_name='route_key' then select array_agg(x) into route_keys from jsonb_array_elements_text(f->'value') x;
        else select array_agg(x) into point_keys from jsonb_array_elements_text(f->'value') x; end if;
      end if;
    else raise exception 'filter not allowed'; end if;
  end loop;

  for sort_item in select value from jsonb_array_elements(sorts) loop
    field_name:=sort_item->>'field'; operator_name:=sort_item->>'direction';
    if jsonb_typeof(sort_item)<>'object' or exists(select 1 from jsonb_object_keys(sort_item) k where k not in ('field','direction'))
       or operator_name not in ('asc','desc') then raise exception 'sort not allowed'; end if;
    if (resource='routes' and field_name not in ('route_date','route_delivery_id','id'))
       or (resource='routePoints' and field_name not in ('id','route_id','route_key','point_key'))
       or (resource='locations' and field_name<>'id')
       or (resource='sourceDocuments' and field_name not in ('document_date','id','route_key','point_key'))
       or (resource='businessAllocations' and field_name not in ('route_point_id','id','route_key','point_key'))
       or (resource in ('routeFacts','routeExtraPoints') and field_name not in ('id','route_id','route_key'))
       or (resource='pointTariffOverrides' and field_name not in ('id','route_point_id','point_key'))
       or (resource='courierShipmentPoints' and field_name not in ('id','route_id','route_point_id','point_key')) then raise exception 'sort not allowed'; end if;
    sort_fields:=array_append(sort_fields,field_name); sort_directions:=array_append(sort_directions,operator_name);
  end loop;

  if resource='routes' then
    select coalesce(jsonb_agg(to_jsonb(q)),'[]'::jsonb) into result from (
      select v.* from public.cube_routes_legacy_adapter_v2 v
      where (date_eq is null or v.route_date=date_eq) and (date_from is null or v.route_date>=date_from) and (date_to is null or v.route_date<=date_to)
        and (ids is null or v.id=any(ids)) and (route_keys is null or v.route_key=any(route_keys))
      order by
        case when sort_directions[1]='asc' then case sort_fields[1] when 'route_date' then v.route_date::text when 'route_delivery_id' then v.route_delivery_id when 'id' then lpad(v.id::text,20,'0') end end asc,
        case when sort_directions[1]='desc' then case sort_fields[1] when 'route_date' then v.route_date::text when 'route_delivery_id' then v.route_delivery_id when 'id' then lpad(v.id::text,20,'0') end end desc,
        case when sort_directions[2]='asc' then case sort_fields[2] when 'route_date' then v.route_date::text when 'route_delivery_id' then v.route_delivery_id when 'id' then lpad(v.id::text,20,'0') end end asc,
        case when sort_directions[2]='desc' then case sort_fields[2] when 'route_date' then v.route_date::text when 'route_delivery_id' then v.route_delivery_id when 'id' then lpad(v.id::text,20,'0') end end desc,
        case when sort_directions[3]='asc' then case sort_fields[3] when 'route_date' then v.route_date::text when 'route_delivery_id' then v.route_delivery_id when 'id' then lpad(v.id::text,20,'0') end end asc,
        case when sort_directions[3]='desc' then case sort_fields[3] when 'route_date' then v.route_date::text when 'route_delivery_id' then v.route_delivery_id when 'id' then lpad(v.id::text,20,'0') end end desc,
        v.route_date,v.route_delivery_id,v.id limit page_limit offset page_offset) q;
  elsif resource='routePoints' then
    select coalesce(jsonb_agg(to_jsonb(q)),'[]'::jsonb) into result from (select v.* from public.cube_route_points_legacy_adapter_v2 v
      where (ids is null or v.id=any(ids)) and (route_ids is null or v.route_id=any(route_ids)) and (route_keys is null or v.route_key=any(route_keys)) and (point_keys is null or v.point_key=any(point_keys))
      order by
        case when sort_directions[1]='asc' then case sort_fields[1] when 'id' then lpad(v.id::text,20,'0') when 'route_id' then lpad(v.route_id::text,20,'0') when 'route_key' then v.route_key when 'point_key' then v.point_key end end asc,
        case when sort_directions[1]='desc' then case sort_fields[1] when 'id' then lpad(v.id::text,20,'0') when 'route_id' then lpad(v.route_id::text,20,'0') when 'route_key' then v.route_key when 'point_key' then v.point_key end end desc,
        case when sort_directions[2]='asc' then case sort_fields[2] when 'id' then lpad(v.id::text,20,'0') when 'route_id' then lpad(v.route_id::text,20,'0') when 'route_key' then v.route_key when 'point_key' then v.point_key end end asc,
        case when sort_directions[2]='desc' then case sort_fields[2] when 'id' then lpad(v.id::text,20,'0') when 'route_id' then lpad(v.route_id::text,20,'0') when 'route_key' then v.route_key when 'point_key' then v.point_key end end desc,
        case when sort_directions[3]='asc' then case sort_fields[3] when 'id' then lpad(v.id::text,20,'0') when 'route_id' then lpad(v.route_id::text,20,'0') when 'route_key' then v.route_key when 'point_key' then v.point_key end end asc,
        case when sort_directions[3]='desc' then case sort_fields[3] when 'id' then lpad(v.id::text,20,'0') when 'route_id' then lpad(v.route_id::text,20,'0') when 'route_key' then v.route_key when 'point_key' then v.point_key end end desc,
        v.id limit page_limit offset page_offset) q;
  elsif resource='locations' then
    select coalesce(jsonb_agg(to_jsonb(q)),'[]'::jsonb) into result from (select v.* from public.cube_locations_legacy_adapter_v2 v where (ids is null or v.id=any(ids))
      order by case when sort_directions[1]='asc' and sort_fields[1]='id' then v.id end asc,case when sort_directions[1]='desc' and sort_fields[1]='id' then v.id end desc,v.id limit page_limit offset page_offset) q;
  elsif resource='sourceDocuments' then
    -- A date-only empty check avoids evaluating financial membership at all.
    if not exists (
      select 1 from public.cube_documents_current_v2 d
      where (date_eq is null or d.document_date=date_eq)
        and (date_from is null or d.document_date>=date_from)
        and (date_to is null or d.document_date<=date_to)
    ) then
      return '[]'::jsonb;
    end if;
WITH filtered_documents AS MATERIALIZED (
 SELECT d.* FROM public.cube_documents_current_v2 d
 WHERE (date_eq IS NULL OR d.document_date=date_eq)
   AND (date_from IS NULL OR d.document_date>=date_from)
   AND (date_to IS NULL OR d.document_date<=date_to)
), filtered_membership AS MATERIALIZED (
 SELECT DISTINCT route_key, point_key, financial_key
 FROM public.cube_financial_membership_adapter_v2
 WHERE financial_key = ANY (ARRAY(SELECT financial_key FROM filtered_documents))
), narrowed_documents AS (
SELECT d.financial_key AS id,
    d.financial_key AS source_key,
    d.document_date,
    d.route_delivery_id,
    d.operation_group_id,
    d.operation_code,
    d.sale_code,
    d.address_id,
    d.customer_id,
    d.employee_id,
        CASE
            WHEN count(DISTINCT u.business_unit_name) = 1 THEN min(u.business_unit_name)
            ELSE NULL::text
        END AS business_unit,
    d.expeditor_name,
    d.customer_name,
    d.delivery_address,
        CASE
            WHEN count(DISTINCT NULLIF(TRIM(BOTH FROM b.warehouse), ''::text)) = 1 THEN min(NULLIF(TRIM(BOTH FROM b.warehouse), ''::text))
            ELSE NULL::text
        END AS warehouse,
    d.bottles,
    d.places,
    d.weight,
    d.order_amount,
    d.pallets,
    NULL::jsonb AS raw_data,
    NULL::timestamp with time zone AS created_at,
    m.route_key,
    m.point_key,
    d.financial_key,
    d.source_namespace,
    d.source_firm_id,
    d.source_sale_id
   FROM filtered_documents d
     JOIN filtered_membership m USING (financial_key)
     LEFT JOIN public.cube_base_links_current_v2 b USING (financial_key)
     LEFT JOIN public.cube_business_units_current_v2 u USING (financial_key)
  GROUP BY d.financial_key, d.document_date, d.route_delivery_id, d.operation_group_id, d.operation_code, d.sale_code, d.address_id, d.customer_id, d.employee_id, d.expeditor_name, d.customer_name, d.delivery_address, d.bottles, d.places, d.weight, d.order_amount, d.pallets, m.route_key, m.point_key, d.source_namespace, d.source_firm_id, d.source_sale_id
)
    select coalesce(jsonb_agg(to_jsonb(q)),'[]'::jsonb) into result from (select v.* from narrowed_documents v
      where (date_eq is null or v.document_date=date_eq) and (date_from is null or v.document_date>=date_from) and (date_to is null or v.document_date<=date_to)
        and (route_keys is null or v.route_key=any(route_keys)) and (point_keys is null or v.point_key=any(point_keys))
      order by
        case when sort_directions[1]='asc' then case sort_fields[1] when 'document_date' then v.document_date::text when 'id' then lpad(v.id::text,20,'0') when 'route_key' then v.route_key when 'point_key' then v.point_key end end asc,
        case when sort_directions[1]='desc' then case sort_fields[1] when 'document_date' then v.document_date::text when 'id' then lpad(v.id::text,20,'0') when 'route_key' then v.route_key when 'point_key' then v.point_key end end desc,
        case when sort_directions[2]='asc' then case sort_fields[2] when 'document_date' then v.document_date::text when 'id' then lpad(v.id::text,20,'0') when 'route_key' then v.route_key when 'point_key' then v.point_key end end asc,
        case when sort_directions[2]='desc' then case sort_fields[2] when 'document_date' then v.document_date::text when 'id' then lpad(v.id::text,20,'0') when 'route_key' then v.route_key when 'point_key' then v.point_key end end desc,
        case when sort_directions[3]='asc' then case sort_fields[3] when 'document_date' then v.document_date::text when 'id' then lpad(v.id::text,20,'0') when 'route_key' then v.route_key when 'point_key' then v.point_key end end asc,
        case when sort_directions[3]='desc' then case sort_fields[3] when 'document_date' then v.document_date::text when 'id' then lpad(v.id::text,20,'0') when 'route_key' then v.route_key when 'point_key' then v.point_key end end desc,v.id limit page_limit offset page_offset) q;
  elsif resource='businessAllocations' then
    select coalesce(jsonb_agg(to_jsonb(q)),'[]'::jsonb) into result from (select v.* from public.cube_route_business_allocations_legacy_adapter_v2 v
      where (route_point_ids is null or v.route_point_id=any(route_point_ids)) and (route_keys is null or v.route_key=any(route_keys)) and (point_keys is null or v.point_key=any(point_keys))
      order by
        case when sort_directions[1]='asc' then case sort_fields[1] when 'id' then lpad(v.id::text,20,'0') when 'route_point_id' then lpad(v.route_point_id::text,20,'0') when 'route_key' then v.route_key when 'point_key' then v.point_key end end asc,
        case when sort_directions[1]='desc' then case sort_fields[1] when 'id' then lpad(v.id::text,20,'0') when 'route_point_id' then lpad(v.route_point_id::text,20,'0') when 'route_key' then v.route_key when 'point_key' then v.point_key end end desc,v.id limit page_limit offset page_offset) q;
  elsif resource='routeFacts' then
    select coalesce(jsonb_agg(to_jsonb(q)),'[]'::jsonb) into result from (select v.* from public.cube_route_facts_legacy_adapter_v2 v where (route_ids is null or v.route_id=any(route_ids)) and (route_keys is null or v.route_key=any(route_keys))
      order by case when sort_directions[1]='asc' then case sort_fields[1] when 'id' then lpad(v.id::text,20,'0') when 'route_id' then lpad(v.route_id::text,20,'0') when 'route_key' then v.route_key end end asc,case when sort_directions[1]='desc' then case sort_fields[1] when 'id' then lpad(v.id::text,20,'0') when 'route_id' then lpad(v.route_id::text,20,'0') when 'route_key' then v.route_key end end desc,v.id limit page_limit offset page_offset) q;
  elsif resource='routeExtraPoints' then
    select coalesce(jsonb_agg(to_jsonb(q)),'[]'::jsonb) into result from (select v.* from public.cube_route_extra_points_legacy_adapter_v2 v where (route_ids is null or v.route_id=any(route_ids)) and (route_keys is null or v.route_key=any(route_keys))
      order by case when sort_directions[1]='asc' then case sort_fields[1] when 'id' then lpad(v.id::text,20,'0') when 'route_id' then lpad(v.route_id::text,20,'0') when 'route_key' then v.route_key end end asc,case when sort_directions[1]='desc' then case sort_fields[1] when 'id' then lpad(v.id::text,20,'0') when 'route_id' then lpad(v.route_id::text,20,'0') when 'route_key' then v.route_key end end desc,v.id limit page_limit offset page_offset) q;
  elsif resource='pointTariffOverrides' then
    select coalesce(jsonb_agg(to_jsonb(q)),'[]'::jsonb) into result from (select v.* from public.cube_point_tariff_overrides_legacy_adapter_v2 v where (route_point_ids is null or v.route_point_id=any(route_point_ids)) and (route_keys is null or v.route_key=any(route_keys)) and (point_keys is null or v.point_key=any(point_keys))
      order by case when sort_directions[1]='asc' then case sort_fields[1] when 'id' then lpad(v.id::text,20,'0') when 'route_point_id' then lpad(v.route_point_id::text,20,'0') when 'point_key' then v.point_key end end asc,case when sort_directions[1]='desc' then case sort_fields[1] when 'id' then lpad(v.id::text,20,'0') when 'route_point_id' then lpad(v.route_point_id::text,20,'0') when 'point_key' then v.point_key end end desc,v.id limit page_limit offset page_offset) q;
  else
    select coalesce(jsonb_agg(to_jsonb(q)),'[]'::jsonb) into result from (select v.* from public.cube_courier_shipment_points_legacy_adapter_v2 v where (route_ids is null or v.route_id=any(route_ids)) and (route_point_ids is null or v.route_point_id=any(route_point_ids)) and (route_keys is null or v.route_key=any(route_keys)) and (point_keys is null or v.point_key=any(point_keys))
      order by case when sort_directions[1]='asc' then case sort_fields[1] when 'id' then lpad(v.id::text,20,'0') when 'route_id' then lpad(v.route_id::text,20,'0') when 'route_point_id' then lpad(v.route_point_id::text,20,'0') when 'point_key' then v.point_key end end asc,case when sort_directions[1]='desc' then case sort_fields[1] when 'id' then lpad(v.id::text,20,'0') when 'route_id' then lpad(v.route_id::text,20,'0') when 'route_point_id' then lpad(v.route_point_id::text,20,'0') when 'point_key' then v.point_key end end desc,v.id limit page_limit offset page_offset) q;
  end if;
  return result;
end
$function$
;
