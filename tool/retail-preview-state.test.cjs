const test = require("node:test"),
  assert = require("node:assert/strict"),
  vm = require("node:vm"),
  fs = require("node:fs"),
  path = require("node:path");
const source = fs.readFileSync(
  path.join(__dirname, "../web/retail-cloudflare/retail-state.js"),
  "utf8",
);
function env(seed = {}) {
  const data = new Map(Object.entries(seed)),
    elements = new Map();
  const document = {
    getElementById: (id) => elements.get(id),
    body: { append: (b) => elements.set(b.id, b) },
    createElement: () => ({
      dataset: {},
      setAttribute() {},
      append() {},
      remove() {},
    }),
  };
  const storage = {
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => data.set(k, v),
    removeItem: (k) => data.delete(k),
  };
  const context = {
    window: {},
    document,
    localStorage: storage,
    structuredClone,
    Intl,
    Date,
    setTimeout: () => 1,
    clearTimeout() {},
    Error,
    Set,
    Map,
  };
  vm.runInNewContext(source, context);
  return { state: context.window.RetailState, storage, data };
}
test("transaction rolls back the first write if the second store fails", () => {
  const e = env({ tc_retail_docs_v3: "[]", tc_retail_routes_v1: "[]" }),
    native = e.storage.setItem;
  e.storage.setItem = (k, v) => {
    if (k === "tc_retail_routes_v1") throw Error("quota");
    native(k, v);
  };
  assert.throws(() =>
    e.state.commit({
      tc_retail_docs_v3: [{ id: 1 }],
      tc_retail_routes_v1: [{ number: "R-001" }],
    }),
  );
  assert.equal(e.data.get("tc_retail_docs_v3"), "[]");
  assert.equal(e.data.get("tc_retail_routes_v1"), "[]");
});
test("malformed data is preserved and cannot be overwritten by fallback", () => {
  const e = env({ tc_retail_routes_v1: "broken" });
  assert.equal(e.state.read("tc_retail_routes_v1").length, 0);
  assert.throws(() => e.state.write("tc_retail_routes_v1", []));
  assert.equal(e.data.get("tc_retail_routes_v1"), "broken");
});
test("protected directories are not writable through operational persistence", () => {
  const e = env({ tc_retail_stores_directory_v1: "[]" });
  assert.throws(() =>
    e.state.write("tc_retail_stores_directory_v1", [{ name: "bad" }]),
  );
  assert.equal(e.data.get("tc_retail_stores_directory_v1"), "[]");
});
test("document keys resolve duplicate IDs, ambiguous legacy IDs fail explicitly", () => {
  const e = env(),
    docs = [
      { id: "1", key: "one" },
      { id: "1", key: "two" },
    ];
  assert.equal(e.state.docsFor({ documentKeys: ["two"] }, docs)[0].key, "two");
  assert.throws(() => e.state.docsFor({ documentIds: ["1"] }, docs));
});
test("legacy documents are read without migration and v3 remains authoritative", () => {
  const e = env({ tc_retail_docs_v2: '[{"id":2}]' });
  assert.equal(e.state.documents()[0].id, 2);
  assert.equal(e.data.has("tc_retail_docs_v3"), false);
  e.storage.setItem("tc_retail_docs_v3", "[]");
  assert.equal(e.state.documents().length, 0);
});
test("IDs advance beyond the highest number after deletion", () => {
  const e = env();
  assert.equal(
    e.state.nextNumber(
      [{ number: "R-009" }, { number: "R-002" }],
      "number",
      "R-",
      3,
    ),
    "R-010",
  );
});
