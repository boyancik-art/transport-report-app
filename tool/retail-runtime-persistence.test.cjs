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

function makeContext(storage) {
  const feedback = { hidden: true, dataset: {}, append() {}, setAttribute() {} };
  const body = { append() {} };
  const document = {
    body,
    getElementById(id) { return id === 'retail-feedback' ? feedback : null; },
    createElement() { return { dataset: {}, setAttribute() {}, append() {}, remove() {} }; },
  };
  const context = {
    console,
    localStorage: storage,
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
  };
  context.window = context;
  vm.createContext(context);
  vm.runInContext(source('retail-state.js'), context, { filename: 'retail-state.js' });
  vm.runInContext(source('picking-group-fix.js'), context, { filename: 'picking-group-fix.js' });
  return context;
}

const docs = [
  { id: '1001', key: 'doc-a', date: '2026-09-16', senderWarehouse: 'Чайки', store: 'WT Київ 1', storeAddress: 'Київ, вул. Тестова, 1', receiverWarehouse: '', workflowStatus: 'imported', status: 'Імпортовано' },
  { id: '1002', key: 'doc-b', date: '2026-09-16', senderWarehouse: 'Чайки', store: 'WT Київ 1', storeAddress: 'Київ, вул. Тестова, 1', receiverWarehouse: '', workflowStatus: 'imported', status: 'Імпортовано' },
  { id: '1003', key: 'doc-c', date: '2026-09-16', senderWarehouse: 'Чайки', store: 'WT Київ 2', storeAddress: 'Київ, вул. Інша, 2', receiverWarehouse: '', workflowStatus: 'imported', status: 'Імпортовано' },
];

const storage = makeStorage({
  tc_retail_docs_v3: JSON.stringify(docs),
  tc_retail_tickets_v1: JSON.stringify([]),
});

let app = makeContext(storage);
app.RetailPicking.transfer(['doc-a', 'doc-b', 'doc-c']);

let persistedDocs = JSON.parse(storage.getItem('tc_retail_docs_v3'));
let persistedTickets = JSON.parse(storage.getItem('tc_retail_tickets_v1'));
assert.equal(persistedTickets.length, 2, 'documents for two stores must create two picking tickets');
assert.deepEqual(persistedTickets.map(t => t.documentKeys), [['doc-a', 'doc-b'], ['doc-c']], 'ticket membership must use stable document keys');
assert.ok(persistedDocs.every(d => d.workflowStatus === 'picking'), 'transferred documents must persist picking workflow state');
assert.ok(persistedDocs.every(d => d.status === 'На комплектації'), 'transferred documents must persist visible picking status');
assert.equal(app.location.hash, '#picking-tickets', 'transfer must navigate to picking tickets');

// Simulate a hard reload: rebuild the runtime over the same browser storage.
app = makeContext(storage);
persistedTickets = app.RetailState.read('tc_retail_tickets_v1');
persistedDocs = app.RetailState.documents();
assert.equal(persistedTickets.length, 2, 'tickets must survive runtime reload');
assert.equal(persistedDocs.length, 3, 'documents must survive runtime reload');
assert.deepEqual(app.RetailState.docsFor(persistedTickets[0], persistedDocs).map(d => d.key), ['doc-a', 'doc-b'], 'ticket/document linkage must survive reload');

// Repeating transfer must be idempotent and must not duplicate tickets.
app.RetailPicking.transfer(['doc-a', 'doc-b', 'doc-c']);
assert.equal(JSON.parse(storage.getItem('tc_retail_tickets_v1')).length, 2, 'repeat transfer must not duplicate existing tickets');

console.log('Retail runtime persistence acceptance: PASS');
