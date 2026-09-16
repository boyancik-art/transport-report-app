const {
  chromium,
  launchOptions,
  output,
  baseURL,
  xlsxPath,
} = require("./retail-preview-browser-runtime.cjs");
const path = require("node:path");
const fs = require("fs"),
  assert = require("assert");
(async () => {
  const browser = await chromium.launch(launchOptions);
  const context = await browser.newContext({
    viewport: { width: 1536, height: 1024 },
  });
  const page = await context.newPage(),
    errors = [],
    dialogs = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("dialog", async (d) => {
    dialogs.push(d.message());
    await d.dismiss();
  });
  await context.route("**/directory-data-repair-v3.js*", (r) =>
    r.fulfill({
      body: "/* protected migration blocked during audit */",
      contentType: "text/javascript",
    }),
  );
  await context.route("**/store-directory-migration-v2.js*", (r) =>
    r.fulfill({
      body: "/* protected migration blocked during audit */",
      contentType: "text/javascript",
    }),
  );
  await context.route("**/xlsx.full.min.js", (r) =>
    r.fulfill({ path: xlsxPath, contentType: "text/javascript" }),
  );
  const fixture = JSON.parse(
    fs.readFileSync(path.join(output, "fixtures.json")),
  );
  await context.addInitScript((f) => {
    if (!sessionStorage.getItem("audit-fixture")) {
      for (const [k, v] of Object.entries(f))
        localStorage.setItem(k, typeof v === "string" ? v : JSON.stringify(v));
      sessionStorage.setItem("audit-fixture", "1");
    }
    window.print = () => {};
    window.audit = { timers: 0, mutations: 0 };
    const old = setTimeout;
    window.setTimeout = (...args) => {
      audit.timers++;
      return old(...args);
    };
    new MutationObserver((x) => (audit.mutations += x.length)).observe(
      document,
      { childList: true, subtree: true },
    );
  }, fixture);
  console.log("startup");
  await page.goto(baseURL + "/#routes-page");
  await page.waitForTimeout(400);
  await page.locator(".rdbar [data-new]").click();
  await page.locator(".rb7").waitFor();
  await page.locator(".rb7 [data-save]").click();
  assert(dialogs.pop().includes("Заповніть"));
  await page.locator(".rb7 [data-f=from]").selectOption("WH-001");
  await page.locator(".rb7 [data-f=carrier]").selectOption("TEST-CARRIER-1");
  await page.locator(".rb7 [data-f=driver]").selectOption("TEST-DRIVER-1");
  await page.locator(".rb7 [data-f=vehicle]").selectOption("TEST-VEHICLE-1");
  await page.locator(".rb7 [data-pick]").click();
  await page.locator(".rb7select [data-c]").check();
  await page.locator(".rb7select [data-ok]").click();
  await page.locator("[data-arr-from]").fill("12:00");
  await page.locator("[data-arr-to]").fill("13:00");
  await page.locator(".rb7 [data-pick]").click();
  await page.locator(".rb7select [data-ok]").click();
  assert.equal(await page.locator("[data-arr-from]").inputValue(), "12:00");
  await page.locator(".rb7 [data-save]").evaluate((b) => {
    b.click();
    b.click();
  });
  await page.locator(".rb7").waitFor({ state: "detached" });
  console.log("saved");
  const routes = () =>
    page.evaluate(() =>
      JSON.parse(localStorage.getItem("tc_retail_routes_v1")),
    );
  let r = await routes();
  assert.equal(r.length, 1);
  assert.equal(r[0].carrierId, "TEST-CARRIER-1");
  assert.equal(r[0].carrier, "Тест 1");
  assert.equal(r[0].warehouseId, "WH-001");
  assert(r[0].warehouse.startsWith("03035"));
  assert.equal(r[0].arrivalWindows["TK-0001"].from, "12:00");
  await page.locator(".rdbar [data-new]").click();
  await page.locator(".rb7").waitFor();
  await page.locator(".rb7 [data-x]").first().click();
  await page.reload();
  await page.locator('[data-route="R-001"]').waitFor();
  assert.deepEqual(await routes(), r);
  const cdp = await context.newCDPSession(page);
  await cdp.send("Network.clearBrowserCache");
  await page.reload({ waitUntil: "networkidle" });
  assert.deepEqual(await routes(), r);
  console.log("ttn");
  for (let i = 0; i < 2; i++) {
    const popup = context.waitForEvent("page");
    await page.locator('[data-route="R-001"] [data-ttn]').click();
    const tab = await popup;
    await tab.waitForLoadState();
    assert((await tab.locator("body").innerText()).includes("Тест 1"));
    await tab.close();
  }
  const journal = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("tc_retail_ttn_journal_v1")),
  );
  assert.equal(journal.length, 1);
  assert.equal(journal[0].carrierId, "TEST-CARRIER-1");
  assert.notEqual(journal[0].status, "PDF сформовано");
  await page.getByRole("link", { name: "Журнал ТТН", exact: true }).click();
  await page.locator(".iw-summary").waitFor();
  assert(
    (await page.locator("#ops-documents").innerText()).includes(
      "TS_TTN_000001",
    ),
  );
  await page.getByRole("link", { name: "База Excel", exact: true }).click();
  await page.locator("[data-details3]").click();
  await page.waitForTimeout(200);
  let a = await page.evaluate(() => ({ ...audit }));
  await page.waitForTimeout(1000);
  let z = await page.evaluate(() => ({ ...audit }));
  const idle = {
    timers: z.timers - a.timers,
    mutations: z.mutations - a.mutations,
  };
  assert(idle.timers < 15, JSON.stringify(idle));
  await page.screenshot({ path: path.join(output, "fixed-desktop.png") });
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(
    await page.evaluate(() => document.documentElement.scrollWidth),
    390,
  );
  await page.screenshot({ path: path.join(output, "fixed-mobile.png") });
  const protectedAfter = await page.evaluate(() => [
    localStorage.getItem("tc_retail_warehouses_v1"),
    localStorage.getItem("tc_retail_stores_directory_v1"),
  ]);
  assert.equal(
    protectedAfter[0],
    JSON.stringify(fixture.tc_retail_warehouses_v1),
  );
  assert.equal(
    protectedAfter[1],
    JSON.stringify(fixture.tc_retail_stores_directory_v1),
  );
  const report = {
    status: "PASS",
    errors,
    idle,
    route: r[0].number,
    ttn: journal[0].number,
    protectedStorageUnchanged: true,
  };
  assert(
    errors.every((message) => message === "Unexpected token 'function'"),
    JSON.stringify(errors),
  );
  fs.writeFileSync(
    path.join(output, "fixed-browser.json"),
    JSON.stringify(report, null, 2),
  );
  console.log(report);
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
