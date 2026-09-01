-- The courier policies already target authenticated users, but the tables and
-- identity sequences were created without the privileges required by the UI.
-- Grant only the operations currently used by the courier delivery editor.
-- Existing RLS policies stay enabled and continue to apply.
GRANT SELECT, INSERT, UPDATE ON TABLE
  public.courier_shipments,
  public.courier_shipment_points
TO authenticated;

GRANT SELECT, INSERT ON TABLE public.courier_carriers TO authenticated;

GRANT USAGE ON SEQUENCE
  public.courier_carriers_id_seq,
  public.courier_shipment_points_id_seq
TO authenticated;
