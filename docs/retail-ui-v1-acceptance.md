# Retail UI v1 — Preview acceptance

Source: TZ_Retail_TS_PLUS_UI_v1.docx (16 September 2026), five embedded 1536×1024 mockups. The route tab and both registries follow the written specification and the same design system, as explicitly approved by the user.

## Scope

Only `retail-cloudflare-preview`, under `web/retail-cloudflare`, associated tests and this report. Production modules and workflows are unchanged. Directory source and UI remain byte-identical to the approved control baseline `a9f19e713ed95d514ad94752779785817ac3c9a6`: 39 WT stores and 4 warehouses.

The later presentation patches that substituted a 38-store list are no longer loaded. Their files remain intact. Native persistence, import, picking, route construction and TTN services remain the operational owners; `retail-ui.js` owns presentation on the eight new screens.

## Screen audit

| Screen | Reference | Implemented and visually inspected |
|---|---|---|
| Dashboard | DOCX image 1 | Hero, five KPI cards, weekly pallets, store lead times, average store volumes, delivery-cost detail, period control |
| Base information | Image 2 | One upload/drop target, real import timestamp, mathematical pallets, exactly two displayed statuses, filters and protected clearing |
| Picking | Image 3 | KPI, status tabs, multiselect, PDF/Excel, ticket drawer, goods/document/history tabs, actual pallets and explicit completion result |
| Completed | Image 4 | Completed tickets, goods plus pallet weight, aggregate planning action, waiting/planned/result filters, readonly drawer |
| Planning | Image 5 | Five-step strip, delivery type, available tickets, transport/manual fields, lower route preview and summary, session draft |
| Route tab | Text | Cargo details, store arrival windows, stop ordering before finalization, saved metadata, TTN actions |
| Route registry | Text | Formed routes only, filters, linked TTN identities, full route card |
| TTN registry | Text | Separate records, filters, preview/reprint and transport metadata editing without changing existing identities |

## Verification

- 13 existing `tool/retail-*.test.cjs` suites pass, including atomic rollback, malformed storage, protected directories, financial semantics, picking persistence, multi-store routes and three-copy TTN generation.
- `tool/retail-ui-browser.cjs`: fresh Chromium context, actual Excel library and workbook import, no request interception, no injected directory/operational state. Covers directory navigation/reload/hard reload, duplicate import, actual pallets persistence, completion, full weight, manual transport, draft reload, route creation, arrival windows, seals, repeated generation, stable TTN number, transport edit and preview, exclusion of used tickets, all eight screens at 1536×1024 and 390×844. No page/console/resource errors.
- Separate visual-only operational fixtures exercise populated tables and drawers. These are not application seed data and never modify directories.
- Multiple screenshot iterations; 50% overlays and amplified pixel differences for all five image-backed screens. Adjustments include content width, screen-specific sidebar/header dimensions, KPI widths/heights, fixed table/drawer viewport, and the full-width lower planning grid.
- Raw pixel differences are diagnostic, not an acceptance percentage: dates, approved records, row counts and user-required navigation/text differ from the example data.

## Remaining visual differences

- Icons are working SVG/CSS equivalents; font rasterization, some shadows/gradients and small control spacing differ from the raster originals.
- Navigation exposes all eight requested screens; labels and vertical positions consequently differ from mockups that combine Routes/TTN sections.
- Filters use separate accessible date fields. Available reference/manual fields use native controls; they are not exact replicas of the mockup's custom dropdowns.
- Real data and empty states replace illustrative counts/records. No illustrative KPI numbers are shipped as application data.

## Reserved for final business-logic stage

- Consolidated interwarehouse TTN: the UI can retain the route/destination, but generation is explicitly blocked rather than incorrectly producing direct-store TTNs.
- Removing the saved loading-register/seal dependency requires a separately approved lifecycle change. Existing safeguards remain; new UI print packets omit the register sheet.
- Final validation and print-template wiring for the additional trailer/vehicle/responsible fields; full per-store arrival behavior for consolidated interwarehouse cargo.
- Independent per-TTN print selection currently uses the existing route packet generator (one identity per store, three copies each).
- Multi-stop delivery-cost allocation, historical weekly comparisons and final delivery-event analytics require approved business definitions. Single-store route costs can be shown without invented allocations.
- Route optimization, durable shared drafts, transport-directory CRUD, final roles/permissions and final lifecycle acceptance.

This is the UI/partial-integration review stage. It is not a claim of 100% pixel equality or completion of the reserved business stage.
