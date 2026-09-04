-- Fix function name resolution without changing signatures or identity output.
alter function public.cube_route_key_v2(date,text)
  set search_path = pg_catalog, extensions;

alter function public.cube_point_key_v2(text,text,text)
  set search_path = pg_catalog, extensions;
