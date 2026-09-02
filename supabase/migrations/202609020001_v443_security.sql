-- v44.3: additive security, recoverable deletion, preferences. Allocation functions unchanged.
create table public.route_deletions (
 route_date date not null, route_delivery_id text not null, route_id bigint not null,
 deleted_by uuid not null references auth.users(id), deleted_at timestamptz not null default now(),
 primary key(route_date,route_delivery_id)
);
alter table public.route_deletions enable row level security;
revoke all on public.route_deletions from public,anon,authenticated;
grant select on public.route_deletions to authenticated;
grant all on public.route_deletions to service_role;
create policy route_deletions_read on public.route_deletions for select to authenticated using ((select public.current_app_role()) is not null);
create table public.transport_audit_log (
 id bigint generated always as identity primary key, created_at timestamptz not null default now(),
 actor_id uuid, action text not null, entity text not null, entity_key text, details jsonb not null default '{}'::jsonb
);
alter table public.transport_audit_log enable row level security;
revoke all on public.transport_audit_log from public,anon,authenticated;
grant select on public.transport_audit_log to authenticated;
grant all on public.transport_audit_log to service_role;
create policy transport_audit_admin_read on public.transport_audit_log for select to authenticated using ((select public.current_app_role())='admin');
create table public.transport_feedback (
 id uuid primary key default gen_random_uuid(), user_id uuid not null default auth.uid() references auth.users(id),
 message text not null check(length(message) between 5 and 4000),created_at timestamptz not null default now()
);
alter table public.transport_feedback enable row level security;
revoke all on public.transport_feedback from public,anon,authenticated;
grant select,insert on public.transport_feedback to authenticated;
grant all on public.transport_feedback to service_role;
create policy transport_feedback_own_insert on public.transport_feedback for insert to authenticated with check(user_id=(select auth.uid()) and (select public.current_app_role()) is not null);
create policy transport_feedback_read on public.transport_feedback for select to authenticated using(user_id=(select auth.uid()) or (select public.current_app_role())='admin');

-- No TRUNCATE/trigger bypass of Administrator-only route deletion.
revoke truncate,references,trigger on public.routes,public.profiles from anon,authenticated;
alter policy routes_authenticated_read on public.routes using (
 (select public.current_app_role()) is not null and not exists(
  select 1 from public.route_deletions d where d.route_date=routes.route_date and d.route_delivery_id=routes.route_delivery_id
 )
);
create or replace function public.transport_archive_route(target_route_id bigint)
returns jsonb language plpgsql security definer set search_path='' as $$
declare r public.routes%rowtype;
begin
 if public.current_app_role() is distinct from 'admin' then raise insufficient_privilege using message='Тільки Administrator може видаляти маршрути';end if;
 select * into strict r from public.routes where id=target_route_id for update;
 insert into public.route_deletions(route_date,route_delivery_id,route_id,deleted_by)
 values(r.route_date,r.route_delivery_id,r.id,auth.uid()) on conflict do nothing;
 insert into public.transport_audit_log(actor_id,action,entity,entity_key,details)
 values(auth.uid(),'route_archived','routes',r.id::text,jsonb_build_object('route_date',r.route_date,'route_delivery_id',r.route_delivery_id));
 return jsonb_build_object('ok',true);
end $$;
revoke all on function public.transport_archive_route(bigint) from public,anon;
grant execute on function public.transport_archive_route(bigint) to authenticated;

create or replace function public.transport_update_profile(target_user_id uuid,new_name text,new_role text,new_active boolean)
returns jsonb language plpgsql security definer set search_path='' as $$
declare old public.profiles%rowtype;
begin
 if auth.uid() is null then raise insufficient_privilege;end if;
 -- Serializes administrator changes, preventing concurrent removal of the last administrator.
 perform pg_advisory_xact_lock(443002);
 select * into strict old from public.profiles where id=target_user_id for update;
 if public.current_app_role()='admin' then
  if new_role not in ('admin','manager','logistician') then raise exception 'Невірна роль';end if;
  if old.role='admin' and old.active and (new_role<>'admin' or not new_active) and not exists(select 1 from public.profiles where id<>target_user_id and role='admin' and active) then raise exception 'Не можна вимкнути останнього Administrator';end if;
 elsif target_user_id<>auth.uid() or new_role<>old.role or new_active<>old.active or not old.active then raise insufficient_privilege;
 end if;
 if length(trim(new_name)) not between 2 and 120 then raise exception 'ПІБ має містити 2–120 символів';end if;
 update public.profiles set full_name=trim(new_name),role=new_role,active=new_active,updated_at=now() where id=target_user_id;
 insert into public.transport_audit_log(actor_id,action,entity,entity_key,details) values(auth.uid(),'profile_updated','profiles',target_user_id::text,jsonb_build_object('role',new_role,'active',new_active));
 return jsonb_build_object('ok',true);
end $$;
revoke all on function public.transport_update_profile(uuid,text,text,boolean) from public,anon;
grant execute on function public.transport_update_profile(uuid,text,text,boolean) to authenticated;

-- Service-only device vault. PIN is bcrypt-hashed and protected by a high-entropy device secret.
-- Authenticated/anonymous clients cannot select keys or invoke PIN RPCs directly.
create table public.transport_device_vaults (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 secret_hash bytea not null, pin_hash text not null, unlock_key text not null,
 attempts integer not null default 0,locked_until timestamptz,disabled boolean not null default false,
 credential jsonb,challenge jsonb,created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create index transport_device_vaults_user on public.transport_device_vaults(user_id);
alter table public.transport_device_vaults enable row level security;
revoke all on public.transport_device_vaults from public,anon,authenticated;
grant all on public.transport_device_vaults to service_role;
create or replace function public.transport_enroll_device(owner_id uuid,pin text,device_secret text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare d public.transport_device_vaults%rowtype;
begin
 if pin!~'^[0-9]{4}$' or length(device_secret)<40 then raise exception 'Некоректні параметри';end if;
 if not exists(select 1 from public.profiles where id=owner_id and active) then raise insufficient_privilege;end if;
 insert into public.transport_device_vaults(user_id,secret_hash,pin_hash,unlock_key)
 values(owner_id,extensions.digest(device_secret,'sha256'),extensions.crypt(pin,extensions.gen_salt('bf',12)),encode(extensions.gen_random_bytes(32),'base64')) returning * into d;
 insert into public.transport_audit_log(actor_id,action,entity,entity_key) values(owner_id,'device_enrolled','security',d.id::text);
 return jsonb_build_object('id',d.id,'key',d.unlock_key);
end $$;
create or replace function public.transport_unlock_device(device_id uuid,pin text,device_secret text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare d public.transport_device_vaults%rowtype;n integer;
begin
 select * into d from public.transport_device_vaults where id=device_id for update;
 if not found or d.disabled or d.secret_hash<>extensions.digest(device_secret,'sha256') or not exists(select 1 from public.profiles where id=d.user_id and active) then return jsonb_build_object('ok',false,'error','Пристрій недоступний. Увійдіть через email і пароль.');end if;
 if d.attempts>=10 then return jsonb_build_object('ok',false,'error','Швидкий вхід заблоковано. Увійдіть через email і пароль.');end if;
 if d.locked_until>now() then return jsonb_build_object('ok',false,'error','Забагато спроб. Спробуйте через 15 хвилин.');end if;
 if pin!~'^[0-9]{4}$' or extensions.crypt(pin,d.pin_hash)<>d.pin_hash then
  n:=d.attempts+1;update public.transport_device_vaults set attempts=n,locked_until=case when n>=5 then now()+interval '15 minutes' else null end,updated_at=now() where id=d.id;
  return jsonb_build_object('ok',false,'error',case when n>=10 then 'Швидкий вхід заблоковано. Увійдіть через email і пароль.' when n>=5 then 'Забагато спроб. Спробуйте через 15 хвилин.' else 'Невірний PIN' end);
 end if;
 update public.transport_device_vaults set attempts=0,locked_until=null,updated_at=now() where id=d.id;
 return jsonb_build_object('ok',true,'key',d.unlock_key,'user_id',d.user_id);
end $$;
revoke all on function public.transport_enroll_device(uuid,text,text), public.transport_unlock_device(uuid,text,text) from public,anon,authenticated;
grant execute on function public.transport_enroll_device(uuid,text,text), public.transport_unlock_device(uuid,text,text) to service_role;

create or replace function public.transport_audit_write()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into public.transport_audit_log(actor_id,action,entity,entity_key,details)
 values(auth.uid(),lower(tg_op),tg_table_name,coalesce(to_jsonb(new)->>'id',to_jsonb(old)->>'id'),jsonb_build_object('before',to_jsonb(old),'after',to_jsonb(new)));
 return coalesce(new,old);
end $$;
revoke all on function public.transport_audit_write() from public,anon,authenticated;
create trigger transport_route_facts_audit after insert or update or delete on public.route_facts for each row execute function public.transport_audit_write();
create trigger transport_fleet_cost_audit after insert or update or delete on public.fleet_cost_entries for each row execute function public.transport_audit_write();
create trigger transport_rates_audit after insert or update or delete on public.transport_monthly_rates for each row execute function public.transport_audit_write();
