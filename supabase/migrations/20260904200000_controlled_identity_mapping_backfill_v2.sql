-- One-statement, fail-closed exact mapping backfill for 2026-08-24..2026-09-04.
do $$
declare
  v_count bigint;
  v_before jsonb;
  v_after jsonb;
begin
  select jsonb_build_object(
    'legacy',jsonb_build_array(
      (select count(*) from public.routes),
      (select count(*) from public.route_points),
      (select count(*) from public.source_documents),
      (select count(*) from public.route_facts)
    ),
    'current',jsonb_build_array(
      (select count(*) from public.cube_documents_current_v2),
      (select count(*) from public.cube_base_links_current_v2),
      (select count(*) from public.cube_movements_current_v2),
      (select count(*) from public.cube_business_units_current_v2),
      (select sum(order_amount) from public.cube_documents_current_v2)
    )
  ) into v_before;

  create temporary table identity_route_candidates_v2 on commit drop as
  select v.route_key,v.document_date,v.route_delivery_id,
    m.matches,m.legacy_route_id
  from public.cube_route_identity_candidates_v2 v
  cross join lateral (
    select count(*)::integer matches,min(r.id) legacy_route_id
    from public.routes r
    where r.route_date=v.document_date
      and nullif(trim(r.route_delivery_id),'') is not distinct from v.route_delivery_id
  ) m
  where v.document_date between date '2026-08-24' and date '2026-09-04'
    and v.identity_status='valid';

  if (select count(*) from identity_route_candidates_v2)<>716
     or (select count(*) from identity_route_candidates_v2 where matches=1)<>716
     or exists(select 1 from identity_route_candidates_v2 where matches<>1)
     or exists(select 1 from identity_route_candidates_v2 group by route_key having count(*)>1)
     or exists(select 1 from identity_route_candidates_v2 group by legacy_route_id having count(*)>1)
  then
    raise exception 'route identity backfill preflight mismatch' using errcode='check_violation';
  end if;

  create temporary table identity_point_candidates_v2 on commit drop as
  select v.point_key,v.route_key,v.customer_id,v.address_id,
    m.matches,m.legacy_route_point_id
  from public.cube_point_identity_candidates_v2 v
  cross join lateral (
    select count(distinct rp.id)::integer matches,min(rp.id) legacy_route_point_id
    from public.routes r
    join public.route_points rp on rp.route_id=r.id
    join public.locations l on l.id=rp.location_id
    where r.route_date=v.document_date
      and nullif(trim(r.route_delivery_id),'') is not distinct from nullif(trim(v.route_delivery_id),'')
      and nullif(trim(l.customer_id),'') is not distinct from v.customer_id
      and nullif(trim(l.address_id),'') is not distinct from v.address_id
  ) m
  where v.document_date between date '2026-08-24' and date '2026-09-04'
    and v.identity_status='valid';

  if (select count(*) from identity_point_candidates_v2)<>2742
     or (select count(*) from identity_point_candidates_v2 where matches=1)<>2742
     or exists(select 1 from identity_point_candidates_v2 where matches<>1)
     or exists(select 1 from identity_point_candidates_v2 group by point_key having count(*)>1)
     or exists(select 1 from identity_point_candidates_v2 group by legacy_route_point_id having count(*)>1)
  then
    raise exception 'point identity backfill preflight mismatch' using errcode='check_violation';
  end if;

  insert into public.route_identity_map_v2(
    route_key,document_date,route_delivery_id,legacy_route_id,legacy_match_status
  )
  select route_key,document_date,route_delivery_id,legacy_route_id,'exact'
  from identity_route_candidates_v2
  where matches=1
  on conflict do nothing;

  insert into public.point_identity_map_v2(
    point_key,route_key,customer_id,address_id,legacy_route_point_id,legacy_match_status
  )
  select point_key,route_key,customer_id,address_id,legacy_route_point_id,'exact'
  from identity_point_candidates_v2
  where matches=1
  on conflict do nothing;

  if (select count(*) from public.route_identity_map_v2)<>716
     or exists(select 1 from public.route_identity_map_v2 where legacy_match_status<>'exact')
     or exists(select 1 from public.route_identity_map_v2 group by route_key having count(*)>1)
     or exists(select 1 from public.route_identity_map_v2 group by legacy_route_id having count(*)>1)
     or (select count(*) from identity_route_candidates_v2 c
         join public.route_identity_map_v2 m
           on m.route_key=c.route_key and m.legacy_route_id=c.legacy_route_id
          and m.document_date=c.document_date and m.route_delivery_id=c.route_delivery_id
          and m.legacy_match_status='exact')<>716
  then
    raise exception 'route identity backfill verification failed' using errcode='check_violation';
  end if;

  if (select count(*) from public.point_identity_map_v2)<>2742
     or exists(select 1 from public.point_identity_map_v2 where legacy_match_status<>'exact')
     or exists(select 1 from public.point_identity_map_v2 group by point_key having count(*)>1)
     or exists(select 1 from public.point_identity_map_v2 group by legacy_route_point_id having count(*)>1)
     or (select count(*) from identity_point_candidates_v2 c
         join public.point_identity_map_v2 m
           on m.point_key=c.point_key and m.route_key=c.route_key
          and m.legacy_route_point_id=c.legacy_route_point_id
          and m.customer_id is not distinct from c.customer_id
          and m.address_id is not distinct from c.address_id
          and m.legacy_match_status='exact')<>2742
  then
    raise exception 'point identity backfill verification failed' using errcode='check_violation';
  end if;

  select count(*) into v_count
  from public.route_facts f
  join public.route_identity_map_v2 m on m.legacy_route_id=f.route_id;
  if v_count<>19 then
    raise exception 'route_facts stable mapping coverage mismatch: %',v_count using errcode='check_violation';
  end if;

  select count(*) into v_count
  from (
    select route_point_id from public.route_business_allocations
    union all
    select route_point_id from public.courier_shipment_points where route_point_id is not null
    union all
    select route_point_id from public.point_tariff_overrides
  ) refs
  join public.point_identity_map_v2 m on m.legacy_route_point_id=refs.route_point_id;
  if v_count<>2754 then
    raise exception 'point operational stable mapping coverage mismatch: %',v_count using errcode='check_violation';
  end if;

  select count(*) into v_count
  from public.route_deletions d
  join public.route_identity_map_v2 m on m.legacy_route_id=d.route_id;
  if v_count<>0 or (select count(*) from public.route_deletions)<>9 then
    raise exception 'historical route deletion isolation failed' using errcode='check_violation';
  end if;

  select count(*) into v_count
  from (
    select route_point_id from public.route_business_allocations
    union all
    select route_point_id from public.courier_shipment_points where route_point_id is not null
    union all
    select route_point_id from public.point_tariff_overrides
  ) refs
  left join public.point_identity_map_v2 m on m.legacy_route_point_id=refs.route_point_id
  where m.point_key is null;
  if v_count<>2243 then
    raise exception 'historical point reference isolation failed: %',v_count using errcode='check_violation';
  end if;

  select jsonb_build_object(
    'legacy',jsonb_build_array(
      (select count(*) from public.routes),
      (select count(*) from public.route_points),
      (select count(*) from public.source_documents),
      (select count(*) from public.route_facts)
    ),
    'current',jsonb_build_array(
      (select count(*) from public.cube_documents_current_v2),
      (select count(*) from public.cube_base_links_current_v2),
      (select count(*) from public.cube_movements_current_v2),
      (select count(*) from public.cube_business_units_current_v2),
      (select sum(order_amount) from public.cube_documents_current_v2)
    )
  ) into v_after;
  if v_after is distinct from v_before then
    raise exception 'legacy or current-v2 facts changed during identity backfill' using errcode='check_violation';
  end if;
end
$$;
