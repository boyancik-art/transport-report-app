const fs = require("node:fs"),
  vm = require("node:vm"),
  path = require("node:path"),
  crypto = require("node:crypto"),
  assert = require("node:assert/strict"),
  { test } = require("node:test");
const root = path.resolve(__dirname, "../web/retail-cloudflare"),
  source = fs.readFileSync(path.join(root, "retail-directories.js"), "utf8"),
  baseline = require("./retail-directory-baseline.json");
function boot(data = {}) {
  const state = new Map(Object.entries(data)),
    writes = [];
  const window = {};
  vm.runInNewContext(source, {
    window,
    structuredClone,
    localStorage: {
      getItem: (k) => (state.has(k) ? state.get(k) : null),
      setItem: (...a) => {
        writes.push(a);
      },
      removeItem: (...a) => {
        writes.push(a);
      },
    },
  });
  return { rd: window.RetailDirectories, state, writes };
}
const hash = (x) =>
  crypto.createHash("sha256").update(JSON.stringify(x)).digest("hex");
test("RetailDirectories initializes with exact approved lists and zero startup writes", () => {
  const { rd, writes } = boot();
  assert.equal(rd.stores().length, baseline.stores.count);
  assert.equal(rd.warehouses().length, baseline.warehouses.count);
  assert.equal(hash(rd.stores()), baseline.stores.sha256);
  assert.equal(hash(rd.warehouses()), baseline.warehouses.sha256);
  assert.deepEqual(writes, []);
});
test("existing lists, order and empty lists survive initialization and repeated reads", () => {
  const { rd } = boot(),
    data = {
      tc_retail_stores_directory_v1: JSON.stringify(rd.stores()),
      tc_retail_warehouses_v1: "[]",
    };
  for (let i = 0; i < 3; i++) {
    const x = boot(data);
    assert.equal(
      JSON.stringify(x.rd.stores()),
      data.tc_retail_stores_directory_v1,
    );
    assert.equal(JSON.stringify(x.rd.warehouses()), "[]");
    assert.deepEqual(Object.fromEntries(x.state), data);
    assert.deepEqual(x.writes, []);
  }
});
test("malformed stored directory is reported, never repaired or overwritten", () => {
  const x = boot({ tc_retail_warehouses_v1: "broken" });
  assert.throws(() => x.rd.warehouses());
  assert.equal(x.state.get("tc_retail_warehouses_v1"), "broken");
  assert.deepEqual(x.writes, []);
});
test("repair and migration files remain present but have no executable references", () => {
  for (const name of [
    "directory-data-repair-v3",
    "store-directory-migration-v2",
  ]) {
    assert(fs.existsSync(path.join(root, name + ".js")));
    for (const f of fs
      .readdirSync(root)
      .filter((f) => /\.(js|html)$/.test(f) && f !== name + ".js"))
      assert(
        !fs.readFileSync(path.join(root, f), "utf8").includes(name + ".js"),
        f,
      );
  }
});
test("approved UI has one routing owner and no legacy renderer or delayed patch", () => {
  assert(!source.includes("function wh("));
  assert(!source.includes("setTimeout"));
  const router = fs.readFileSync(
    path.join(root, "directory-router-fix.js"),
    "utf8",
  );
  assert(router.includes("RetailDirectoryViews={render:run}"));
  assert(!router.includes("setTimeout"));
  assert(!router.includes("addEventListener"));
});
test("approved UI markup, styles, search and warehouse CRUD remain byte-identical", () => {
  const router = fs.readFileSync(
    path.join(root, "directory-router-fix.js"),
    "utf8",
  );
  const content = router.slice(
    router.indexOf("function css()"),
    router.indexOf("function run()"),
  );
  assert.equal(
    crypto.createHash("sha256").update(content).digest("hex"),
    baseline.approvedUiSha256,
  );
});
