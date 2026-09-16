(() => {
  const D = "tc_retail_docs_v3",
    T = "tc_retail_tickets_v1",
    R = "tc_retail_routes_v1",
    FOCUS = "tc_retail_completed_focus";
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
  const weight = (d) => n(d.sourceWeight) || n(d.calcWeight) || n(d.weight);
  function data() {
    const docs = get(D),
      routes = get(R),
      used = new Set(routes.flatMap((x) => x.ticketIds || []));
    return get(T)
      .filter((t) => t.status === "Скомплектовано" && !used.has(t.number))
      .map((t) => {
        const ds = RetailState.docsFor(t, docs);
        const mat = ds.reduce((s, d) => s + n(d.calc), 0),
          fact =
            t.actualPallets !== "" && t.actualPallets != null
              ? n(t.actualPallets)
              : mat,
          goods = ds.reduce((s, d) => s + weight(d), 0);
        return {
          t,
          ds,
          store: ds[0]?.store || "",
          address: ds[0]?.storeAddress || "",
          warehouse: ds[0]?.senderWarehouse || "",
          mat: r(mat),
          fact: r(fact),
          goods: r(goods),
          total: r(goods + fact * 20),
        };
      });
  }
  function next() {
    const a = get(R),
      nums = a.map(
        (x) => Number(String(x.number || "").replace(/\D/g, "")) || 0,
      );
    return "R-" + String(Math.max(0, ...nums) + 1).padStart(3, "0");
  }
  function create(ids = []) {
    location.hash = "#routes-page";
    window.RetailRouteBuilderV7.open(ids);
  }
  function render() {
    if (location.hash !== "#completed") return;
    const h = document.getElementById("ops-documents");
    if (!h) return;
    const a = data(),
      focus = sessionStorage.getItem(FOCUS) || "";
    h.hidden = false;
    h.style.display = "block";
    h.innerHTML = `<div class="ops-page-title"><div><h2>Скомплектовано</h2><small>Готовий вантаж для розподілу по маршрутах</small></div><button class="ops-primary" data-create>+ Створити маршрут з обраних</button></div>${a.length ? `<table class="ops-register"><thead><tr><th><input type="checkbox" data-all></th><th>Талон</th><th>Магазин</th><th>Адреса</th><th>Склад</th><th>Документи</th><th>Мат. палети</th><th>Факт палети</th><th>Вага товару</th><th>Вага + палети</th></tr></thead><tbody>${a.map((x) => `<tr data-completed-ticket="${e(x.t.number)}" ${x.t.number === focus ? 'style="outline:2px solid #8d2940;background:#8d29401c"' : ""}><td><input type="checkbox" data-ticket value="${e(x.t.number)}" ${x.t.number === focus ? "checked" : ""}></td><td><b>${e(x.t.number)}</b></td><td>${e(x.store)}</td><td>${e(x.address)}</td><td>${e(x.warehouse)}</td><td>${x.ds.length}</td><td>${x.mat}</td><td><b>${x.fact}</b></td><td>${x.goods} кг</td><td><b>${x.total} кг</b></td></tr>`).join("")}</tbody></table>` : '<div style="padding:70px;text-align:center;color:#929aa5">Немає скомплектованих талонів, доступних для маршрутизації.</div>'}`;
    h.querySelector("[data-all]")?.addEventListener("change", (ev) =>
      h
        .querySelectorAll("[data-ticket]")
        .forEach((x) => (x.checked = ev.target.checked)),
    );
    h.querySelector("[data-create]").onclick = RetailState.guard(() => {
      const ids = [...h.querySelectorAll("[data-ticket]:checked")].map(
        (x) => x.value,
      );
      if (!ids.length)
        return alert("Оберіть хоча б один скомплектований талон.");
      create(ids);
    });
    if (focus) {
      setTimeout(
        () =>
          h
            .querySelector(`[data-completed-ticket="${CSS.escape(focus)}"]`)
            ?.scrollIntoView({ behavior: "smooth", block: "center" }),
        80,
      );
      sessionStorage.removeItem(FOCUS);
    }
  }
  window.RetailCompleted = {
    createEmpty: () => create([]),
    focusTicket: (no) => sessionStorage.setItem(FOCUS, String(no)),
  };
  window.addEventListener("hashchange", () =>
    setTimeout(RetailState.guard(render), 30),
  );
  setTimeout(RetailState.guard(render), 120);
})();
