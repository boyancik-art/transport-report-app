# Retail UI — APPROVED VISUAL CONTRACT

These files are the approved visual references for the next Codex implementation pass. They are NOT loose inspiration. Reproduce the existing Retail visual language and the screen composition 1:1 as closely as practical, while preserving the business rules below.

## References
- `01-information-base.svg` — Інформація з бази
- `02-orders.svg` — Замовлення
- `03-route-planning.svg` — Планування маршрутів
- `04-route-register.svg` — Реєстр маршрутів

## Home / Dashboard
DO NOT redesign Home. Restore the previously approved analytical Dashboard with KPI cards and charts from git history. Home is analytics, not an operational orders table.

## Global visual acceptance
- Preserve existing Retail dark navy + WINETIME burgundy/magenta + teal/blue visual language.
- Header/sidebar geometry, typography, controls, cards, table density and spacing must stay consistent across all screens.
- WINETIME fox/logo is a protected visual asset: show the FULL fox. Never crop ears, head, tail or edges. Do not approximate/redraw it with CSS. Use the existing approved asset.
- Avoid `object-fit: cover` or clipping containers for the fox/logo. Prefer contain/intrinsic aspect ratio and enough padding.
- Check every hero/image/icon for clipping and overflow.
- No pagination on Information Base, Orders, Route Planning or Route Register. Use one continuous list with vertical scrolling. Horizontal scrolling is allowed on narrow viewports when required to preserve columns.
- Filters live directly above the relevant table, not in a detached page.
- Verify 1920x1080, 1536x864, 1366x768 and mobile. No clipped text/buttons/dropdowns/calendar/popovers/images.
- A passing regression suite is insufficient if visual comparison fails.

## Business flow
`Інформація з бази -> Замовлення -> Планування маршрутів -> Реєстр маршрутів`

TTN IS OUT OF SCOPE FOR THIS PASS. Do not implement or redesign TTN yet.

## Information Base final corrections
Columns: checkbox, № замовлення, Дата, Час документа, Магазин/повна адреса, Склад, Напрям, Позицій, Штук, Мат. палет, Вага, Стан.
Filters: store/address, direction, warehouse, date from/to, document cutoff time, search. Direction is resolved from the WT store directory together with the address. If lookup is not unambiguous, show `Не знайдено в довіднику`; never guess. `Вибрати всі` means all FILTERED rows only, including cutoff-time rules.

## Orders final corrections
Orders is only preparation/complectation. A row is a selected group of source LO documents; the same store may appear many times with different document groups. Show: store/address, direction, documents, document date/time, positions, pieces, mathematical pallets, ACTUAL pallets, weight, preparation status, ready-at, state. Actual pallets are manually editable and remain `—` until entered. Main action: `Передати в планування маршрутів`. No vehicle/carrier/tariff/delivery planning/fact delivery/TTN here.

## Route Planning final corrections
Only orders transferred from Orders appear here. Show both mathematical and actual pallets. Select arbitrary orders and form a route. Route fields: route number, sender warehouse, direction, carrier, vehicle, driver, tariff, temperature mode, vehicle format, note, ordered stops. Each stop includes planned warehouse departure, planned DELIVERY DATE, delivery time interval from-to OR `Протягом дня`. No pagination. No TTN in this pass.

## Route Register final corrections
One row = one formed route. Include: route number, route date, planned departure, PLANNED DELIVERY DATE, warehouse, direction, TT count, mathematical pallets, actual pallets, weight, carrier, vehicle, driver, tariff, status, actions. Detail drawer shows route totals and stops in real order 1 -> 2 -> 3 with store/address, math pallets, actual pallets, planned delivery date and planned delivery time/`Протягом дня`. Actions: edit, return to planning when not dispatched, transport status change, finish route. No TTN in this pass.
