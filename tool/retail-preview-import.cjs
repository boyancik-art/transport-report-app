const {
  chromium,
  launchOptions,
  output,
  baseURL,
  xlsxPath,
} = require("./retail-preview-browser-runtime.cjs");
const path = require("node:path");
const fs = require("fs"),
  assert = require("assert"),
  XLSX = require(xlsxPath);
(async () => {
  const browser = await chromium.launch(launchOptions),
    context = await browser.newContext({
      viewport: { width: 1536, height: 1024 },
    }),
    p = await context.newPage(),
    errors = [];
  p.on("pageerror", (e) => errors.push(e.message));
  p.on("dialog", (d) => d.dismiss());
  await context.route("**/xlsx.full.min.js", (r) =>
    r.fulfill({ path: xlsxPath, contentType: "text/javascript" }),
  );
  const fixture = JSON.parse(
    fs.readFileSync(path.join(output, "fixtures.json")),
  );
  fixture.tc_retail_tickets_v1 = [];
  fixture.tc_retail_docs_v3[0].workflowStatus = "new";
  fixture.tc_retail_docs_v3[0].status = "Новий";
  await context.addInitScript((f) => {
    if (!sessionStorage.getItem("audit-fixture")) {
      for (const [k, v] of Object.entries(f))
        localStorage.setItem(k, typeof v === "string" ? v : JSON.stringify(v));
      sessionStorage.setItem("audit-fixture", "1");
    }
    window.print = () => {};
  }, fixture);
  await p.goto(baseURL + "/#base-excel");
  await p.locator("[data-details3]").waitFor();
  const rows = [
    [null, null, null, null, null, null, "Склад отправитель"],
    [
      null,
      "Номер",
      "Склад получатель",
      "Кол-во палет",
      "Общий вес",
      null,
      "Ссылка",
      null,
      "Количество",
      "Сумма",
    ],
    [
      null,
      "Артикул",
      "Основний ШК",
      "Кейсов на паллете",
      "Штук в ящику",
      "Вес",
      "Номенклатура",
      "Ємність",
    ],
    [null, null, null, null, null, null, "Склад Audit"],
    [
      null,
      800001,
      "Склад №1 магазин Audit import",
      99,
      60,
      null,
      "Лист відбору 800001 від 15.09.2026",
      null,
      120,
      600,
    ],
    [
      null,
      123456,
      "4821234567890",
      10,
      12,
      0.5,
      "Imported item",
      ".5 л",
      120,
      600,
    ],
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), "TDSheet");
  fs.writeFileSync(
    path.join(output, "import.xlsx"),
    XLSX.write(wb, { type: "buffer", bookType: "xlsx" }),
  );
  async function upload() {
    const choose = p.waitForEvent("filechooser");
    await p.locator("[data-upload]").click();
    await (await choose).setFiles(path.join(output, "import.xlsx"));
    await p.locator("[data-confirm-import]").waitFor();
    await p.locator("[data-confirm-import]").evaluate((b) => {
      b.click();
      b.click();
    });
    await p.locator("#ops-fix-modal").waitFor({ state: "hidden" });
  }
  await upload();
  let docs = await p.evaluate(() => RetailState.documents());
  assert.equal(docs.length, 2);
  assert.equal(docs.find((x) => x.id === "800001").calc, 1);
  await upload();
  assert.equal((await p.evaluate(() => RetailState.documents())).length, 2);
  await p.locator("[data-details3]").click();
  await p.locator("tbody [data-doc]").first().check();
  await p.locator("[data-ticket]").click();
  await p.locator('[data-open="TK-0001"]').waitFor();
  await p.locator('[data-open="TK-0001"]').click();
  await p.locator("[data-ap]").fill("2.5");
  await p.locator("[data-complete-ok]").click();
  await p.locator("[data-completed-ticket]").waitFor();
  let t = await p.evaluate(() => RetailState.read("tc_retail_tickets_v1"));
  assert.equal(t.length, 1);
  assert.equal(t[0].actualPallets, "2.5");
  assert.equal(t[0].status, "Скомплектовано");
  assert.equal(t[0].picked["123456"], 120);
  await p.locator("[data-ticket]").check();
  await p.locator("[data-create]").click();
  await p.locator(".rb7").waitFor();
  assert.equal(
    (await p.evaluate(() => RetailState.read("tc_retail_routes_v1"))).length,
    0,
  );
  assert.equal(await p.locator(".rb7 [data-k=tt]").innerText(), "1");
  await p.locator(".rb7 [data-x]").first().click();
  // Storage errors must preserve state and expose a retryable error.
  await p.evaluate(() => {
    window.nativeSet = Storage.prototype.setItem;
    Storage.prototype.setItem = function (k, v) {
      if (k === "tc_retail_routes_v1")
        throw new DOMException("quota test", "QuotaExceededError");
      return nativeSet.call(this, k, v);
    };
  });
  await p.locator(".rdbar [data-new]").click();
  await p.locator("[data-f=from]").selectOption("WH-001");
  await p.locator("[data-f=carrier]").selectOption("TEST-CARRIER-1");
  await p.locator("[data-f=driver]").selectOption("TEST-DRIVER-1");
  await p.locator("[data-f=vehicle]").selectOption("TEST-VEHICLE-1");
  await p.locator(".rb7 [data-pick]").click();
  await p.locator(".rb7select [data-c]").check();
  await p.locator(".rb7select [data-ok]").click();
  await p.locator("[data-arr-from]").fill("12:00");
  await p.locator("[data-arr-to]").fill("13:00");
  await p.locator(".rb7 [data-save]").click();
  assert(await p.locator(".rb7").isVisible());
  assert.equal(await p.locator(".rb7 [data-save]").isEnabled(), true);
  assert(
    (await p.locator("#retail-feedback").innerText()).includes("quota test"),
  );
  assert.equal(
    (await p.evaluate(() => RetailState.read("tc_retail_routes_v1"))).length,
    0,
  );
  await p.evaluate(() => (Storage.prototype.setItem = nativeSet));
  await p.locator(".rb7 [data-x]").first().click();
  // Invalid persisted JSON is never overwritten or silently reset.
  await p.evaluate(() =>
    localStorage.setItem("tc_retail_routes_v1", "broken-json"),
  );
  await p.reload();
  await p.locator("#retail-feedback").waitFor();
  assert.equal(
    await p.evaluate(() => localStorage.getItem("tc_retail_routes_v1")),
    "broken-json",
  );
  await p.evaluate(() => localStorage.setItem("tc_retail_routes_v1", "[]"));
  await p.reload();
  const cdp = await context.newCDPSession(p);
  await cdp.send("Performance.enable");
  async function metrics() {
    const x = await cdp.send("Performance.getMetrics");
    return Object.fromEntries(x.metrics.map((m) => [m.name, m.value]));
  }
  const before = await metrics();
  for (let i = 0; i < 10; i++) {
    await p.getByRole("link", { name: "База Excel", exact: true }).click();
    await p.locator("[data-details3]").waitFor();
    await p.getByRole("link", { name: "Маршрути", exact: true }).click();
    await p.locator(".rdbar").waitFor();
  }
  await cdp.send("HeapProfiler.collectGarbage");
  const after = await metrics();
  // Fresh profile no reset marker: existing docs remain intact (legacy startup reset removed).
  await p.evaluate(() =>
    localStorage.removeItem("retail_preview_reset_20260915_01"),
  );
  const persisted = await p.evaluate(() =>
    localStorage.getItem("tc_retail_docs_v3"),
  );
  await p.reload();
  assert.equal(
    await p.evaluate(() => localStorage.getItem("tc_retail_docs_v3")),
    persisted,
  );
  assert.deepEqual(errors, []);
  fs.writeFileSync(
    path.join(output, "extended-tests.json"),
    JSON.stringify(
      {
        status: "PASS",
        errors,
        checks: [
          "real XLSX import preserves old documents",
          "repeat import idempotent",
          "selected document transfer",
          "picking actual pallets and completion",
          "completed entry opens builder without creating draft",
          "storage quota recovery",
          "corrupt JSON preservation",
          "10 navigation cycles",
          "startup without reset marker",
        ],
        performance: { before, after },
      },
      null,
      2,
    ),
  );
  console.log("PASS extended flows", errors);
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
