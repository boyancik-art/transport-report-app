# Retail Operations Core v1

## Source of truth
Excel import preserves document-level identity. A document is never flattened into a route.

## Entities
- Import batch
- Order document
- Document line
- Store/recipient
- Picking ticket
- Route
- Route document membership
- Loading register
- TTN

## Document calculations
For every document calculate and persist/display:
- document number/date
- recipient store/address
- source warehouse
- amount excl VAT
- VAT = amount excl VAT * 0.20 unless source explicitly supplies tax
- amount incl VAT
- gross weight
- calculated pallets using source packaging: qty / units-per-case / cases-per-pallet, with the same rounding/business rules as the approved Excel TTN model
- actual pallets: separate editable field next to calculated pallets; never overwrite calculated value

Multiple documents for one store remain separate documents but share the same recipient/store identity.

## Document drill-down
Clicking document number opens details with header KPIs and all lines living inside the document: item/code, quantity, units per case, cases per pallet, calculated cases/pallets, weight, unit price, amount.
Also show lifecycle links: picking ticket, route, TTN.

## Picking ticket
User may select one or many documents and generate a picking ticket before or after route assignment. Ticket may aggregate operational picking while retaining line -> document -> store traceability.

## Route builder
From selected documents:
1. suggest a matching existing/current route based on recipients;
2. allow adding to an existing route;
3. allow creating a new route;
4. allow creating a route manually even when its future orders are not yet in the imported list.
A document cannot belong to two active routes accidentally. Moving it requires an explicit move operation.

## Document flow
Excel -> Documents -> Document lines -> Picking ticket -> Actual pallets -> Route -> Loading register -> TTN -> PDF packet.

## Route drill-down
Route -> stores/points -> documents -> document lines.

## First test slice
Implement the UI/data adapter contract first with demo/imported rows:
- Documents register
- document drill-down
- calculated + actual pallets
- multi-select
- Create picking ticket
- Add to route / Create route
- route suggestion placeholder
No production branch changes. No production Supabase writes.