-- Transport Report App v3
-- Adds application users/roles and route claiming to the existing cube schema.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role text not null default 'logistician' check (role in ('admin','manager','logistician')),
  allowed_waves text[] not null default '{}',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.routes
  add column if not exists assigned_logistician_id uuid references auth.users(id),
  add column if not exists assigned_at timestamptz;

create index if not exists routes_assigned_logistician_idx
  on public.routes(assigned_logistician_id);

alter table public.profiles enable row level security;

-- Authenticated users can read their own profile.
drop policy if exists profiles_read_self on public.profiles;
create policy profiles_read_self
on public.profiles for select
to authenticated
using (id = auth.uid());

-- Admins can read all profiles.
drop policy if exists profiles_admin_read_all on public.profiles;
create policy profiles_admin_read_all
on public.profiles for select
to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin' and p.active = true
  )
);

-- Active authenticated users can read routes.
drop policy if exists routes_authenticated_read on public.routes;
create policy routes_authenticated_read
on public.routes for select
to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.active = true
  )
);

-- A logistician can claim an unassigned route, or update a route already claimed by them.
drop policy if exists routes_logistician_claim on public.routes;
create policy routes_logistician_claim
on public.routes for update
to authenticated
using (
  assigned_logistician_id is null
  or assigned_logistician_id = auth.uid()
  or exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('admin','manager') and p.active = true
  )
)
with check (
  assigned_logistician_id = auth.uid()
  or exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('admin','manager') and p.active = true
  )
);

-- Route facts can be read by authenticated users.
drop policy if exists route_facts_authenticated_read on public.route_facts;
create policy route_facts_authenticated_read
on public.route_facts for select
to authenticated
using (true);

-- Logisticians can write facts only for their own claimed route; admin/manager can write all.
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
        or exists (
          select 1 from public.profiles p
          where p.id = auth.uid() and p.role in ('admin','manager') and p.active = true
        )
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
        or exists (
          select 1 from public.profiles p
          where p.id = auth.uid() and p.role in ('admin','manager') and p.active = true
        )
      )
  )
);

-- Route point/detail data is readable for authenticated users.
drop policy if exists route_points_authenticated_read on public.route_points;
create policy route_points_authenticated_read
on public.route_points for select
to authenticated
using (true);

drop policy if exists locations_authenticated_read on public.locations;
create policy locations_authenticated_read
on public.locations for select
to authenticated
using (true);

drop policy if exists route_business_authenticated_read on public.route_business_allocations;
create policy route_business_authenticated_read
on public.route_business_allocations for select
to authenticated
using (true);

-- Helper: automatically create a basic profile for a newly-created auth user.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email), 'logistician')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();
