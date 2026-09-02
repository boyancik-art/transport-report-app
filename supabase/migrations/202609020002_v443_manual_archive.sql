create table public.transport_manual_deletions(
 route_id bigint primary key references public.fop_manual_routes(id), deleted_by uuid not null references auth.users(id), deleted_at timestamptz not null default now()
);
alter table public.transport_manual_deletions enable row level security;
revoke all on public.transport_manual_deletions from public,anon,authenticated;
grant select on public.transport_manual_deletions to authenticated;
grant all on public.transport_manual_deletions to service_role;
create policy transport_manual_deletions_read on public.transport_manual_deletions for select to authenticated using((select public.current_app_role()) is not null);
create policy fop_manual_not_archived on public.fop_manual_routes as restrictive for select to authenticated using(not exists(select 1 from public.transport_manual_deletions d where d.route_id=fop_manual_routes.id));
revoke delete,truncate,references,trigger on public.fop_manual_routes from anon,authenticated;
create or replace function public.transport_archive_manual_route(target_route_id bigint)
returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if public.current_app_role() is distinct from 'admin' then raise insufficient_privilege using message='Тільки Administrator може видаляти маршрути';end if;
 perform 1 from public.fop_manual_routes where id=target_route_id for update;if not found then raise exception 'Маршрут не знайдено';end if;
 insert into public.transport_manual_deletions(route_id,deleted_by) values(target_route_id,auth.uid()) on conflict do nothing;
 insert into public.transport_audit_log(actor_id,action,entity,entity_key) values(auth.uid(),'route_archived','fop_manual_routes',target_route_id::text);
 return jsonb_build_object('ok',true);
end $$;
revoke all on function public.transport_archive_manual_route(bigint) from public,anon;
grant execute on function public.transport_archive_manual_route(bigint) to authenticated;
create policy transport_device_vaults_deny_clients on public.transport_device_vaults for all to anon,authenticated using(false) with check(false);
