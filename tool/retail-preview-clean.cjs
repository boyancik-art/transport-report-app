// Final acceptance: untouched fresh browser profile, real assets/CDN, no route interception,
// no init scripts, no injected directory data or manual console patches.
const {
  chromium,
  launchOptions,
  output,
  baseURL,
  xlsxPath,
} = require("./retail-preview-browser-runtime.cjs");
const fs = require("node:fs"),
  path = require("node:path"),
  crypto = require("node:crypto"),
  assert = require("node:assert/strict"),
  XLSX = require(xlsxPath),
  baseline = require("./retail-directory-baseline.json");
const hash = (x) =>
  crypto.createHash("sha256").update(JSON.stringify(x)).digest("hex");
(async () => {
  const browser = await chromium.launch(launchOptions),
    context = await browser.newContext({
      viewport: { width: 1536, height: 1024 },
    }),
    p = await context.newPage();
  const errors = [],
    consoleErrors = [],
    failed = [],
    requests = [],
    snapshots = [];
  context.on("page", (page) => {
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => {
      if (m.type() === "error")
        consoleErrors.push(m.text() + " " + JSON.stringify(m.location()));
    });
  });
  p.on("pageerror", (e) => errors.push(e.message));
  p.on("console", (m) => {
    if (m.type() === "error")
      consoleErrors.push(m.text() + " " + JSON.stringify(m.location()));
  });
  p.on("request", (r) => requests.push(r.url()));
  p.on("response", (r) => {
    if (r.status() >= 400) failed.push([r.url(), r.status()]);
  });
  p.on("requestfailed", (r) => failed.push([r.url(), r.failure()?.errorText]));
  p.on("dialog", (d) => d.dismiss());
  async function snapshot(stage) {
    const x = await p.evaluate(() => ({
      stores: RetailDirectories.stores(),
      warehouses: RetailDirectories.warehouses(),
      stored: [
        localStorage.getItem("tc_retail_stores_directory_v1"),
        localStorage.getItem("tc_retail_warehouses_v1"),
      ],
    }));
    assert.equal(hash(x.stores), baseline.stores.sha256);
    assert.equal(hash(x.warehouses), baseline.warehouses.sha256);
    assert.deepEqual(x.stored, [null, null]);
    snapshots.push({
      stage,
      stores: hash(x.stores),
      warehouses: hash(x.warehouses),
      stored: x.stored,
    });
  }
  async function directories(stage) {
    await p.getByRole("link", { name: "Довідники", exact: true }).click();
    await p
      .locator("#ops-documents")
      .getByRole("link", { name: "Магазини WT", exact: true })
      .click();
    await p
      .locator("#directory-live-page .df-table tbody tr")
      .first()
      .waitFor();
    assert.equal(
      await p.locator("#directory-live-page .df-table tbody tr").count(),
      39,
    );
    await snapshot(stage + " stores");
    await p.getByRole("link", { name: "Склади", exact: true }).click();
    await p
      .locator("#directory-live-page h2")
      .filter({ hasText: "Склади" })
      .waitFor();
    assert.equal(
      await p.locator("#directory-live-page .df-table tbody tr").count(),
      4,
    );
    await snapshot(stage + " warehouses");
  }
  assert.equal((await context.storageState()).origins.length, 0);
  await p.goto(baseURL);
  await p.waitForFunction(
    () => !!window.RetailDirectories && !!window.RetailDirectoryViews,
  );
  await snapshot("initial load");
  await directories("first navigation");
  await p.reload();
  await directories("reload");
  const cdp = await context.newCDPSession(p);
  await cdp.send("Network.clearBrowserCache");
  await p.reload({ waitUntil: "networkidle" });
  await directories("hard reload");
  await p.screenshot({ path: path.join(output, "warehouses-clean.png") });
  await p.getByRole("link", { name: "Магазини WT", exact: true }).click();
  await p
    .locator("#directory-live-page h2")
    .filter({ hasText: "Магазини WT" })
    .waitFor();
  await p.screenshot({ path: path.join(output, "stores-clean.png") });
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
      "Лист відбору 800001 від 16.09.2026",
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
  const file = path.join(output, "clean-import.xlsx");
  fs.writeFileSync(file, XLSX.write(wb, { type: "buffer", bookType: "xlsx" }));
  await p.getByRole("link", { name: "База Excel", exact: true }).click();
  async function upload() {
    const chooser = p.waitForEvent("filechooser");
    await p.locator("[data-upload]").click();
    await (await chooser).setFiles(file);
    await p.locator("[data-confirm-import]").click();
    await p.locator("#ops-fix-modal").waitFor({ state: "hidden" });
  }
  await upload();
  await upload();
  assert.equal(await p.evaluate(() => RetailState.documents().length), 1);
  await p.reload();
  await p.locator("[data-details3]").click();
  await p.locator("tbody [data-doc]").check();
  await p.locator("[data-ticket]").click();
  await p.locator('[data-open="TK-0001"]').click();
  await p.locator("[data-ap]").fill("2.5");
  await p.locator("[data-back]").click();
  await p.locator('[data-open="TK-0001"]').click();
  assert.equal(await p.locator("[data-ap]").inputValue(), "2.5");
  await p.locator("[data-complete-ok]").click();
  await p.locator("[data-completed-ticket]").waitFor();
  const ticket = await p.evaluate(
    () => RetailState.read("tc_retail_tickets_v1")[0],
  );
  assert.equal(ticket.documentKeys.length, 1);
  assert.equal(ticket.actualPallets, "2.5");
  await p.locator("[data-ticket]").check();
  await p.locator("[data-create]").click();
  await p.locator(".rb7").waitFor();
  await p.locator("[data-f=from]").selectOption("WH-001");
  await p.locator("[data-f=carrier]").selectOption("TEST-CARRIER-1");
  await p.locator("[data-f=driver]").selectOption("TEST-DRIVER-1");
  await p.locator("[data-f=vehicle]").selectOption("TEST-VEHICLE-1");
  await p.locator("[data-arr-from]").fill("12:00");
  await p.locator("[data-arr-to]").fill("13:00");
  await p.locator(".rb7 [data-pick]").click();
  await p.locator(".rb7select [data-ok]").click();
  assert.equal(await p.locator("[data-arr-from]").inputValue(), "12:00");
  await p.locator(".rb7 [data-save]").dblclick();
  await p.locator('[data-route="R-001"]').waitFor();
  const routes = await p.evaluate(() =>
    RetailState.read("tc_retail_routes_v1"),
  );
  assert.equal(routes.length, 1);
  assert.equal(routes[0].warehouseId, "WH-001");
  assert.equal(routes[0].carrierId, "TEST-CARRIER-1");
  await p.reload();
  await p.locator('[data-route="R-001"]').waitFor();
  assert.deepEqual(
    await p.evaluate(() => RetailState.read("tc_retail_routes_v1")),
    routes,
  );
  for (let i = 0; i < 2; i++) {
    const popup = context.waitForEvent("page");
    await p.locator('[data-route="R-001"] [data-ttn]').click();
    const tab = await popup;
    await tab.waitForLoadState();
    const text = await tab.locator("body").innerText();
    assert(text.includes("Тест 1"));
    assert(text.includes("800001"));
    assert(text.includes("Розумовського"));
    await tab.close();
  }
  await p.getByRole("link", { name: "Журнал ТТН", exact: true }).click();
  await p.locator("[data-reopen]").waitFor();
  const popup = context.waitForEvent("page");
  await p.locator("[data-reopen]").click();
  const tab = await popup;
  await tab.waitForLoadState();
  assert((await tab.locator("body").innerText()).includes("800001"));
  await tab.close();
  assert.equal(
    await p.evaluate(() => RetailState.read("tc_retail_ttn_journal_v1").length),
    1,
  );
  await p.reload();
  await snapshot("after operational flow reload");
  await cdp.send("Network.clearBrowserCache");
  await p.reload({ waitUntil: "networkidle" });
  await directories("after flow hard reload");
  await p.getByRole("link", { name: "Маршрути", exact: true }).click();
  await p.locator('[data-route="R-001"]').waitFor();
  await p.screenshot({ path: path.join(output, "routes-clean.png") });
  await p.setViewportSize({ width: 390, height: 844 });
  assert.equal(
    await p.evaluate(() => document.documentElement.scrollWidth),
    390,
  );
  await p.locator(".rdbar [data-new]").click();
  await p.locator(".rb7").waitFor();
  assert.equal(
    await p.evaluate(() => document.documentElement.scrollWidth),
    390,
  );
  await p.screenshot({ path: path.join(output, "route-mobile-clean.png") });
  await p.locator(".rb7 [data-x]").first().click();
  await cdp.send("Performance.enable");
  const beforeIdle = await cdp.send("Performance.getMetrics");
  await p.waitForTimeout(1100);
  const afterIdle = await cdp.send("Performance.getMetrics");
  const metric = (a, k) => a.metrics.find((x) => x.name === k).value;
  const idleScriptSeconds =
    metric(afterIdle, "ScriptDuration") - metric(beforeIdle, "ScriptDuration");
  assert(idleScriptSeconds < 0.2);
  assert.deepEqual(errors, []);
  assert.deepEqual(consoleErrors, []);
  assert.deepEqual(failed, []);
  assert(
    !requests.some((x) =>
      /directory-data-repair|store-directory-migration/.test(x),
    ),
  );
  await snapshot("final");
  fs.writeFileSync(
    path.join(output, "clean-browser-result.json"),
    JSON.stringify(
      {
        status: "PASS",
        url: baseURL,
        stores: 39,
        warehouses: 4,
        mutations: 0,
        errors,
        consoleErrors,
        failed,
        automaticDirectoryScriptRequests: 0,
        idleScriptSeconds,
        snapshots,
        checks: [
          "fresh directories",
          "references navigation",
          "reload",
          "hard reload",
          "real CDN Excel import twice",
          "picking save reopen complete",
          "documentKeys",
          "route Test1 selectors and warehouse",
          "arrival windows",
          "single route after double click",
          "TTN print and journal reopen",
          "post-flow hard reload",
          "mobile route form",
        ],
      },
      null,
      2,
    ),
  );
  console.log("PASS clean profile complete flow");
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
