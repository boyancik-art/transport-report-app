-- Transport Report App v3.1 hotfix
-- Fixes PostgreSQL 42P17: infinite recursion detected in policy for relation "profiles".

create or replace function public.current_app_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role
  from public.profiles
  where id = auth.uid()
    and active = true
  limit 1;
$$;

revoke all on function public.current_app_role() from public;
grant execute on function public.current_app_role() to authenticated;

drop policy if exists profiles_admin_read_all on public.profiles;
create policy profiles_admin_read_all
on public.profiles for select
to authenticated
using (public.current_app_role() = 'admin');

-- Use the helper in route access policies as well.
drop policy if exists routes_authenticated_read on public.routes;
create policy routes_authenticated_read
on public.routes for select
to authenticated
using (public.current_app_role() is not null);

drop policy if exists routes_logistician_claim on public.routes;
create policy routes_logistician_claim
on public.routes for update
to authenticated
using (
  assigned_logistician_id is null
  or assigned_logistician_id = auth.uid()
  or public.current_app_role() in ('admin','manager')
)
with check (
  assigned_logistician_id = auth.uid()
  or public.current_app_role() in ('admin','manager')
);

drop policy if exists route_facts_authenticated_write on public.route_facts;
create policy route_facts_authenticated_write
on public.route_facts for all
to authenticated
using (
  exists (
    select 1
    from public.routes r
    where r.id = route_id
      and (
        r.assigned_logistician_id = auth.uid()
        or public.current_app_role() in ('admin','manager')
      )
  )
)
with check (
  exists (
    select 1
    from public.routes r
    where r.id = route_id
      and (
        r.assigned_logistician_id = auth.uid()
        or public.current_app_role() in ('admin','manager')
      )
  )
);
