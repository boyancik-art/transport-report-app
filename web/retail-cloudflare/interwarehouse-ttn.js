(() => {
  const D = "tc_retail_docs_v3",
    X = "tc_retail_interwarehouse_v1",
    J = "tc_retail_ttn_journal_v1",
    F = "tc_retail_fleet_v1";
  const get = (k, d = []) =>
      k === "tc_retail_docs_v3"
        ? RetailState.documents()
        : RetailState.read(k, d),
    set = (k, v) => RetailState.write(k, v),
    n = (v) => Number(v) || 0,
    r = (v) => Math.round(n(v) * 1000) / 1000,
    e = (s) =>
      String(s ?? "").replace(
        /[&<>"']/g,
        (c) =>
          ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;",
          })[c],
      );
  const css = `<style id="iw-css">.iw-tabs,.iw-actions{display:flex;gap:10px;flex-wrap:wrap}.iw-tabs{margin:14px 0 20px}.iw-tabs button,.iw-actions button{padding:11px 17px;border:1px solid #3b5068;border-radius:9px;background:#152538;color:#eef5fc;font-weight:750;cursor:pointer}.iw-tabs .primary,.iw-actions .primary{background:#8f163e;border-color:#b62052}.iw-card{border:1px solid #2c4055;border-radius:15px;background:#0d1824;padding:22px;margin-bottom:18px}.iw-grid{display:grid;grid-template-columns:repeat(4,minmax(180px,1fr));gap:14px}.iw-grid small{display:block;color:#93a5b8;margin-bottom:6px;font-weight:700}.iw-grid input,.iw-grid select{width:100%;box-sizing:border-box;height:46px;padding:0 12px;border:1px solid #3a5068;border-radius:8px;background:#142235;color:#f2f6fa}.iw-summary{display:grid;grid-template-columns:repeat(6,1fr);gap:11px;margin:16px 0}.iw-summary>div{padding:13px;border:1px solid #293e54;border-radius:10px;background:#122235}.iw-summary small{display:block;color:#91a4b8}.iw-summary b{display:block;margin-top:7px;font-size:17px}.iw-store{border-top:1px solid #26394c;padding:12px 0}.iw-store summary{cursor:pointer;font-weight:800}.iw-actions{justify-content:flex-end;margin-top:17px}.iw-select{max-height:430px;overflow:auto}.iw-check{display:grid;grid-template-columns:34px 1fr 120px 120px;gap:10px;align-items:center;padding:10px;border-bottom:1px solid #26384b}.iw-status{padding:4px 9px;border-radius:99px;background:#20374d;color:#c4d5e5;font-size:12px}.iw-print{display:none}@media(max-width:1100px){.iw-grid{grid-template-columns:repeat(2,1fr)}.iw-summary{grid-template-columns:repeat(3,1fr)}}@media(max-width:650px){.iw-grid,.iw-summary{grid-template-columns:1fr}}</style>`;
  const docs = () => get(D),
    lines = (d) => d.lines || d.items || [],
    pal = (d) => n(d.calc) || lines(d).reduce((s, x) => s + n(x.pallets), 0),
    wt = (d) =>
      n(d.sourceWeight) ||
      n(d.calcWeight) ||
      lines(d).reduce((s, x) => s + n(x.weight), 0),
    amt = (d) => n(d.amount) || lines(d).reduce((s, x) => s + n(x.amount), 0);
  function fleet() {
    const f = get(F, {});
    return {
      carriers: f.carriers || ["Тест — Перевізник"],
      drivers: f.drivers || [
        { name: "Тест — Водій", license: "Тест", phone: "Тест" },
      ],
      vehicles: f.vehicles || [
        {
          plate: "AA 0001 XX",
          brand: "Тест",
          model: "Авто",
          length: "—",
          width: "—",
          height: "—",
        },
      ],
      trailers: f.trailers || [
        {
          plate: "Тест — без причепа",
          brand: "—",
          length: "—",
          width: "—",
          height: "—",
        },
      ],
    };
  }
  function create() {
    return {
      id: RetailState.nextNumber(get(X), "id", "IW-", 4),
      from: "Тест — Корпоратура, Львів",
      to: "Тест — Розумовського 27",
      date: RetailState.today(),
      docKeys: [],
      carrier: "Тест — Перевізник",
      driver: "Тест — Водій",
      vehicle: "AA 0001 XX",
      trailer: "Тест — без причепа",
      status: "Чернетка",
      createdAt: new Date().toISOString(),
    };
  }
  function chosen(x) {
    return docs().filter((d) =>
      (x?.docKeys || []).includes(d.key || String(d.id)),
    );
  }
  function total(x) {
    const a = chosen(x);
    return {
      a,
      stores: new Set(a.map((d) => d.store)).size,
      docs: a.length,
      lines: a.reduce((s, d) => s + lines(d).length, 0),
      pal: r(a.reduce((s, d) => s + pal(d), 0)),
      weight: r(a.reduce((s, d) => s + wt(d), 0)),
      amount: r(a.reduce((s, d) => s + amt(d), 0)),
    };
  }
  function opts(a, val, field = "name") {
    const available = a.some(
      (v) => (typeof v === "string" ? v : v[field] || v.plate) === val,
    );
    return (
      (!available && val
        ? `<option selected value="${e(val)}">${e(val)} (поза довідником)</option>`
        : '<option value="">— Оберіть —</option>') +
      a
        .map((v) => {
          const x = typeof v === "string" ? v : v[field] || v.plate;
          return `<option ${x === val ? "selected" : ""}>${e(x)}</option>`;
        })
        .join("")
    );
  }
  function addon() {
    if (location.hash !== "#routes-page") return;
    const h = document.getElementById("ops-documents");
    if (!h || h.querySelector("#iw-addon")) return;
    const b = document.createElement("div");
    b.id = "iw-addon";
    b.innerHTML = `<div class="iw-tabs"><button class="primary" data-new>+ Міжскладський рейс</button><button data-open>Міжскладські рейси · ${get(X).length}</button><button onclick="location.hash='#ttn-journal'">Журнал ТТН</button></div>`;
    h.prepend(b);
    b.querySelector("[data-new]").onclick = RetailState.guard((ev) => {
      ev.stopPropagation();
      if (ev.currentTarget.disabled) return;
      ev.currentTarget.disabled = true;
      const a = get(X);
      a.unshift(create());
      try {
        set(X, a);
        location.hash = "#interwarehouse";
      } catch (error) {
        ev.currentTarget.disabled = false;
        throw error;
      }
    });
    b.querySelector("[data-open]").onclick = () =>
      (location.hash = "#interwarehouse");
  }
  function render() {
    if (location.hash !== "#interwarehouse") return;
    const h = document.getElementById("ops-documents");
    if (!h) return;
    h.hidden = false;
    h.style.display = "block";
    const a = get(X);
    h.innerHTML = `<div class="ops-page-title"><div><h2>Міжскладські рейси</h2><small>Формування консолідованого вантажу між складами та міжскладської ТТН</small></div><button class="ops-primary" data-new>+ Новий рейс</button></div>${a.length ? a.map(card).join("") : '<div class="iw-card">Рейсів ще немає.</div>'}`;
    h.querySelector("[data-new]").onclick = RetailState.guard((ev) => {
      if (!ev.currentTarget.isConnected || ev.currentTarget.disabled) return;
      ev.currentTarget.disabled = true;
      const q = get(X);
      q.unshift(create());
      try {
        set(X, q);
        render();
      } catch (error) {
        ev.currentTarget.disabled = false;
        throw error;
      }
    });
    bind(h);
    window.RetailInterwarehouseEnhance?.();
    window.dispatchEvent(new Event("retail:rendered"));
  }
  function card(x) {
    const t = total(x),
      f = fleet();
    return `<section class="iw-card" data-id="${e(x.id)}"><div style="display:flex;justify-content:space-between"><div><h3 style="margin:0">${e(x.id)} · Міжскладський рейс</h3><small>${e(x.from)} → ${e(x.to)}</small></div><span class="iw-status">${e(x.status)}</span></div><div class="iw-grid" style="margin-top:18px"><label><small>Склад відправлення</small><input data-f="from" value="${e(x.from)}"></label><label><small>Склад отримання</small><input data-f="to" value="${e(x.to)}"></label><label><small>Дата рейсу</small><input type="date" data-f="date" value="${e(x.date)}"></label><label><small>Перевізник</small><select data-f="carrier">${opts(f.carriers, x.carrier)}</select></label><label><small>Водій</small><select data-f="driver">${opts(f.drivers, x.driver)}</select></label><label><small>Авто / держномер</small><select data-f="vehicle">${opts(f.vehicles, x.vehicle, "plate")}</select></label><label><small>Причіп</small><select data-f="trailer">${opts(f.trailers, x.trailer, "plate")}</select></label></div><div class="iw-summary"><div><small>Магазини</small><b>${t.stores}</b></div><div><small>Документи</small><b>${t.docs}</b></div><div><small>Позиції</small><b>${t.lines}</b></div><div><small>Мат. палети</small><b>${t.pal}</b></div><div><small>Вага товару</small><b>${t.weight} кг</b></div><div><small>Сума джерела</small><b>${t.amount.toLocaleString("uk-UA")} грн</b></div></div>${detail(t.a)}<div class="iw-actions"><button data-pick>Обрати магазини / документи</button><button data-reg>Реєстр завантаження</button><button class="primary" data-ttn>Сформувати ТТН</button></div></section>`;
  }
  function detail(a) {
    const groups = {};
    a.forEach((d) => (groups[d.store] ??= []).push(d));
    return `<details><summary><b>Повна деталізація вантажу</b></summary>${Object.entries(
      groups,
    )
      .map(
        ([s, ds]) =>
          `<details class="iw-store"><summary>${e(s)} · ${ds.length} док. · ${r(ds.reduce((q, d) => q + pal(d), 0))} пал. · ${r(ds.reduce((q, d) => q + wt(d), 0))} кг</summary><table class="ops-register"><thead><tr><th>Документ</th><th>Артикул</th><th>ШК</th><th>Найменування</th><th>К-ть</th><th>Палети</th><th>Вага</th><th>Сума</th></tr></thead><tbody>${ds.flatMap((d) => lines(d).map((l) => `<tr><td>${e(d.id)}</td><td>${e(l.sku)}</td><td>${e(l.barcode)}</td><td>${e(l.name)}</td><td>${n(l.qty)}</td><td>${r(l.pallets)}</td><td>${r(l.weight)} кг</td><td>${n(l.amount).toLocaleString("uk-UA")}</td></tr>`)).join("")}</tbody></table></details>`,
      )
      .join("")}</details>`;
  }
  function bind(h) {
    h.querySelectorAll("[data-id]").forEach((c) => {
      const id = c.dataset.id;
      c.querySelectorAll("[data-f]").forEach(
        (el) =>
          (el.onchange = RetailState.guard(() => {
            const records = get(X),
              previous = records.find((x) => x.id === id);
            if (!previous)
              throw Error("Рейс більше не існує. Оновіть сторінку.");
            try {
              set(
                X,
                records.map((x) =>
                  x.id === id ? { ...x, [el.dataset.f]: el.value } : x,
                ),
              );
            } catch (error) {
              el.value = previous[el.dataset.f] ?? "";
              throw error;
            }
          })),
      );
      c.querySelector("[data-pick]").onclick = RetailState.guard(() =>
        pick(id),
      );
      c.querySelector("[data-reg]").onclick = RetailState.guard(() =>
        printDoc(id, "register"),
      );
      c.querySelector("[data-ttn]").onclick = RetailState.guard(() => make(id));
    });
  }
  function pick(id) {
    const x = get(X).find((v) => v.id === id),
      all = docs(),
      sel = new Set(x.docKeys || []),
      m = document.createElement("div");
    m.id = "iw-modal";
    m.innerHTML = `<div class="ops-backdrop"></div><div class="ops-dialog" style="width:min(1200px,96vw);max-width:none"><h2>Вантаж рейсу ${e(id)}</h2><p>Оберіть магазини/документи, які фізично їдуть у цьому авто.</p><div class="iw-select">${all.map((d) => `<label class="iw-check"><input type="checkbox" value="${e(d.key || d.id)}" ${sel.has(d.key || String(d.id)) ? "checked" : ""}><b>${e(d.store)}</b><span>№ ${e(d.id)}</span><span>${r(pal(d))} пал.</span></label>`).join("")}</div><div class="iw-actions"><button data-close>Скасувати</button><button class="primary" data-save>Зберегти вантаж</button></div></div>`;
    document.body.append(m);
    m.className = "open";
    m.querySelector("[data-close]").onclick = () => m.remove();
    m.querySelector("[data-save]").onclick = RetailState.guard(() => {
      const keys = [...m.querySelectorAll("input:checked")].map((q) => q.value);
      set(
        X,
        get(X).map((v) => (v.id === id ? { ...v, docKeys: keys } : v)),
      );
      m.remove();
      render();
    });
  }
  function make(id) {
    const x = get(X).find((v) => v.id === id);
    if (!x) return;
    if (
      !x.from ||
      !x.to ||
      x.from === x.to ||
      !x.date ||
      !x.carrier ||
      !x.driver ||
      !x.vehicle
    )
      throw Error(
        "Перевірте дату, різні адреси відправлення/отримання та транспорт.",
      );
    const t = total(x);
    if (!t.docs) return alert("Спочатку оберіть вантаж рейсу.");
    const j = get(J),
      existing = j.find((q) => q.route === id && q.type === "Міжскладська");
    const no =
      existing?.number || RetailState.nextNumber(j, "number", "TS_TTN_", 6);
    const rec = {
      number: no,
      type: "Міжскладська",
      route: id,
      date: x.date,
      from: x.from,
      to: x.to,
      carrier: x.carrier,
      driver: x.driver,
      vehicle: x.vehicle,
      trailer: x.trailer,
      stores: t.stores,
      documents: t.docs,
      pallets: t.pal,
      weight: t.weight,
      amount: t.amount,
      docKeys: x.docKeys,
      status: "Сформовано",
      createdAt: existing?.createdAt || new Date().toISOString(),
    };
    RetailState.commit({
      [J]: existing ? j.map((q) => (q === existing ? rec : q)) : [rec, ...j],
      [X]: get(X).map((v) =>
        v.id === id ? { ...v, status: "ТТН сформовано", ttn: no } : v,
      ),
    });
    render();
    printDoc(id, "ttn");
  }
  function printDoc(id, type) {
    const x = get(X).find((v) => v.id === id),
      t = total(x);
    if (!x || !t.docs) return alert("Немає вантажу для документа.");
    const f = fleet(),
      veh = f.vehicles.find((v) => v.plate === x.vehicle) || {},
      drv = f.drivers.find((v) => v.name === x.driver) || {};
    const title =
      type === "register"
        ? "РЕЄСТР ЗАВАНТАЖЕННЯ"
        : "ТОВАРНО-ТРАНСПОРТНА НАКЛАДНА";
    const no = x.ttn || "Чернетка";
    const w = open("", "_blank");
    if (!w) return RetailState.notice("Дозвольте спливаючі вікна для друку.");
    w.document.write(
      `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title><style>@page{size:A4 landscape;margin:9mm}body{font:11px Arial;color:#111}h1{text-align:center;font-size:18px}.meta{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;border:1px solid #222;padding:10px}.meta div{border-bottom:1px solid #aaa;padding:4px}table{width:100%;border-collapse:collapse;margin-top:10px}th,td{border:1px solid #222;padding:4px}th{background:#eee}.sign{display:grid;grid-template-columns:1fr 1fr 1fr;gap:30px;margin-top:28px}.copy{page-break-after:always}.copy:last-child{page-break-after:auto}</style></head><body>${Array.from({ length: type === "ttn" ? 3 : 1 }, (_, copy) => `<section class="copy"><h1>${title}</h1><p style="text-align:center">№ ${e(no)} · ${e(x.date)} ${type === "ttn" ? `· Примірник ${copy + 1}/3` : ""}</p><div class="meta"><div><b>Відправник:</b> ${e(x.from)}</div><div><b>Одержувач:</b> ${e(x.to)}</div><div><b>Перевізник:</b> ${e(x.carrier)}</div><div><b>Водій:</b> ${e(x.driver)} · посвідчення ${e(drv.license || "—")} · ${e(drv.phone || "—")}</div><div><b>Авто:</b> ${e(veh.brand || "")} ${e(veh.model || "")} ${e(x.vehicle)} · ${e(veh.length || "—")}×${e(veh.width || "—")}×${e(veh.height || "—")}</div><div><b>Причіп:</b> ${e(x.trailer || "—")}</div><div><b>Магазинів у вантажі:</b> ${t.stores}</div><div><b>Мат. палети:</b> ${t.pal}</div><div><b>Загальна вага товару:</b> ${t.weight} кг</div></div><table><thead><tr><th>Магазин</th><th>Документ</th><th>Позицій</th><th>Палети</th><th>Вага, кг</th><th>Сума джерела</th></tr></thead><tbody>${t.a.map((d) => `<tr><td>${e(d.store)}</td><td>${e(d.id)}</td><td>${lines(d).length}</td><td>${r(pal(d))}</td><td>${r(wt(d))}</td><td>${n(amt(d)).toLocaleString("uk-UA")}</td></tr>`).join("")}</tbody></table><p><b>Усього:</b> ${t.docs} документів · ${t.lines} товарних позицій · ${t.pal} пал. · ${t.weight} кг · ${t.amount.toLocaleString("uk-UA")} грн</p><div class="sign"><div>Відпустив __________________</div><div>Водій __________________</div><div>Прийняв __________________</div></div></section>`).join("")}<script>setTimeout(()=>print(),300)<\/script></body></html>`,
    );
    w.document.close();
  }
  function journal() {
    if (location.hash !== "#ttn-journal") return;
    const h = document.getElementById("ops-documents");
    if (!h) return;
    h.hidden = false;
    h.style.display = "block";
    const j = get(J);
    h.innerHTML = `<div class="ops-page-title"><div><h2>Журнал ТТН</h2><small>Єдиний журнал міжскладських та магазинних ТТН</small></div><button class="ops-primary" onclick="location.hash='#routes-page'">До маршрутів</button></div><div class="iw-summary"><div><small>Всього</small><b>${j.length}</b></div><div><small>Міжскладські</small><b>${j.filter((x) => x.type === "Міжскладська").length}</b></div><div><small>Магазинні</small><b>${j.filter((x) => x.type === "Магазин").length}</b></div></div>${j.length ? `<table class="ops-register"><thead><tr><th>№ ТТН</th><th>Тип</th><th>Дата</th><th>Рейс/маршрут</th><th>Відправник</th><th>Одержувач</th><th>Авто</th><th>Док.</th><th>Палети</th><th>Вага</th><th>Статус</th></tr></thead><tbody>${j.map((x) => `<tr><td><button class="ops-link" data-reopen="${e(x.route)}">${e(x.number)}</button></td><td>${e(x.type)}</td><td>${e(x.date)}</td><td>${e(x.route)}</td><td>${e(x.from)}</td><td>${e(x.to)}</td><td>${e(x.vehicle || "—")}</td><td>${x.documents || 0}</td><td>${x.pallets || 0}</td><td>${x.weight || 0} кг</td><td>${e(x.status)}</td></tr>`).join("")}</tbody></table>` : '<div class="iw-card">ТТН ще не сформовані.</div>'}`;
    h.onclick = RetailState.guard((ev) => {
      const b = ev.target.closest("[data-reopen]");
      if (!b) return;
      const route = b.dataset.reopen;
      if (get("tc_retail_routes_v1").some((x) => x.number === route))
        window.RetailRouteTTN.generate(route);
      else if (get(X).some((x) => x.id === route)) printDoc(route, "ttn");
      else
        RetailState.notice(
          "Пов’язаний маршрут не знайдено. ТТН збережена в журналі.",
        );
    });
  }
  function boot() {
    if (!document.getElementById("iw-css"))
      document.head.insertAdjacentHTML("beforeend", css);
    setTimeout(() => {
      addon();
      RetailState.guard(render)();
      RetailState.guard(journal)();
    }, 60);
  }
  window.addEventListener("hashchange", boot);
  document.addEventListener("DOMContentLoaded", boot);
  setTimeout(boot, 250);
  window.RetailInterwarehouse = { addon, render, journal, printDoc };
})();
