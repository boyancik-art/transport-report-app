const {
  chromium,
  launchOptions,
  output,
  baseURL,
  xlsxPath,
} = require("./retail-preview-browser-runtime.cjs");
const fs = require("node:fs"),
  path = require("node:path"),
  assert = require("node:assert/strict"),
  crypto = require("node:crypto"),
  XLSX = require(xlsxPath),
  baseline = require("./retail-directory-baseline.json");
const hash = (x) =>
  crypto.createHash("sha256").update(JSON.stringify(x)).digest("hex");
(async () => {
  const browser = await chromium.launch(launchOptions),
    context = await browser.newContext({
      viewport: { width: 1536, height: 1024 },
    }),
    p = await context.newPage(),
    errors = [],
    consoleErrors = [],
    failed = [],
    checks = [];
  p.on("pageerror", (e) => errors.push(e.message));
  p.on("console", (m) => {
    if (m.type() === "error") consoleErrors.push(m.text());
  });
  p.on("response", (r) => {
    if (r.status() >= 400) failed.push([r.url(), r.status()]);
  });
  p.on("dialog", (d) => d.dismiss());
  async function directoryCheck(stage) {
    for (const [view, count] of [
      ["stores-page", 39],
      ["warehouses-page", 4],
    ]) {
      await p.goto(baseURL + "/#" + view);
      await p
        .locator("#directory-live-page .df-table tbody tr")
        .first()
        .waitFor();
      assert.equal(
        await p.locator("#directory-live-page .df-table tbody tr").count(),
        count,
      );
    }
    const data = await p.evaluate(() => ({
      s: RetailDirectories.stores(),
      w: RetailDirectories.warehouses(),
      stored: [
        localStorage.getItem("tc_retail_stores_directory_v1"),
        localStorage.getItem("tc_retail_warehouses_v1"),
      ],
    }));
    assert.equal(hash(data.s), baseline.stores.sha256);
    assert.equal(hash(data.w), baseline.warehouses.sha256);
    assert.deepEqual(data.stored, [null, null]);
    checks.push(stage);
  }
  await directoryCheck(
    "fresh profile 39 stores + 4 warehouses, no directory writes",
  );
  await p.reload();
  const cdp = await context.newCDPSession(p);
  await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
  await p.reload();
  await directoryCheck("reload + hard reload directories");
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
  const file = path.join(output, "ui-import.xlsx");
  fs.writeFileSync(file, XLSX.write(wb, { type: "buffer", bookType: "xlsx" }));
  await p.goto(baseURL + "/#base-excel");
  async function upload() {
    const chooser = p.waitForEvent("filechooser");
    await p.locator("[data-action=upload]").click();
    await (await chooser).setFiles(file);
    await p.locator("[data-confirm-import]").click();
    await p.locator("#ops-fix-modal").waitFor({ state: "hidden" });
  }
  await upload();
  await upload();
  let ds = await p.evaluate(() => RetailState.documents());
  assert.equal(ds.length, 1);
  assert.equal(ds[0].calc, 1);
  assert(ds[0].loadedAt);
  checks.push(
    "real Excel import twice: one document, mathematical pallets, timestamp",
  );
  await p.reload();
  await p.locator("[data-select]").check();
  await p.locator("[data-action=transfer]").click();
  await p.goto(baseURL + "/#picking-tickets");
  await p.locator("[data-focus]").first().click();
  await p.locator("[data-ap]").fill("2.5");
  await p.locator("[data-action=save-ticket]").click();
  await p.reload();
  await p.locator("[data-focus]").first().click();
  assert.equal(await p.locator("[data-ap]").inputValue(), "2.5");
  await p.locator("[data-result=unchanged]").click();
  await p.locator("[data-action=save-ticket]").click();
  await p.goto(baseURL + "/#completed");
  await p.locator("[data-select]").check();
  assert(
    (await p.locator("[data-action=plan-selected]").innerText()).includes(
      "110",
    ),
  );
  await p.locator("[data-action=plan-selected]").click();
  await p.locator("[data-f=from]").selectOption("WH-001");
  for (const [k, v] of [
    ["carrier", "Audit Carrier"],
    ["driver", "Audit Driver"],
    ["vehicle", "AA 1234 XX"],
  ]) {
    await p.locator("[data-f=" + k + "]").selectOption("__manual");
    await p
      .locator("[data-extra=manual" + k[0].toUpperCase() + k.slice(1) + "]")
      .fill(v);
  }
  await p.locator("[data-extra=parking]").fill("Київ");
  await p.locator("[data-action=save-draft]").click();
  await p.reload();
  assert.equal(
    await p.locator("[data-extra=manualCarrier]").inputValue(),
    "Audit Carrier",
  );
  assert.equal(await p.locator("[data-c]:checked").count(), 1);
  await p.locator("[data-save]").click();
  await p.waitForURL(/#route\//);
  let routes = await p.evaluate(() => RetailState.read("tc_retail_routes_v1"));
  assert.equal(routes.length, 1);
  assert.equal(routes[0].carrier, "Audit Carrier");
  checks.push(
    "picking save/reopen/complete; full weight 110 kg; manual transport; draft reload; route creation",
  );
  await p.locator("[data-window][data-field=from]").fill("12:00");
  await p.locator("[data-window][data-field=to]").fill("13:00");
  await p.locator("[data-action=save-windows]").click();
  await p.locator("[data-action=register-params]").click();
  await p.locator("[data-seal]").fill("AUDIT-001");
  await p.locator(".ttn-reg-modal [data-save]").click();
  for (let i = 0; i < 2; i++) {
    const popup = context.waitForEvent("page");
    await p.locator("[data-action=generate-only]").click();
    const tab = await popup;
    await tab.waitForLoadState();
    assert.equal(await tab.locator(".sheet.ttn").count(), 3);
    assert.equal(await tab.locator(".sheet.reg").count(), 0);
    assert((await tab.locator("body").innerText()).includes("Imported item"));
    await tab.close();
  }
  assert.equal(
    await p.evaluate(() => RetailState.read("tc_retail_ttn_journal_v1").length),
    1,
  );
  checks.push(
    "arrival windows; existing seals guard; generate without print twice; three copies; no loading-register print; stable TTN identity",
  );
  await p.goto(baseURL + "/#ttn-journal");
  await p.locator("[data-action=journal-edit]").click();
  await p.locator("[data-edit=driver]").fill("Updated Driver");
  await p.locator("[data-save-meta]").click();
  let journal = await p.evaluate(() =>
    RetailState.read("tc_retail_ttn_journal_v1"),
  );
  assert.equal(journal.length, 1);
  assert.equal(journal[0].driver, "Updated Driver");
  let pop = context.waitForEvent("page");
  await p.locator("[data-action=journal-preview]").click();
  let tab = await pop;
  await tab.waitForLoadState();
  assert((await tab.locator("body").innerText()).includes("Updated Driver"));
  await tab.close();
  await p.goto(baseURL + "/#routes-page");
  assert.equal(await p.locator("[data-c]").count(), 0);
  checks.push("edit transport and preview same TTN; routed tickets excluded");
  await p.waitForTimeout(5100);
  for (const view of [
    "home",
    "base-excel",
    "picking-tickets",
    "completed",
    "routes-page",
    "route/R-001",
    "route-register",
    "ttn-journal",
  ]) {
    await p.goto(baseURL + "/#" + view);
    if (["picking-tickets", "completed"].includes(view))
      await p.locator("[data-focus]").first().click();
    await p.screenshot({
      path: path.join(output, "ui-" + view.replace("/", "-") + ".png"),
    });
    assert.equal(
      await p.evaluate(() => document.documentElement.scrollWidth),
      1536,
    );
  }
  await p.setViewportSize({ width: 390, height: 844 });
  for (const view of [
    "home",
    "base-excel",
    "picking-tickets",
    "completed",
    "routes-page",
    "route/R-001",
    "route-register",
    "ttn-journal",
  ]) {
    await p.goto(baseURL + "/#" + view);
    assert.equal(
      await p.evaluate(() => document.documentElement.scrollWidth),
      390,
      "mobile " + view,
    );
  }
  await p.setViewportSize({ width: 1536, height: 1024 });
  await directoryCheck("post-flow directories unchanged");
  assert.deepEqual(errors, []);
  assert.deepEqual(consoleErrors, []);
  assert.deepEqual(failed, []);
  checks.push(
    "all 8 screens desktop + mobile without page overflow; no page errors",
  );
  fs.writeFileSync(
    path.join(output, "ui-regression.json"),
    JSON.stringify(
      { status: "PASS", url: baseURL, checks, errors, consoleErrors, failed },
      null,
      2,
    ),
  );
  console.log(JSON.stringify({ status: "PASS", output, checks }));
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
