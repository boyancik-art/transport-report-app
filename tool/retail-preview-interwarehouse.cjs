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
  const b = await chromium.launch(launchOptions),
    c = await b.newContext({ viewport: { width: 390, height: 844 } }),
    p = await c.newPage(),
    errors = [];
  p.on("pageerror", (e) => errors.push(e.message));
  p.on("dialog", (d) => (d.type() === "confirm" ? d.accept() : d.dismiss()));
  const f = JSON.parse(fs.readFileSync(path.join(output, "fixtures.json")));
  await c.addInitScript((f) => {
    if (!sessionStorage.getItem("fixture")) {
      Object.entries(f).forEach(([k, v]) =>
        localStorage.setItem(k, typeof v === "string" ? v : JSON.stringify(v)),
      );
      sessionStorage.setItem("fixture", "1");
    }
    window.print = () => {};
  }, f);
  await p.goto(baseURL + "/#routes-page");
  await p.locator("#iw-addon [data-new]").evaluate((b) => {
    b.click();
    b.click();
  });
  await p.locator(".iw-card[data-id]").waitFor();
  assert.equal(await p.locator(".iw-card[data-id]").count(), 1);
  assert.equal(await p.locator(".rb7").count(), 0);
  const card = p.locator(".iw-card[data-id]");
  await card.locator("[data-f=from]").fill("Audit A");
  await card.locator("[data-f=to]").fill("Audit B");
  await card.locator("[data-f=carrier]").selectOption({ label: "Тест 1" });
  await card.locator("[data-f=driver]").selectOption({ label: "Тест 1" });
  await card.locator("[data-f=vehicle]").selectOption({ label: "Тест 1" });
  await card.locator("[data-pick]").click();
  await p.locator("#iw-modal input[type=checkbox]").check();
  await p.locator("#iw-modal [data-save]").click();
  await p.reload();
  await p.locator(".iw-card[data-id]").waitFor();
  assert.equal(await card.locator("[data-f=from]").inputValue(), "Audit A");
  for (let i = 0; i < 2; i++) {
    const popup = c.waitForEvent("page");
    await card.locator("[data-ttn]").click();
    const t = await popup;
    await t.waitForLoadState();
    assert((await t.locator("body").innerText()).includes("Audit A"));
    await t.close();
  }
  assert.equal(
    await p.evaluate(() => RetailState.read("tc_retail_ttn_journal_v1").length),
    1,
  );
  await card.locator("[data-iw-delete]").click();
  assert.equal(await card.count(), 1);
  await p.locator(".ops-page-title [data-new]").click();
  assert.equal(await card.count(), 2);
  await card.first().locator("[data-iw-delete]").click();
  assert.equal(await card.count(), 1);
  await p.locator(".ops-page-title [data-new]").click();
  assert.equal(
    await p.evaluate(
      () => RetailState.read("tc_retail_interwarehouse_v1")[0].id,
    ),
    "IW-0002",
  );
  assert.equal(
    await p.evaluate(() => document.documentElement.scrollWidth),
    390,
  );
  await p.getByRole("link", { name: "База Excel", exact: true }).click();
  await c.route("**/xlsx.full.min.js", (r) => r.abort());
  await p.locator("[data-upload]").click();
  await p.waitForFunction(() =>
    document
      .querySelector("#retail-feedback")
      ?.textContent.includes("Excel не завантажився"),
  );
  assert(
    (await p.locator("#retail-feedback").innerText()).includes(
      "Excel не завантажився",
    ),
  );
  assert(await p.locator("[data-upload]").isEnabled());
  assert.deepEqual(errors, []);
  fs.writeFileSync(
    path.join(output, "interwarehouse-tests.json"),
    JSON.stringify(
      {
        status: "PASS",
        checks: [
          "mobile create one interwarehouse flight per double click",
          "edit and reload",
          "cargo selection",
          "TTN repeat idempotent",
          "linked TTN deletion blocked",
          "explicit draft deletion",
          "Excel unavailable error and retry button",
          "mobile width 390",
        ],
        errors,
      },
      null,
      2,
    ),
  );
  console.log("PASS interwarehouse and network failure");
  await b.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
