import { createClient } from "npm:@supabase/supabase-js@2";
import * as XLSX from "npm:xlsx@0.18.5";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const H = {
  route: "ID Доставки",
  group: "ID групи (Операції)",
  op: "Код операції",
  warehouse: "Склад відправника",
  expeditor: "Експедитор",
  customer: "Контрагент",
  address: "Адреса доставки",
  bottles: "К-ть пляшок",
  places: "Кількість місць",
  weight: "Вага",
  sale: "Код продажі",
  amount: "Сума замовлення",
  date: "Дата документу",
  customerId: "ID Контрагента",
  addressId: "ID Адреса доставки",
  pallets: "Мат пал.",
  settlement: "Нас. пункт",
  district: "Район",
  region: "Область",
  business: "Бізнес одиниця",
  employee: "EmployeeID",
};

const txt = (v: any) => (v == null ? "" : String(v).trim());
const num = (v: any) => {
  if (v == null || v === "") return 0;
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  const n = Number(String(v).replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};

function iso(v: any) {
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === "number") {
    const d = XLSX.SSF.parse_date_code(v);
    if (d) return `${d.y}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}`;
  }
  const s = txt(v);
  const a = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (a) return `${a[1]}-${a[2]}-${a[3]}`;
  const b = s.match(/^(\d{2})[./-](\d{2})[./-](\d{4})$/);
  if (b) return `${b[3]}-${b[2]}-${b[1]}`;
  throw new Error(`Bad date: ${s}`);
}

function chunks<T>(a: T[], n = 400) {
  const out: T[][] = [];
  for (let i = 0; i < a.length; i += n) out.push(a.slice(i, i + n));
  return out;
}

function explainError(e: any) {
  if (!e) return { message: "Unknown error" };
  if (e instanceof Error) {
    return { name: e.name, message: e.message, stack: e.stack ?? null };
  }
  if (typeof e === "object") {
    return {
      message: e.message ?? e.error_description ?? e.error ?? "Request failed",
      code: e.code ?? null,
      details: e.details ?? null,
      hint: e.hint ?? null,
      raw: e,
    };
  }
  return { message: String(e) };
}

async function must<T>(stage: string, p: PromiseLike<{ data: T; error: any }>) {
  const { data, error } = await p;
  if (error) throw { stage, ...explainError(error) };
  return data;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  let stage = "start";
  try {
    if (req.method !== "POST") throw new Error("POST only");

    const db = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    stage = "read_form";
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) throw new Error("field 'file' required");

    stage = "parse_excel";
    const wb = XLSX.read(new Uint8Array(await file.arrayBuffer()), { type: "array", cellDates: true });
    const sheetName = wb.SheetNames.includes("base") ? "base" : wb.SheetNames[0];
    const rows = XLSX.utils.sheet_to_json<any>(wb.Sheets[sheetName], { defval: "" });

    for (const col of [H.route, H.group, H.date, H.addressId, H.customerId, H.business, H.employee]) {
      if (!rows[0] || !(col in rows[0])) throw new Error(`Missing column: ${col}`);
    }

    stage = "normalize_rows";
    const src = rows.map((r: any, index: number) => ({
      rowNo: index + 2,
      date: iso(r[H.date]),
      route: txt(r[H.route]),
      group: txt(r[H.group]),
      op: txt(r[H.op]),
      warehouse: txt(r[H.warehouse]),
      expeditor: txt(r[H.expeditor]),
      customer: txt(r[H.customer]),
      address: txt(r[H.address]),
      bottles: num(r[H.bottles]),
      places: num(r[H.places]),
      weight: num(r[H.weight]),
      sale: txt(r[H.sale]),
      amount: num(r[H.amount]),
      customerId: txt(r[H.customerId]),
      addressId: txt(r[H.addressId]),
      pallets: num(r[H.pallets]),
      settlement: txt(r[H.settlement]),
      district: txt(r[H.district]),
      region: txt(r[H.region]),
      business: txt(r[H.business]),
      employee: txt(r[H.employee]),
      raw: r,
    })).filter((r: any) => r.date && r.route && r.addressId);

    const now = new Date().toISOString();

    stage = "locations_upsert";
    const locMap = new Map<string, any>();
    for (const r of src) {
      locMap.set(r.addressId, {
        address_id: r.addressId,
        customer_id: r.customerId || null,
        customer_name: r.customer || null,
        delivery_address: r.address || null,
        settlement: r.settlement || null,
        district: r.district || null,
        region: r.region || null,
        updated_at: now,
      });
    }
    for (const c of chunks([...locMap.values()])) {
      await must("locations_upsert", db.from("locations").upsert(c, { onConflict: "address_id" }));
    }

    stage = "locations_fetch";
    const locIds = new Map<string, number>();
    for (const c of chunks([...locMap.keys()], 200)) {
      const data: any = await must("locations_fetch", db.from("locations").select("id,address_id").in("address_id", c));
      for (const x of data ?? []) locIds.set(x.address_id, x.id);
    }

    stage = "aggregate_routes";
    const routeMap = new Map<string, any>();
    for (const r of src) {
      const key = `${r.date}|${r.route}`;
      const x = routeMap.get(key) ?? {
        route_date: r.date,
        route_delivery_id: r.route,
        expeditor_name: r.expeditor || null,
        warehouse: r.warehouse || null,
        total_points: 0,
        total_documents: 0,
        total_weight: 0,
        total_pallets: 0,
        total_bottles: 0,
        total_places: 0,
        total_order_amount: 0,
        updated_at: now,
      };
      x.total_documents++;
      x.total_weight += r.weight;
      x.total_pallets += r.pallets;
      x.total_bottles += r.bottles;
      x.total_places += r.places;
      x.total_order_amount += r.amount;
      routeMap.set(key, x);
    }

    const pointMap = new Map<string, any>();
    for (const r of src) {
      const key = `${r.date}|${r.route}|${r.addressId}|${r.customerId}`;
      const x = pointMap.get(key) ?? {
        date: r.date,
        route: r.route,
        addressId: r.addressId,
        customerId: r.customerId,
        customerName: r.customer,
        documents_count: 0,
        weight: 0,
        pallets: 0,
        bottles: 0,
        places: 0,
        order_amount: 0,
      };
      x.documents_count++;
      x.weight += r.weight;
      x.pallets += r.pallets;
      x.bottles += r.bottles;
      x.places += r.places;
      x.order_amount += r.amount;
      pointMap.set(key, x);
    }

    const counts = new Map<string, number>();
    for (const p of pointMap.values()) {
      const k = `${p.date}|${p.route}`;
      counts.set(k, (counts.get(k) ?? 0) + 1);
    }
    for (const [k, x] of routeMap) x.total_points = counts.get(k) ?? 0;

    stage = "routes_upsert";
    for (const c of chunks([...routeMap.values()])) {
      await must("routes_upsert", db.from("routes").upsert(c, { onConflict: "route_date,route_delivery_id" }));
    }

    stage = "routes_fetch";
    const routeIds = new Map<string, number>();
    const dates = [...new Set(src.map((r: any) => r.date))];
    for (const d of dates) {
      const ids = [...routeMap.values()].filter((x: any) => x.route_date === d).map((x: any) => x.route_delivery_id);
      for (const c of chunks(ids, 200)) {
        const data: any = await must("routes_fetch", db.from("routes").select("id,route_date,route_delivery_id").eq("route_date", d).in("route_delivery_id", c));
        for (const x of data ?? []) routeIds.set(`${x.route_date}|${x.route_delivery_id}`, x.id);
      }
    }

    const pointRows = [...pointMap.values()].map((p: any) => ({
      route_id: routeIds.get(`${p.date}|${p.route}`),
      location_id: locIds.get(p.addressId),
      customer_id: p.customerId || null,
      customer_name: p.customerName || null,
      documents_count: p.documents_count,
      weight: p.weight,
      pallets: p.pallets,
      bottles: p.bottles,
      places: p.places,
      order_amount: p.order_amount,
      updated_at: now,
    }));

    stage = "route_points_upsert";
    for (const c of chunks(pointRows)) {
      await must("route_points_upsert", db.from("route_points").upsert(c, { onConflict: "route_id,location_id,customer_id" }));
    }

    stage = "route_points_fetch";
    const pointIds = new Map<string, number>();
    for (const rid of [...new Set(pointRows.map((x: any) => x.route_id))]) {
      const data: any = await must("route_points_fetch", db.from("route_points").select("id,route_id,location_id,customer_id").eq("route_id", rid));
      for (const x of data ?? []) pointIds.set(`${x.route_id}|${x.location_id}|${x.customer_id ?? ""}`, x.id);
    }

    stage = "business_aggregate";
    const bizMap = new Map<string, any>();
    for (const r of src) {
      const rid = routeIds.get(`${r.date}|${r.route}`)!;
      const lid = locIds.get(r.addressId)!;
      const pointId = pointIds.get(`${rid}|${lid}|${r.customerId}`)!;
      const key = `${pointId}|${r.employee}|${r.business}`;
      const x = bizMap.get(key) ?? {
        route_point_id: pointId,
        employee_id: r.employee || null,
        business_unit: r.business || null,
        documents_count: 0,
        weight: 0,
        pallets: 0,
        bottles: 0,
        places: 0,
        order_amount: 0,
        updated_at: now,
      };
      x.documents_count++;
      x.weight += r.weight;
      x.pallets += r.pallets;
      x.bottles += r.bottles;
      x.places += r.places;
      x.order_amount += r.amount;
      bizMap.set(key, x);
    }

    stage = "business_upsert";
    for (const c of chunks([...bizMap.values()])) {
      await must("business_upsert", db.from("route_business_allocations").upsert(c, { onConflict: "route_point_id,employee_id,business_unit" }));
    }

    stage = "documents_upsert";
    const docs = src.map((r: any) => ({
      source_key: [r.date, r.route, r.group || "-", r.op || "-", r.sale || "-", r.rowNo].join("|"),
      document_date: r.date,
      route_delivery_id: r.route,
      operation_group_id: r.group || null,
      operation_code: r.op || null,
      sale_code: r.sale || null,
      address_id: r.addressId || null,
      customer_id: r.customerId || null,
      employee_id: r.employee || null,
      business_unit: r.business || null,
      expeditor_name: r.expeditor || null,
      customer_name: r.customer || null,
      delivery_address: r.address || null,
      warehouse: r.warehouse || null,
      bottles: r.bottles,
      places: r.places,
      weight: r.weight,
      order_amount: r.amount,
      pallets: r.pallets,
      raw_data: r.raw,
    }));
    for (const c of chunks(docs, 250)) {
      await must("documents_upsert", db.from("source_documents").upsert(c, { onConflict: "source_key", ignoreDuplicates: true }));
    }

    const summary = {
      file: file.name,
      sheet: sheetName,
      rows_total: src.length,
      routes_total: routeMap.size,
      points_total: pointMap.size,
      business_rows_total: bizMap.size,
    };

    stage = "cube_imports_log";
    await must("cube_imports_log", db.from("cube_imports").insert({
      file_name: file.name,
      rows_total: summary.rows_total,
      routes_total: summary.routes_total,
      points_total: summary.points_total,
      business_rows_total: summary.business_rows_total,
      details: summary,
      status: "completed",
    }));

    return new Response(JSON.stringify({ ok: true, ...summary }), {
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  } catch (e) {
    const details = explainError(e);
    console.error("import-cube failed", { stage, details });
    return new Response(JSON.stringify({ ok: false, stage, error: details }, null, 2), {
      status: 400,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }
});
