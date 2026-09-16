const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const root = path.join(__dirname, '../web/retail-cloudflare');
const source = (name) => fs.readFileSync(path.join(root, name), 'utf8');

function makeStorage(seed = {}) {
  const data = new Map(Object.entries(seed));
  return {
    getItem: (key) => data.has(key) ? data.get(key) : null,
    setItem: (key, value) => data.set(key, String(value)),
    removeItem: (key) => data.delete(key),
    dump: () => Object.fromEntries(data),
  };
}

function makeContext(storage, sessionStorage = makeStorage()) {
  const feedback = { hidden: true, dataset: {}, append() {}, setAttribute() {} };
  const body = { append() {} };
  const document = {
    body,
    getElementById(id) { return id === 'retail-feedback' ? feedback : null; },
    createElement() { return { dataset: {}, style: {}, setAttribute() {}, append() {}, appendChild() {}, remove() {}, querySelector() { return null; }, querySelectorAll() { return []; } }; },
  };
  const context = {
    console,
    localStorage: storage,
    sessionStorage,
    structuredClone,
    document,
    location: { hash: '' },
    setTimeout: () => 1,
    clearTimeout: () => {},
    Intl,
    Date,
    Promise,
    Error,
    Map,
    Set,
    alert() {},
  };
  context.window = context;
  context.window.addEventListener = () => {};
  context.window.dispatchEvent = () => {};
  vm.createContext(context);
  vm.runInContext(source('retail-state.js'), context, { filename: 'retail-state.js' });
  vm.runInContext(source('picking-group-fix.js'), context, { filename: 'picking-group-fix.js' });
  vm.runInContext(source('picking-enhancements.js'), context, { filename: 'picking-enhancements.js' });
  return context;
}

const docs = [
  { id: '1001', key: 'doc-a', date: '2026-09-16', senderWarehouse: 'Чайки', store: 'WT Київ 1', storeAddress: 'Київ, вул. Тестова, 1', receiverWarehouse: '', workflowStatus: 'imported', status: 'Імпортовано', lines: [{ sku: 'SKU-A', qty: 10 }] },
  { id: '1002', key: 'doc-b', date: '2026-09-16', senderWarehouse: 'Чайки', store: 'WT Київ 1', storeAddress: 'Київ, вул. Тестова, 1', receiverWarehouse: '', workflowStatus: 'imported', status: 'Імпортовано', lines: [{ sku: 'SKU-B', qty: 5 }] },
  { id: '1003', key: 'doc-c', date: '2026-09-16', senderWarehouse: 'Чайки', store: 'WT Київ 2', storeAddress: 'Київ, вул. Інша, 2', receiverWarehouse: '', workflowStatus: 'imported', status: 'Імпортовано', lines: [{ sku: 'SKU-C', qty: 3 }] },
];

const storage = makeStorage({
  tc_retail_docs_v3: JSON.stringify(docs),
  tc_retail_tickets_v1: JSON.stringify([]),
  tc_retail_routes_v1: JSON.stringify([]),
});
const session = makeStorage();

let app = makeContext(storage, session);
app.RetailPicking.transfer(['doc-a', 'doc-b', 'doc-c']);

let persistedDocs = JSON.parse(storage.getItem('tc_retail_docs_v3'));
let persistedTickets = JSON.parse(storage.getItem('tc_retail_tickets_v1'));
assert.equal(persistedTickets.length, 2, 'documents for two stores must create two picking tickets');
assert.deepEqual(persistedTickets.map(t => t.documentKeys), [['doc-a', 'doc-b'], ['doc-c']], 'ticket membership must use stable document keys');
assert.ok(persistedDocs.every(d => d.workflowStatus === 'picking'), 'transferred documents must persist picking workflow state');
assert.ok(persistedDocs.every(d => d.status === 'На комплектації'), 'transferred documents must persist visible picking status');
assert.equal(app.location.hash, '#picking-tickets', 'transfer must navigate to picking tickets');

// Simulate a hard reload: rebuild the runtime over the same browser storage.
app = makeContext(storage, session);
persistedTickets = app.RetailState.read('tc_retail_tickets_v1');
persistedDocs = app.RetailState.documents();
assert.equal(persistedTickets.length, 2, 'tickets must survive runtime reload');
assert.equal(persistedDocs.length, 3, 'documents must survive runtime reload');
assert.deepEqual(app.RetailState.docsFor(persistedTickets[0], persistedDocs).map(d => d.key), ['doc-a', 'doc-b'], 'ticket/document linkage must survive reload');

// Repeating transfer must be idempotent and must not duplicate tickets.
app.RetailPicking.transfer(['doc-a', 'doc-b', 'doc-c']);
assert.equal(JSON.parse(storage.getItem('tc_retail_tickets_v1')).length, 2, 'repeat transfer must not duplicate existing tickets');

// Complete one ticket with actual pallets and verify the completion transaction survives reload.
let first = app.RetailState.read('tc_retail_tickets_v1')[0];
first.actualPallets = '2.5';
app.RetailPickingEnhancements.finish(first, 'unchanged');
persistedTickets = JSON.parse(storage.getItem('tc_retail_tickets_v1'));
persistedDocs = JSON.parse(storage.getItem('tc_retail_docs_v3'));
first = persistedTickets.find(t => t.number === first.number);
assert.equal(first.actualPallets, '2.5', 'actual pallets must persist on completion');
assert.equal(first.pickingStatus, 'completed', 'ticket must persist completed picking status');
assert.equal(first.status, 'Скомплектовано', 'ticket must persist visible completed status');
assert.equal(first.completionResult, 'unchanged', 'completion result must persist');
assert.equal(session.getItem('tc_retail_completed_focus'), first.number, 'completed ticket focus must be retained for routing handoff');
for (const key of first.documentKeys) {
  const d = persistedDocs.find(x => x.key === key);
  assert.equal(d.workflowStatus, 'picked', 'completed ticket documents must persist picked workflow state');
  assert.equal(d.status, 'Скомплектовано', 'completed ticket documents must persist visible completed status');
}

app = makeContext(storage, session);
first = app.RetailState.read('tc_retail_tickets_v1').find(t => t.pickingStatus === 'completed');
assert.ok(first, 'completed ticket must survive hard reload');
assert.equal(first.actualPallets, '2.5', 'actual pallets must survive hard reload');
assert.deepEqual(app.RetailState.docsFor(first).map(d => d.workflowStatus), ['picked', 'picked'], 'picked document linkage must survive hard reload');

// Completion is forbidden once a ticket is already assigned to a route.
const second = app.RetailState.read('tc_retail_tickets_v1').find(t => t.number !== first.number);
second.actualPallets = '1';
app.RetailState.write('tc_retail_routes_v1', [{ number: 'RT-0001', ticketIds: [second.number] }]);
assert.throws(() => app.RetailPickingEnhancements.finish(second, 'unchanged'), /Талон уже у маршруті/, 'routed ticket must not be completed again');

console.log('Retail runtime persistence acceptance: PASS');
