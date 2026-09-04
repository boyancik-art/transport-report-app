export type JsonRecord = Record<string, unknown>;

const HEADERS = {
  group: "ID групи (Операції)", sale: "Код продажі", date: "Дата документу",
  route: "ID Доставки", operation: "Код операції", warehouse: "Склад відправника",
  expeditor: "Експедитор", customerId: "ID Контрагента", customer: "Контрагент",
  addressId: "ID Адреса доставки", address: "Адреса доставки", employee: "EmployeeID",
  business: "Бізнес одиниця", bottles: "К-ть пляшок", places: "Кількість місць",
  weight: "Вага", pallets: "Мат пал.", amount: "Сума замовлення",
} as const;

export const text = (value: unknown) => value == null ? "" : String(value).trim();
const idText = (value: unknown, name: string) => {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${name} must be a non-empty text ID`);
  return value.trim();
};
const optionalIdText = (value: unknown, name: string) => value == null || value === "" ? null : idText(value, name);
const numberValue = (value: unknown, name: string) => {
  if (value == null || value === "") return 0;
  const parsed = typeof value === "number" ? value : Number(String(value).replace(/\s/g, "").replace(",", "."));
  if (!Number.isFinite(parsed)) throw new Error(`${name} must be numeric`);
  return parsed;
};
const escaped = (value: string) => encodeURIComponent(value);
export const financialKey = (namespace: string, firmId: string, saleId: string) =>
  `cube-invoice-v2|${escaped(namespace)}|${escaped(firmId)}|${escaped(saleId)}`;
const lookupKey = (group: unknown, sale: unknown) => `${text(group)}|${text(sale)}`;

export type SafeSyncBuild = {
  run: JsonRecord;
  documents: JsonRecord[];
  baseLinks: JsonRecord[];
  movements: JsonRecord[];
  businessLinks: JsonRecord[];
  report: JsonRecord;
};

export function buildSafeSync(payload: any, sourceHash: string, fileName = "source-identity.json"): SafeSyncBuild {
  const exportReport = payload?.report ?? {};
  const projection = payload?.sourceProjection;
  const facts: any[] = Array.isArray(payload?.financialFacts) ? payload.financialFacts : [];
  if (exportReport.status !== "exported_for_review" || exportReport.refreshConfirmed !== true || exportReport.exportCompleted !== true) {
    throw new Error("Source Identity export is not a completed refreshed review export");
  }
  if (exportReport.sourceJsonValidated !== undefined && exportReport.sourceJsonValidated !== true)
    throw new Error("Source Identity JSON was not validated by the exporter");
  if (exportReport.readOnlySqlVerified !== undefined && exportReport.readOnlySqlVerified !== true)
    throw new Error("Source Identity SQL was not verified read-only");
  if (!projection || !Array.isArray(projection.headers) || !Array.isArray(projection.rows)) throw new Error("sourceProjection missing");
  if (!facts.length) throw new Error("financialFacts missing");
  if (exportReport.financialFacts !== undefined && Number(exportReport.financialFacts) !== facts.length)
    throw new Error("Source Identity fact count does not match its export report");
  if (exportReport.projectionRowsInPeriod !== undefined && Number(exportReport.projectionRowsInPeriod) !== projection.rows.length)
    throw new Error("Base projection row count does not match its export report");

  const namespace = text(exportReport.sourceNamespace) || "ts-plus-cube";
  if (namespace !== "ts-plus-cube") throw new Error("Unexpected source namespace");
  const headers = projection.headers.map(text);
  const columns = new Map<string, number>();
  headers.forEach((header: string, index: number) => { if (header && !columns.has(header)) columns.set(header, index); });
  for (const header of Object.values(HEADERS)) if (!columns.has(header)) throw new Error(`sourceProjection missing column: ${header}`);
  const at = (values: unknown[], header: string) => values[columns.get(header)!];

  const byLookup = new Map<string, any>();
  const lookupAmbiguities = new Set<string>();
  const sourceKeys = new Set<string>();
  let collisionGroups = 0;
  for (const fact of facts) {
    const firmId = idText(fact?.sourceFirmId, "sourceFirmId");
    const saleId = idText(fact?.sourceSaleId, "sourceSaleId");
    const key = financialKey(namespace, firmId, saleId);
    if (sourceKeys.has(key)) collisionGroups++;
    sourceKeys.add(key);
    const lookup = lookupKey(fact?.group, fact?.sale);
    if (!text(fact?.group) || !text(fact?.sale)) throw new Error("Source Identity lookup fields are missing");
    if (byLookup.has(lookup)) lookupAmbiguities.add(lookup); else byLookup.set(lookup, fact);
  }
  if (Number(exportReport.financialCollisionGroups ?? 0) !== 0 || collisionGroups !== 0) throw new Error("Financial identity collision detected");

  const documentsByKey = new Map<string, JsonRecord>();
  const sourceFactByKey = new Map<string, any>();
  const baseLinks: JsonRecord[] = [];
  const unmatched: JsonRecord[] = [];
  const ambiguous: JsonRecord[] = [];
  for (let index = 0; index < projection.rows.length; index++) {
    const row = projection.rows[index];
    const values = Array.isArray(row?.values) ? row.values : [];
    const group = text(at(values, HEADERS.group));
    const sale = text(at(values, HEADERS.sale));
    const lookup = lookupKey(group, sale);
    const baseRowNo = Number(row?.sourceRow ?? index + 2);
    if (lookupAmbiguities.has(lookup)) { ambiguous.push({ baseRowNo, group, sale }); continue; }
    const fact = byLookup.get(lookup);
    if (!fact) { unmatched.push({ baseRowNo, group, sale }); continue; }
    const firmId = idText(fact.sourceFirmId, "sourceFirmId");
    const saleId = idText(fact.sourceSaleId, "sourceSaleId");
    const key = financialKey(namespace, firmId, saleId);
    sourceFactByKey.set(key, fact);
    if (!documentsByKey.has(key)) documentsByKey.set(key, {
      financial_key: key, source_contract: text(fact.sourceContract) || "cube-source-identity-v1",
      source_namespace: namespace, source_firm_id: firmId, source_sale_id: saleId,
      source_operation_id: optionalIdText(fact.sourceOperationId, "sourceOperationId"),
      document_date: text(fact.date) || null, route_delivery_id: text(fact.route) || null,
      operation_group_id: text(fact.group) || null, operation_code: text(fact.op) || null,
      sale_code: text(fact.sale) || null, customer_id: text(fact.customerId) || null,
      address_id: text(fact.addressId) || null,
      delivery_address_object_id: optionalIdText(fact.deliveryAddressObjectId, "deliveryAddressObjectId"),
      expeditor_id: optionalIdText(fact.expeditorId, "expeditorId"), employee_id: text(fact.employee) || null,
      sender: text(fact.sender) || null, customer_name: text(fact.customer) || null,
      delivery_address: text(fact.address) || null, expeditor_name: text(fact.expeditor) || null,
      employee_name: text(fact.employeeName) || null, settlement: text(fact.settlement) || null,
      district: text(fact.district) || null, region: text(fact.region) || null,
      bottles: numberValue(fact.bottles, "bottles"), places: numberValue(fact.places, "places"),
      weight: numberValue(fact.weight, "weight"), pallets: numberValue(fact.pallets, "pallets"),
      order_amount: numberValue(fact.amount, "amount"),
      included_trade_line_count: Number(fact.includedTradeLineCount ?? 0),
      measure_issue_line_count: Number(fact.measureIssueLineCount ?? 0), raw_identity: fact,
    });
    const rawBase: JsonRecord = {};
    headers.forEach((header: string, column: number) => { if (header) rawBase[header] = values[column]; });
    baseLinks.push({ base_row_no: baseRowNo, financial_key: key,
      document_date: text(at(values, HEADERS.date)) || null, route_delivery_id: text(at(values, HEADERS.route)) || null,
      operation_group_id: group || null, operation_code: text(at(values, HEADERS.operation)) || null,
      sale_code: sale || null, warehouse: text(at(values, HEADERS.warehouse)) || null,
      expeditor_name: text(at(values, HEADERS.expeditor)) || null,
      customer_id: text(at(values, HEADERS.customerId)) || null, customer_name: text(at(values, HEADERS.customer)) || null,
      address_id: text(at(values, HEADERS.addressId)) || null, delivery_address: text(at(values, HEADERS.address)) || null,
      employee_id: text(at(values, HEADERS.employee)) || null, business_unit: text(at(values, HEADERS.business)) || null,
      base_bottles: numberValue(at(values, HEADERS.bottles), "base bottles"),
      base_places: numberValue(at(values, HEADERS.places), "base places"),
      base_weight: numberValue(at(values, HEADERS.weight), "base weight"),
      base_pallets: numberValue(at(values, HEADERS.pallets), "base pallets"),
      base_order_amount: numberValue(at(values, HEADERS.amount), "base amount"), raw_base: rawBase });
  }
  if (unmatched.length || ambiguous.length || baseLinks.length !== projection.rows.length) {
    throw new Error(`Base identity matching failed: unmatched=${unmatched.length}, ambiguous=${ambiguous.length}`);
  }

  const documents = [...documentsByKey.values()];
  const movements: JsonRecord[] = [];
  const businessLinks: JsonRecord[] = [];
  const movementKeys = new Set<string>();
  const businessKeys = new Set<string>();
  for (const [key, fact] of sourceFactByKey) {
    for (const movement of Array.isArray(fact.movements) ? fact.movements : []) {
      const moveId = idText(movement?.sourceMoveId, "sourceMoveId");
      const associationKey = `${key}|${escaped(moveId)}`;
      if (movementKeys.has(associationKey)) continue;
      movementKeys.add(associationKey);
      movements.push({ financial_key: key, source_move_id: moveId,
        source_firm_id: optionalIdText(movement.sourceFirmId, "movement.sourceFirmId"),
        source_operation_id: optionalIdText(movement.sourceOperationId, "movement.sourceOperationId"),
        source_warehouse_id: optionalIdText(movement.sourceWarehouseId, "movement.sourceWarehouseId"),
        warehouse_address_id: optionalIdText(movement.warehouseAddressId, "movement.warehouseAddressId"),
        warehouse: text(movement.warehouse) || null, raw_movement: movement });
    }
    for (const business of Array.isArray(fact.businessUnits) ? fact.businessUnits : []) {
      const businessId = idText(business?.sourceBusinessUnitId, "sourceBusinessUnitId");
      const associationKey = `${key}|${escaped(businessId)}`;
      if (businessKeys.has(associationKey)) continue;
      businessKeys.add(associationKey);
      businessLinks.push({ financial_key: key, source_business_unit_id: businessId,
        business_unit_name: text(business.business) || null, membership_count: Number(business.membershipRows ?? 0), raw_business_unit: business });
    }
  }
  const sum = (field: string) => documents.reduce((total, row) => total + Number(row[field] ?? 0), 0);
  const report: JsonRecord = {
    baseRows: projection.rows.length, matchedRows: baseLinks.length, unmatchedRows: 0,
    financialFacts: documents.length, duplicateBaseRows: projection.rows.length - documents.length,
    financialCollisionGroups: 0, movementLinks: movements.length, businessLinks: businessLinks.length,
    totalBottles: sum("bottles"), totalPlaces: sum("places"), totalWeight: sum("weight"),
    totalPallets: sum("pallets"), totalOrderAmount: sum("order_amount"), validationPassed: true, promoted: false,
  };
  const run = { source_namespace: namespace, source_contract: text(facts[0]?.sourceContract) || "cube-source-identity-v1",
    file_name: fileName, source_json_sha256: sourceHash, requested_from: exportReport?.requestedPeriod?.from ?? null,
    requested_to: exportReport?.requestedPeriod?.to ?? null, source_facts_total: facts.length, ...report };
  return { run, documents, baseLinks, movements, businessLinks, report };
}
