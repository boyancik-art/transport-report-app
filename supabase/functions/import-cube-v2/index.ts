import { createClient } from "npm:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const txt = (v: unknown) => (v == null ? "" : String(v).trim());
const num = (v: unknown) => {
  if (v == null || v === "") return 0;
  const n = typeof v === "number" ? v : Number(String(v).replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};
const chunks = <T>(a: T[], n = 250) => Array.from({ length: Math.ceil(a.length / n) }, (_, i) => a.slice(i * n, (i + 1) * n));
const escKey = (s: string) => s.replaceAll("|", "%7C");
const financialKey = (ns: string, firm: string, saleId: string) => `cube-invoice-v2|${escKey(ns)}|${escKey(firm)}|${escKey(saleId)}`;
const lookupKey = (group: unknown, sale: unknown) => `${txt(group)}|${txt(sale)}`;

async function sha256(bytes: Uint8Array) {
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hash)).map((x) => x.toString(16).padStart(2, "0")).join("");
}

function explainError(e: any) {
  if (!e) return { message: "Unknown error" };
  if (e instanceof Error) return { name: e.name, message: e.message, stack: e.stack ?? null };
  return { message: e.message ?? String(e), code: e.code ?? null, details: e.details ?? null, hint: e.hint ?? null };
}

async function must<T>(stage: string, p: PromiseLike<{ data: T; error: any }>) {
  const { data, error } = await p;
  if (error) throw { stage, ...explainError(error) };
  return data;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  let stage = "start";
  let runId: string | null = null;
  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  try {
    if (req.method !== "POST") throw new Error("POST only");

    stage = "read_form";
    const form = await req.formData();
    const file = form.get("source_identity");
    if (!(file instanceof File)) throw new Error("field 'source_identity' JSON file required");
    const bytes = new Uint8Array(await file.arrayBuffer());
    const sourceHash = await sha256(bytes);

    stage = "parse_source_identity";
    const payload = JSON.parse(new TextDecoder().decode(bytes));
    const report = payload?.report ?? {};
    const projection = payload?.sourceProjection;
    const facts = Array.isArray(payload?.financialFacts) ? payload.financialFacts : [];
    if (report.status !== "exported_for_review" || report.refreshConfirmed !== true || report.exportCompleted !== true) {
      throw new Error("Source Identity export is not a completed refreshed review export");
    }
    if (!projection || !Array.isArray(projection.headers) || !Array.isArray(projection.rows)) throw new Error("sourceProjection missing");
    if (!facts.length) throw new Error("financialFacts missing");

    const sourceNamespace = txt(report.sourceNamespace) || "ts-plus-cube";
    const sourceContract = txt(facts[0]?.sourceContract) || "cube-source-identity-v1";
    const headers = projection.headers.map(txt);
    const col = new Map<string, number>();
    headers.forEach((h: string, i: number) => { if (h && !col.has(h)) col.set(h, i); });
    const need = ["ID групи (Операції)", "Код продажі", "Дата документу", "ID Доставки", "Код операції", "Склад відправника", "Експедитор", "ID Контрагента", "Контрагент", "ID Адреса доставки", "Адреса доставки", "EmployeeID", "Бізнес одиниця", "К-ть пляшок", "Кількість місць", "Вага", "Мат пал.", "Сума замовлення"];
    for (const h of need) if (!col.has(h)) throw new Error(`sourceProjection missing column: ${h}`);
    const at = (v: any[], h: string) => v[col.get(h)!];

    stage = "index_identity";
    const identityByLookup = new Map<string, any>();
    const ambiguousLookup = new Set<string>();
    for (const f of facts) {
      const k = lookupKey(f?.group, f?.sale);
      if (!txt(f?.sourceSaleId) || !txt(f?.sourceFirmId) || !k.replaceAll("|", "")) continue;
      if (identityByLookup.has(k)) ambiguousLookup.add(k);
      else identityByLookup.set(k, f);
    }

    stage = "match_base";
    const baseLinks: any[] = [];
    const activeDocs = new Map<string, any>();
    const unmatched: any[] = [];
    const ambiguous: any[] = [];
    let baseAmount = 0;

    for (let i = 0; i < projection.rows.length; i++) {
      const row = projection.rows[i];
      const values = Array.isArray(row?.values) ? row.values : [];
      const group = txt(at(values, "ID групи (Операції)"));
      const sale = txt(at(values, "Код продажі"));
      const lk = lookupKey(group, sale);
      const baseRowNo = Number(row?.sourceRow ?? i + 2);
      baseAmount += num(at(values, "Сума замовлення"));
      if (ambiguousLookup.has(lk)) {
        ambiguous.push({ baseRowNo, group, sale });
        continue;
      }
      const f = identityByLookup.get(lk);
      if (!f) {
        unmatched.push({ baseRowNo, group, sale });
        continue;
      }
      const ns = sourceNamespace;
      const firm = txt(f.sourceFirmId);
      const saleId = txt(f.sourceSaleId);
      const fk = financialKey(ns, firm, saleId);
      activeDocs.set(fk, f);
      const rawBase: Record<string, unknown> = {};
      for (let c = 0; c < headers.length && c < values.length; c++) if (headers[c]) rawBase[headers[c]] = values[c];
      baseLinks.push({
        run_id: null,
        base_row_no: baseRowNo,
        financial_key: fk,
        document_date: txt(at(values, "Дата документу")) || null,
        route_delivery_id: txt(at(values, "ID Доставки")) || null,
        operation_group_id: group || null,
        operation_code: txt(at(values, "Код операції")) || null,
        sale_code: sale || null,
        warehouse: txt(at(values, "Склад відправника")) || null,
        expeditor_name: txt(at(values, "Експедитор")) || null,
        customer_id: txt(at(values, "ID Контрагента")) || null,
        customer_name: txt(at(values, "Контрагент")) || null,
        address_id: txt(at(values, "ID Адреса доставки")) || null,
        delivery_address: txt(at(values, "Адреса доставки")) || null,
        employee_id: txt(at(values, "EmployeeID")) || null,
        business_unit: txt(at(values, "Бізнес одиниця")) || null,
        base_bottles: num(at(values, "К-ть пляшок")),
        base_places: num(at(values, "Кількість місць")),
        base_weight: num(at(values, "Вага")),
        base_pallets: num(at(values, "Мат пал.")),
        base_order_amount: num(at(values, "Сума замовлення")),
        raw_base: rawBase,
      });
    }

    const duplicateBaseRows = projection.rows.length - activeDocs.size;
    const financialAmount = [...activeDocs.values()].reduce((s, f) => s + num(f?.amount), 0);

    stage = "create_run";
    const runRows: any = await must("create_run", db.from("cube_sync_runs_v2").insert({
      source_namespace: sourceNamespace,
      source_contract: sourceContract,
      file_name: file.name,
      source_json_sha256: sourceHash,
      requested_from: report?.requestedPeriod?.from ?? null,
      requested_to: report?.requestedPeriod?.to ?? null,
      base_rows: projection.rows.length,
      matched_base_rows: baseLinks.length,
      unmatched_base_rows: unmatched.length + ambiguous.length,
      source_facts_total: facts.length,
      active_financial_facts: activeDocs.size,
      duplicate_base_rows: duplicateBaseRows,
      base_amount: baseAmount,
      financial_amount: financialAmount,
      status: "staging",
      diagnostics: {
        sourceIdentityIssues: Number(report.identityIssues ?? 0),
        sourceFinancialCollisionGroups: Number(report.financialCollisionGroups ?? 0),
        unmatched: unmatched.slice(0, 100),
        ambiguous: ambiguous.slice(0, 100),
        rule: "Base defines actuality; Source Identity defines stable identity",
      },
    }).select("id").single());
    runId = runRows.id;

    if (unmatched.length || ambiguous.length) {
      await db.from("cube_sync_runs_v2").update({ status: "failed" }).eq("id", runId);
      return new Response(JSON.stringify({ ok: false, stage: "match_base", runId, unmatched: unmatched.length, ambiguous: ambiguous.length }), {
        status: 409, headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    stage = "stage_documents";
    const documentRows = [...activeDocs.entries()].map(([fk, f]) => ({
      run_id: runId,
      financial_key: fk,
      source_contract: txt(f.sourceContract) || sourceContract,
      source_namespace: sourceNamespace,
      source_firm_id: txt(f.sourceFirmId),
      source_sale_id: txt(f.sourceSaleId),
      source_operation_id: txt(f.sourceOperationId) || null,
      document_date: txt(f.date) || null,
      route_delivery_id: txt(f.route) || null,
      operation_group_id: txt(f.group) || null,
      operation_code: txt(f.op) || null,
      sale_code: txt(f.sale) || null,
      customer_id: txt(f.customerId) || null,
      address_id: txt(f.addressId) || null,
      delivery_address_object_id: txt(f.deliveryAddressObjectId) || null,
      expeditor_id: txt(f.expeditorId) || null,
      employee_id: txt(f.employee) || null,
      sender: txt(f.sender) || null,
      customer_name: txt(f.customer) || null,
      delivery_address: txt(f.address) || null,
      expeditor_name: txt(f.expeditor) || null,
      employee_name: txt(f.employeeName) || null,
      settlement: txt(f.settlement) || null,
      district: txt(f.district) || null,
      region: txt(f.region) || null,
      bottles: num(f.bottles), places: num(f.places), weight: num(f.weight), pallets: num(f.pallets), order_amount: num(f.amount),
      included_trade_line_count: Number(f.includedTradeLineCount ?? 0),
      measure_issue_line_count: Number(f.measureIssueLineCount ?? 0),
      raw_identity: f,
    }));
    for (const c of chunks(documentRows)) await must("stage_documents", db.from("cube_sync_stage_documents_v2").insert(c));

    stage = "stage_base_links";
    for (const r of baseLinks) r.run_id = runId;
    for (const c of chunks(baseLinks)) await must("stage_base_links", db.from("cube_sync_stage_base_links_v2").insert(c));

    stage = "stage_associations";
    const movements: any[] = [];
    const businessUnits: any[] = [];
    for (const [fk, f] of activeDocs) {
      for (const m of Array.isArray(f.movements) ? f.movements : []) {
        if (!txt(m?.sourceMoveId)) continue;
        movements.push({ run_id: runId, financial_key: fk, source_move_id: txt(m.sourceMoveId), source_firm_id: txt(m.sourceFirmId) || null, source_operation_id: txt(m.sourceOperationId) || null, source_warehouse_id: txt(m.sourceWarehouseId) || null, warehouse_address_id: txt(m.warehouseAddressId) || null, warehouse: txt(m.warehouse) || null, raw_movement: m });
      }
      for (const b of Array.isArray(f.businessUnits) ? f.businessUnits : []) {
        if (!txt(b?.sourceBusinessUnitId)) continue;
        businessUnits.push({ run_id: runId, financial_key: fk, source_business_unit_id: txt(b.sourceBusinessUnitId), business_unit_name: txt(b.business) || null, membership_count: Number(b.membershipRows ?? 0), raw_business_unit: b });
      }
    }
    for (const c of chunks(movements)) await must("stage_movements", db.from("cube_sync_stage_movements_v2").insert(c));
    for (const c of chunks(businessUnits)) await must("stage_business_units", db.from("cube_sync_stage_business_units_v2").insert(c));

    stage = "validate_stage";
    const { count: docCount, error: docCountError } = await db.from("cube_sync_stage_documents_v2").select("financial_key", { count: "exact", head: true }).eq("run_id", runId);
    if (docCountError) throw { stage, ...explainError(docCountError) };
    const { count: linkCount, error: linkCountError } = await db.from("cube_sync_stage_base_links_v2").select("base_row_no", { count: "exact", head: true }).eq("run_id", runId);
    if (linkCountError) throw { stage, ...explainError(linkCountError) };
    if (docCount !== activeDocs.size || linkCount !== projection.rows.length) throw new Error("Staging count validation failed");

    await must("validate_run", db.from("cube_sync_runs_v2").update({ status: "validated", validated_at: new Date().toISOString() }).eq("id", runId));

    return new Response(JSON.stringify({
      ok: true,
      status: "validated_not_promoted",
      runId,
      baseRows: projection.rows.length,
      matchedBaseRows: baseLinks.length,
      activeFinancialFacts: activeDocs.size,
      duplicateBaseRows,
      sourceFactsTotal: facts.length,
      baseAmount,
      financialAmount,
      overcountRemoved: baseAmount - financialAmount,
      movements: movements.length,
      businessUnits: businessUnits.length,
      readyForPromotionV2: true,
      legacyProductionTablesTouched: false,
    }), { headers: { ...CORS, "Content-Type": "application/json" } });
  } catch (e) {
    const details = explainError(e);
    console.error("import-cube-v2 failed", { stage, runId, details });
    if (runId) await db.from("cube_sync_runs_v2").update({ status: "failed", diagnostics: { failureStage: stage, error: details } }).eq("id", runId);
    return new Response(JSON.stringify({ ok: false, stage, runId, error: details }, null, 2), {
      status: 400, headers: { ...CORS, "Content-Type": "application/json" },
    });
  }
});
