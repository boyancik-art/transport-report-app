-- Retail Online Shipments v1
-- Applied to Supabase project ccmwhtojyofefyzespty on 2026-09-14.
-- Additive only: extends the existing tc_retail_* model.

alter table public.tc_retail_stores
  add column if not exists postal_code text,
  add column if not exists city text,
  add column if not exists address text,
  add column if not exists location_kind text not null default 'store';

alter table public.tc_retail_routes
  add column if not exists route_type text not null default 'retail',
  add column if not exists responsible_name text,
  add column if not exists planned_departure_at timestamptz,
  add column if not exists actual_departure_at timestamptz,
  add column if not exists planned_finish_at timestamptz,
  add column if not exists actual_finish_at timestamptz,
  add column if not exists issue_reason text;

alter table public.tc_retail_route_points
  add column if not exists planned_arrival_at timestamptz,
  add column if not exists actual_arrival_at timestamptz,
  add column if not exists point_status text not null default 'planned',
  add column if not exists issue_reason text;

create index if not exists idx_tc_retail_routes_date_type
  on public.tc_retail_routes(route_date, route_type);
create index if not exists idx_tc_retail_route_points_status
  on public.tc_retail_route_points(point_status);
