# v44.2 — navigation and analytics

Scope: Cloudflare `cloudflare-migration` only. No changes to `main`, Vercel, source schemas, rates, invoice/TT weights, shared-tariff logic or monthly fleet allocation.

## Screens

- Dashboard is the signed-in landing screen, intentionally a placeholder for future visual comparisons. No invented charts or statistics.
- Analytics aggregates existing allocations, separately for local delivery and courier delivery. Pickup and unclassified imported routes are excluded; unclassified routes are explicitly reported and retained in Base.
- Routes: Base, FOP/TS, Bakery/Fresh, Courier, Replenishment, SAV, STV, Pickup. Base is a complete imported-record view, not a second accounting ledger. Manual routes remain in their operating blocks.
- Expense directory retains existing fleet, monthly SAV/STV rates and STV interbranch editors. Coverage dictionary is accessible here.
- Menu contains the existing data refresh, app refresh and sign-out actions.

## Reporting invariants

Amounts are read from the v44.0 route → TT → invoice allocation functions. Totals sum integer cents. Filters never remove members from allocation inputs or persist operational changes.

TT identity is the route point ID (delivery visit). Multiple invoices of the same TT count once per branch. In business detail, a TT with invoices from different businesses counts in each applicable business; the displayed explanation states that these counts are non-additive. Existing per-invoice costs are summed by business. A single invoice containing multiple businesses is kept in the explicit unassigned-business row rather than introducing a new cost-split rule.

Additional TT counts and their existing cost shares are included. Only actual entered pallets are displayed; estimated allocation weights are not shown as physical shipments. Manual routes are included with their existing hired/fleet costs. Missing business and ambiguous manual-route branch stay explicit. Route costs without linked points stay in an unassigned row, not silently discarded.

Coverage aliases: Chaiky STV/Ecol and Kyiv TS → Kyiv; known short warehouse cities normalize to the city. SAV/STV use the coverage result of each TT; one route can therefore contribute to multiple branches. Unknown mappings are labelled, not inferred from customer addresses.

Missing partner tariff/coverage data makes the cost subtotal explicitly incomplete; average cost and logistics percentage are not asserted as complete. `Без зони · N` counts routes with at least one unresolved coverage/zone; missing monthly rates alone do not activate this filter.

Replenishment analytics use dated `branch_replenishments`: pallets, current tariff, and weighted cost per pallet grouped by receiving branch. Monthly STV interbranch records remain separate (explicit UI note); no new day-level distribution of monthly amounts is invented.

## Tests

`finance-core.test.cjs`: unchanged 197 coverage records and 343 penny-conservation cases.
`analytics-core.test.cjs`: branch aliases, business identity, unique TT, extra counts, cents, incomplete metrics and empty denominators.
`mobile-regression.cjs`: all previous financial flows plus shell/date refresh and `analytics-flows.cjs` (navigation, Base, filters, business drilldowns, exclusions, amount conservation, empty periods, API retry, navigation races, mobile widths).
`runtime-regression.cjs`: complete built scripts with isolated backend, login/session reload/logout, all five screens, idle responsiveness and phone-preview iframe; repeated against the deployed Cloudflare runtime.
