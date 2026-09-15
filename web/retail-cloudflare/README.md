# Retail reference dashboard

Scope: isolated `retail-cloudflare-preview` branch and Cloudflare Pages project `transport-report-ts-retail-preview`.

The supplied 1536 × 1024 approved reference defines the desktop layout. The inbound dashboard panel is removed; hubs and route types share its former row. Route-type labels use Алко; application and hero branding retain Retail.

Artwork in `assets/` is extracted from the supplied reference. Text, KPI cards, navigation, tables, filters, and document controls are HTML. Roboto is self-hosted under its accompanying OFL license. The reference hero is raster artwork, including its lettering.

`dashboard.js` switches between the dashboard and the existing document registry using URL hashes. `operations.js` remains unchanged. Documents and Excel import are available through Вхідні вантажі / Талони комплектації / ТТН, and the route action buttons.

Verified in Chrome at 1536 × 1024 after four screenshot/overlay iterations:

- Hero: x269 y88, 1249 × 178; KPI row: x269 y277, 1249 × 106.
- Middle row: x269 y398, 1249 × 304; routes: x269 y713, 1249 × 288.
- TDSheet XLSX import, product details, pallet/weight recalculation, actual pallet persistence, duplicate-free reimport, ticket/route dialogs, navigation, and route filters pass.
- The clock remains live, so its date/time differs from the reference. Browser font rasterization and the expanded middle row account for remaining visual differences.

Existing preview workflow materializes legacy v13 assets before deployment; this dashboard uses the committed reference assets independently. Production workflow and project configuration are unchanged.
