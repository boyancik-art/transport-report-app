(() => {
  const D = "tc_retail_docs_v3",
    T = "tc_retail_tickets_v1",
    R = "tc_retail_routes_v1",
    F = "tc_retail_fleet_v1";
  const W = [
    "03035, м. Київ, вул. Гетьмана Кирила Розумовського, буд. 27",
    "79038, м. Львів, вул. Пасічна, буд. 127",
    "80383, с. Малехів, вул. Тараса Дороша, буд. 20А",
    "47728, с. Острів, вул. Промислова, буд. 3",
  ];
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
  const defaults = {
    carriers: ["Тест — Перевізник 1", "Тест — Перевізник 2"],
    drivers: [
      { carrier: "Тест — Перевізник 1", name: "Тест — Водій 1" },
      { carrier: "Тест — Перевізник 2", name: "Тест — Водій 2" },
    ],
    vehicles: [
      {
        carrier: "Тест — Перевізник 1",
        name: "Тест — MAN TGL",
        plate: "AA 0001 XX",
      },
      {
        carrier: "Тест — Перевізник 2",
        name: "Тест — REF 10т",
        plate: "AA 0003 XX",
      },
    ],
  };
  const fleet = () => ({ ...defaults, ...get(F, {}) }),
    dw = (d) =>
      n(d.sourceWeight) ||
      n(d.calcWeight) ||
      n(d.weight) ||
      n(d.gross_weight_kg),
    dsum = (d) => n(d.sourceSum) || n(d.sum) || n(d.amount) || n(d.total);
  function td(t, docs) {
    const ds = RetailState.docsFor(t, docs),
      mat = ds.reduce((s, d) => s + n(d.calc), 0),
      fact =
        t.actualPallets !== "" && t.actualPallets != null
          ? n(t.actualPallets)
          : mat;
    return {
      t,
      ds,
      store: t.store || ds[0]?.store || "",
      address: t.storeAddress || ds[0]?.storeAddress || "",
      fact: r(fact),
      weight: r(ds.reduce((s, d) => s + dw(d), 0)),
      sum: r(ds.reduce((s, d) => s + dsum(d), 0)),
    };
  }
  function pts(route, docs, tickets) {
    return (route.ticketIds || [])
      .map((id) => tickets.find((t) => t.number === id))
      .filter(Boolean)
      .map((t) => td(t, docs));
  }
  function nextNo() {
    return (
      "R-" +
      String(
        Math.max(
          0,
          ...get(R).map(
            (x) => Number(String(x.number || "").replace(/\D/g, "")) || 0,
          ),
        ) + 1,
      ).padStart(3, "0")
    );
  }
  const money = (v) =>
    new Intl.NumberFormat("uk-UA", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(n(v)) + " грн";
  function styles() {
    if (document.getElementById("route-modal-v2")) return;
    document.head.insertAdjacentHTML(
      "beforeend",
      `<style id="route-modal-v2">.rd{display:grid;gap:14px}.rdbar{display:flex;justify-content:space-between;align-items:center;gap:12px}.rdbar h2{margin:0;font-size:24px}.rdbar p{margin:3px 0 0;color:#8394a7}.rdtable{overflow:auto;border:1px solid #293a4a;border-radius:12px;background:#0d1720}.rdtable table{width:100%;min-width:1100px;border-collapse:collapse}.rdtable th{font-size:10px;text-align:left;color:#8294a7;background:#111e29;padding:10px}.rdtable td{padding:12px 10px;border-top:1px solid #213241;font-size:12px}.rdtable tr:hover td{background:#111e29}.rdempty{padding:42px;text-align:center;color:#8495a7}.rtype{display:inline-block;padding:5px 8px;border:1px solid #6f2845;border-radius:20px;background:#321523;color:#f3b5cb;font-size:10px}.rmodal{position:fixed;inset:0;z-index:9999;background:#02060bd9;display:grid;place-items:center;padding:24px}.rbox{width:min(1180px,96vw);max-height:92vh;overflow:auto;background:#101a25;border:1px solid #34485b;border-radius:15px;box-shadow:0 30px 90px #000b}.rmhead{display:flex;justify-content:space-between;align-items:center;padding:17px 20px;border-bottom:1px solid #293b4b}.rmhead h2{margin:0}.rmclose{border:0!important;background:transparent!important;font-size:24px!important}.rmbody{padding:18px 20px}.rmsec{margin-bottom:18px}.rmsec h3{font-size:14px;margin:0 0 10px}.rmgrid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.rmfield small{display:block;color:#94a5b6;font-size:10px;font-weight:700;margin-bottom:4px}.rmfield input,.rmfield select{box-sizing:border-box;width:100%;height:38px;border:1px solid #354b60;border-radius:7px;background:#142330;color:#f5f8fb;padding:0 9px}.rmsplit{display:grid;grid-template-columns:360px 1fr;gap:14px}.rmpool,.rmselected{border:1px solid #2d4052;border-radius:10px;overflow:hidden}.rmsearch{padding:9px;border-bottom:1px solid #293b4b}.rmsearch input{width:100%;box-sizing:border-box;height:34px;background:#142330;border:1px solid #354b60;border-radius:7px;color:white;padding:0 9px}.rmlist{max-height:310px;overflow:auto}.rmi{display:grid;grid-template-columns:22px 1fr auto;gap:7px;padding:9px;border-bottom:1px solid #223343;align-items:center}.rmi small{color:#8496a8}.rmi strong{display:block;font-size:11px}.rmi span{text-align:right;font-size:10px}.rmselhead{display:flex;justify-content:space-between;padding:10px 12px;background:#111f2b}.rmselected table{width:100%;border-collapse:collapse}.rmselected th,.rmselected td{padding:8px;font-size:10px;border-top:1px solid #263848;text-align:left}.rmtotals{display:flex;gap:8px}.rmtot{border:1px solid #34495c;border-radius:8px;padding:7px 10px;background:#13212e}.rmtot small{display:block;color:#8193a5;font-size:9px}.rmfoot{display:flex;justify-content:flex-end;gap:9px;padding:13px 20px;border-top:1px solid #293b4b;background:#0d1720}@media(max-width:900px){.rmgrid{grid-template-columns:1fr 1fr}.rmsplit{grid-template-columns:1fr}}@media(max-width:560px){.rmgrid{grid-template-columns:1fr}}</style>`,
    );
  }
  function available() {
    const docs = get(D),
      used = new Set(get(R).flatMap((x) => x.ticketIds || []));
    return get(T)
      .filter((t) => t.status === "Скомплектовано" && !used.has(t.number))
      .map((t) => td(t, docs));
  }
  function openModal() {
    window.RetailRouteBuilderV7.open();
  }
  function render() {
    if (location.hash !== "#routes-page") return;
    styles();
    const host = document.getElementById("ops-documents");
    if (!host) return;
    host.hidden = false;
    host.style.display = "block";
    const routes = get(R),
      docs = get(D),
      tickets = get(T);
    host.innerHTML = `<div class="rd"><div class="rdbar"><div><h2>Довідник маршрутів</h2><p>Прямі та міжскладські маршрути Retail</p></div><button class="ops-primary" data-new>+ Сформувати маршрут</button></div><div class="rdtable">${
      routes.length
        ? `<table><thead><tr><th>Маршрут</th><th>Тип</th><th>Дата</th><th>Відправлення</th><th>Отримання</th><th>ТТ</th><th>Палет факт</th><th>Вага</th><th>Сума</th><th>Статус</th><th></th></tr></thead><tbody>${routes
            .map((x) => {
              const p = pts(x, docs, tickets),
                pal = r(p.reduce((s, y) => s + y.fact, 0)),
                kg = r(p.reduce((s, y) => s + y.weight, 0)),
                sum = p.reduce((s, y) => s + y.sum, 0);
              return `<tr data-route="${e(x.number)}"><td><b>${e(x.number)}</b></td><td><span class="rtype">${e(x.type || "Пряме поповнення")}</span></td><td>${e(x.date || "—")}</td><td>${e(x.warehouse || "—")}</td><td>${e(x.destinationWarehouse || (x.deliveryType === "interwarehouse" ? "—" : "Магазини WT"))}</td><td><b>${p.length}</b></td><td><b>${pal}</b></td><td>${kg} кг</td><td>${money(sum)}</td><td>${e(x.status || "Створено")}</td><td><button data-ttn>ТТН</button></td></tr>`;
            })
            .join("")}</tbody></table>`
        : '<div class="rdempty">Маршрутів ще немає.</div>'
    }</div></div>`;
    host.onclick = RetailState.guard((ev) => {
      if (ev.target.closest(".rdbar [data-new]")) openModal();
      const row = ev.target.closest("[data-route]");
      if (row && ev.target.closest("[data-ttn]"))
        window.dispatchEvent(
          new CustomEvent("retail:generate-route-ttn", {
            detail: { route: row.dataset.route },
          }),
        );
    });
    window.RetailInterwarehouse?.addon();
    window.dispatchEvent(new Event("retail:rendered"));
  }
  window.RetailRoutes = { render, createEmpty: openModal, openModal };
  window.addEventListener("hashchange", () =>
    setTimeout(RetailState.guard(render), 20),
  );
  document.addEventListener("DOMContentLoaded", () =>
    setTimeout(RetailState.guard(render), 80),
  );
  setTimeout(RetailState.guard(render), 120);
})();
