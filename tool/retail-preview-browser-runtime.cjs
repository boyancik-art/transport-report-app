// Run only in a fresh Playwright context. Never attach this audit to a user's browser.
const fs = require("node:fs"),
  path = require("node:path"),
  os = require("node:os");
const doc = {
  id: "900001",
  key: "900001|15.09.2026|WH-001|Test",
  date: "15.09.2026",
  store: "Audit test store",
  storeAddress: "Audit address",
  senderWarehouse: "Audit warehouse",
  receiverWarehouse: "Test",
  sourcePallets: 99,
  sourceWeight: 60,
  calc: 1,
  calcWeight: 60,
  amount: 600,
  qty: 120,
  status: "Скомплектовано",
  workflowStatus: "picked",
  lines: [
    {
      sku: "123456",
      barcode: "4821234567890",
      name: "Audit item",
      qty: 120,
      unitsCase: 12,
      casesPal: 10,
      unitWeight: 0.5,
      weight: 60,
      pallets: 1,
      amount: 600,
    },
  ],
};
const fixtures = {
  tc_retail_docs_v3: [doc],
  tc_retail_docs_v2: [doc],
  tc_retail_imports_v1: [],
  tc_retail_tickets_v1: [
    {
      number: "TK-0001",
      documentIds: [doc.id],
      status: "Скомплектовано",
      actualPallets: 1,
      store: doc.store,
      storeAddress: doc.storeAddress,
    },
  ],
  tc_retail_routes_v1: [],
  tc_retail_interwarehouse_v1: [],
  tc_retail_ttn_journal_v1: [],
  tc_retail_fleet_v1: {
    carriers: [{ id: "TEST-CARRIER-1", name: "Тест 1" }],
    drivers: [{ id: "TEST-DRIVER-1", name: "Тест 1" }],
    vehicles: [{ id: "TEST-VEHICLE-1", name: "Тест 1", plate: "Тест 1" }],
  },
  retail_preview_reset_20260915_01: "done",
};

const output =
  process.env.AUDIT_OUTPUT ||
  fs.mkdtempSync(path.join(os.tmpdir(), "retail-preview-audit-"));
fs.mkdirSync(output, { recursive: true });
fs.writeFileSync(path.join(output, "fixtures.json"), JSON.stringify(fixtures));
module.exports = {
  output,
  baseURL: process.env.AUDIT_BASE_URL || "http://127.0.0.1:8766",
  chromium: require(process.env.PLAYWRIGHT_MODULE || "playwright").chromium,
  launchOptions: {
    headless: true,
    ...(process.env.AUDIT_BROWSER_PATH
      ? { executablePath: process.env.AUDIT_BROWSER_PATH }
      : {}),
  },
  xlsxPath:
    process.env.AUDIT_XLSX_PATH ||
    require.resolve("xlsx/dist/xlsx.full.min.js"),
};
