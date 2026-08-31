# Transport Control — Retail v1

## Product goal
A single operational register of actual Retail transport routes. This is not a TMS and does not plan or optimize routes.

## UX direction
- Dark-first interface only for v1.
- Premium, restrained visual language: near-black graphite background, soft elevated surfaces, thin borders, muted text, one low-saturation accent.
- No bright gradients, gaming aesthetics, excessive animations, or visual noise.
- Desktop: dense operational register and dashboard.
- Mobile/PWA: fast route entry and route cards.

## Retail route model
Route header:
- route date
- warehouse
- temperature regime
- vehicle
- driver
- carrier (auto from vehicle, editable if needed)
- route number
- tariff
- comment
- status

Route points:
- store / delivery point
- pallets
- weight kg
- sort order
- note

Derived values:
- TT count
- total pallets
- total weight
- pallet load %
- weight load %
- effective vehicle load = max(pallet load %, weight load %)
- UAH/TT
- UAH/pallet

## Reference data imported from current WT_DH workbook
- 46 Retail/store/delivery point records
- 32 unique vehicle records
- vehicle → carrier mapping
- pallet capacity
- max weight
- store → direction mapping
- available default warehouse/temperature values where present in the source workbook

## Main screens
1. Dashboard
2. Routes register
3. Create/Edit Retail route
4. Route details
5. Reference data
6. Attention queue

## MVP rule
A route cannot be closed when required operational fields are missing. The system must clearly show routes requiring attention.

## Stage boundary
Stage 1: Retail only.
Stage 2: Distribution is added as a separate input workflow over the shared transport data model.