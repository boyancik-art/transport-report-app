# Transport Report TS v44.0

Cloudflare migration only. Vercel and `main` are not changed.

## Calculation rules

- Pickup TT/invoices show sales and physical quantities, not delivery costs or logistics percentages.
- FOP/bakery allocation is 30% pallets, 50% bottles, 20% weight. Missing dimensions are excluded and remaining weights normalized. If all physical dimensions are zero, allocation falls back to TT count. Money is apportioned in integer kopecks using largest remainders.
- System TT + ordinary extra TT + selected bakery VT form the allocation base. Extras without quantities receive the route's average physical quantities per system TT.
- Courier groups store one shared tariff across their member TT. Already-priced groups can be combined. Selecting a member of an existing group adds that entire group and replaces its previous tariff. Per-TT carrier overrides remain independent. The group cost is distributed by the same physical weights, then within each TT between invoices. A TS PLUS TT gets zero carrier tariff; paid group cost is apportioned among the remaining paid TT.
- `ТОВ ТС ПЛЮС` route tariff is always zero. Actual monthly fleet costs are separate. Salary + fuel + depreciation + repair + insurance are summed by a generated database column. Each entry targets one block (FOP or bakery) and one or more exact system expeditor names.
- Fleet allocation reads the entire selected month, regardless of dashboard date range, and includes only the selected expeditors whose carrier is TS PLUS. Distinct cost entries are additive; editing an entry uses the same ID and does not create another entry. Entries with no eligible TT remain visibly unallocated. Calculations refresh from live route data; this is not a locked accounting-period snapshot.
- SAV/STV TT cost = fixed TT rate + zone pallet rate × TT pallets, rounded to kopecks. Route cost is the sum of TT costs; average TT cost is route cost / TT count. Missing coverage or month rate is shown as an unresolved calculation, never an invented zero invoice cost.
- Rates match the exact delivery month. There is no automatic carry-forward. The uploaded Excel has no effective month, so its rates are editable templates and are only activated when a user saves a month explicitly. Source rates exclude VAT and retain original precision.
- STV interbranch delivery is a separate monthly subblock. Each sender/month has one editable recipient list. Recipient cost = pallets × price per pallet; total is generated and validated in PostgreSQL. It is not silently added to last-mile TT tariffs.

## Source and storage

`Зони доставки_SAV_STV.xlsx`: 190 STV coverage rows, 7 SAV rows, five pallet zones and one fixed TT rate for each carrier. Extracted rows are in `tool/coverage-v44.json`; rate templates are in `web/tariff-template-v44.js`.

New additive tables: `transport_delivery_coverage`, `transport_monthly_rates`, `fleet_cost_entries`, `transport_carrier_blocks`, `stv_branch_directory`, `stv_interbranch_months`. Existing zone and monthly cost ledgers are preserved. `fop_manual_routes` gains block, expeditor name and wave.

All new tables have RLS and explicit SELECT/INSERT/UPDATE grants, no anonymous access and no authenticated TRUNCATE permission. Monthly rates, fleet costs and coverage edits require existing admin/manager roles. Carrier scopes, STV branches and interbranch entries also permit the existing logistician role. No role is elevated.

Schema setup source: `supabase/transport_v44_finance_setup.sql`. Applied remote migrations: `transport_v44_fleet_coverage_and_interbranch`, `transport_v44_explicit_table_privileges`.

## Verification

`node tool/finance-core.test.cjs`: exact geography and month keys, 197 source rows, allocation conservation across 343 cases.

`tool/mobile-regression.cjs` + `tool/finance-flows.cjs`: real frontend handlers against isolated fake data; persistence/retry, grouping, invoice cards, own-fleet full-month allocation, monthly tariffs, missing coverage, interbranch math, manual bakery routes.

`tool/runtime-regression.cjs`: complete built script stack on desktop, mobile and phone preview, login/reload, all seven blocks, idle responsiveness. Backend traffic is isolated, including live deployment smoke tests.
