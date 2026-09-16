(() => {
  let docs = RetailState.documents();
  let imports = RetailState.read("tc_retail_imports_v1");
  const selected = new Set();
  const money = (n) =>
    new Intl.NumberFormat("uk-UA", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Number(n) || 0);
  const rnd = (n, p = 3) => Math.round((Number(n) || 0) * 10 ** p) / 10 ** p;
  const save = () =>
    RetailState.commit({
      tc_retail_docs_v3: docs,
      tc_retail_imports_v1: imports,
    });
  function modal(html) {
    let m = document.getElementById("ops-modal");
    if (!m) {
      m = document.createElement("div");
      m.id = "ops-modal";
      document.body.append(m);
    }
    m.innerHTML = `<div class="ops-backdrop"></div><div class="ops-dialog">${html}<button class="ops-close">Закрити</button></div>`;
    m.className = "open";
    m.querySelector(".ops-backdrop").onclick = m.querySelector(
      ".ops-close",
    ).onclick = () => (m.className = "");
    return m;
  }
  function loadXLSX(cb) {
    if (window.XLSX) return cb();
    const s = document.createElement("script");
    s.src = "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js";
    s.onload = cb;
    s.onerror = () => alert("Не вдалося завантажити модуль Excel.");
    document.head.append(s);
  }
  const parseDate = (v) =>
    (String(v || "").match(/від\s+(\d{2}\.\d{2}\.\d{4})/i) || [])[1] || "";
  const normStore = (s) =>
    String(s || "")
      .replace(/^Склад\s*№?\d*\s*магазин\s*/i, "")
      .trim() || String(s || "").trim();
  function parseRows(rows) {
    let sender = "";
    const out = [];
    let cur = null;
    for (const r0 of rows) {
      const r = r0 || [];
      if (!r.some((v) => v !== null && v !== undefined && v !== "")) continue;
      if (
        typeof r[6] === "string" &&
        /^Склад\s/i.test(r[6]) &&
        !/^Лист відбору/i.test(r[6])
      ) {
        sender = r[6];
        continue;
      }
      const isDoc =
        (typeof r[6] === "string" && /^Лист відбору/i.test(r[6])) ||
        ((typeof r[1] === "number" || /^\d+$/.test(String(r[1] || ""))) &&
          typeof r[2] === "string" &&
          /^Склад/i.test(r[2]));
      if (isDoc) {
        cur = {
          id: String(r[1]),
          date: parseDate(r[6]),
          store: normStore(r[2]),
          receiverWarehouse: String(r[2] || ""),
          senderWarehouse: sender,
          sourcePallets: Number(r[3]) || 0,
          sourceWeight: Number(r[4]) || 0,
          qty: Number(r[8]) || 0,
          amount: Number(r[9]) || 0,
          fact: "",
          route: "",
          status: "Новий",
          workflowStatus: "new",
          lines: [],
        };
        out.push(cur);
        continue;
      }
      if (
        cur &&
        (typeof r[1] === "number" || /^\d{6,}$/.test(String(r[1] || ""))) &&
        typeof r[6] === "string"
      ) {
        const casesPal = Number(r[3]) || 0,
          unitsCase = Number(r[4]) || 0,
          unitWeight = Number(r[5]) || 0,
          qty = Number(r[8]) || 0,
          amount = Number(r[9]) || 0;
        cur.lines.push({
          sku: String(r[1]),
          barcode: String(r[2] || ""),
          casesPal,
          unitsCase,
          unitWeight,
          name: r[6],
          volume: String(r[7] || ""),
          qty,
          amount,
          pallets:
            casesPal && unitsCase ? rnd(qty / unitsCase / casesPal, 6) : 0,
          weight: rnd(qty * unitWeight, 3),
        });
      }
    }
    out.forEach((d) => {
      d.calc = rnd(
        d.lines.reduce((a, x) => a + x.pallets, 0),
        3,
      );
      d.calcWeight = rnd(
        d.lines.reduce((a, x) => a + x.weight, 0),
        3,
      );
      d.key = [d.id, d.date, d.senderWarehouse, d.receiverWarehouse].join("|");
      d.hash = JSON.stringify([
        d.amount,
        d.qty,
        d.calc,
        d.calcWeight,
        d.lines.map((x) => [x.sku, x.qty, x.amount]),
      ]);
    });
    return out;
  }
  function preview(incoming, fileName) {
    const old = new Map(docs.map((d) => [d.key, d]));
    let n = 0,
      same = 0,
      changed = 0;
    const rows = incoming.map((d) => {
      const e = old.get(d.key);
      let state = "Новий";
      if (!e) n++;
      else if (e.hash === d.hash) {
        same++;
        state = "Без змін";
      } else {
        changed++;
        state = "Змінено";
      }
      return { d, e, state };
    });
    const m = modal(
      `<h2>Перевірка первинної бази</h2><p><b>${fileName}</b> · ${incoming.length} документів</p><div class="ops-import"><span class="new">${n} нових</span><span>${same} без змін</span><span class="chg">${changed} змінених</span></div><p class="ops-hint">Палети системи — лише контрольне поле. Робочі палети перераховуються по товарних позиціях: кількість ÷ шт./кейс ÷ кейсів/палету.</p><table><thead><tr><th>Документ</th><th>Склад відправника</th><th>Склад отримувача</th><th>Палети системи</th><th>Палети розр.</th><th>Стан</th></tr></thead><tbody>${rows.map((x) => `<tr><td>№ ${x.d.id}</td><td>${x.d.senderWarehouse || "—"}</td><td>${x.d.receiverWarehouse || "—"}</td><td>${rnd(x.d.sourcePallets)}</td><td><b>${x.d.calc}</b></td><td>${x.state}</td></tr>`).join("")}</tbody></table><div class="ops-actions"><button class="ops-choice" data-import="skip">Імпортувати нові, існуючі пропустити</button><button class="ops-choice" data-import="update">Імпортувати нові та оновити змінені</button><button class="ops-choice secondary" data-import="cancel">Не завантажувати файл</button></div>`,
    );
    m.querySelector('[data-import="cancel"]').onclick = () =>
      (m.className = "");
    m.querySelector('[data-import="skip"]').onclick = () =>
      commit(rows, false, m, fileName, { n, same, changed });
    m.querySelector('[data-import="update"]').onclick = () =>
      commit(rows, true, m, fileName, { n, same, changed });
  }
  function commit(rows, update, m, fileName, stats) {
    const map = new Map(docs.map((d) => [d.key, d]));
    rows.forEach(({ d, state }) => {
      if (state === "Новий") map.set(d.key, d);
      else if (state === "Змінено" && update) {
        const prev = map.get(d.key);
        if (
          !prev ||
          !["routed", "ttn_created", "dispatched", "delivered"].includes(
            prev.workflowStatus || "",
          )
        )
          map.set(d.key, {
            ...d,
            fact: prev?.fact || "",
            route: prev?.route || "",
            status: prev?.status || "Новий",
            workflowStatus: prev?.workflowStatus || "new",
          });
      }
    });
    docs = [...map.values()];
    imports.unshift({
      fileName,
      at: new Date().toISOString(),
      total: rows.length,
      ...stats,
    });
    imports = imports.slice(0, 20);
    save();
    m.className = "";
    renderBase();
  }
  function chooseFile() {
    loadXLSX(() => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = ".xlsx,.xls";
      input.onchange = async () => {
        const f = input.files[0];
        if (!f) return;
        try {
          const wb = XLSX.read(await f.arrayBuffer(), {
            type: "array",
            cellDates: false,
          });
          const name = wb.SheetNames.includes("TDSheet")
            ? "TDSheet"
            : wb.SheetNames[0];
          const incoming = parseRows(
            XLSX.utils.sheet_to_json(wb.Sheets[name], {
              header: 1,
              raw: true,
              defval: null,
            }),
          );
          if (!incoming.length)
            return alert(
              "Документи не знайдені. Очікується первинний TDSheet.",
            );
          preview(incoming, f.name);
        } catch (e) {
          console.error(e);
          alert("Помилка читання Excel: " + e.message);
        }
      };
      input.click();
    });
  }
  function detail(d) {
    modal(
      `<h2>Документ № ${d.id}</h2><div class="ops-meta"><b>${d.store}</b><span>Дата: ${d.date || "—"}</span><span>Склад відправника: ${d.senderWarehouse || "—"}</span><span>Склад отримувача: ${d.receiverWarehouse || "—"}</span><span>Вага системи: ${d.sourceWeight} кг</span><span>Розрах. вага: ${d.calcWeight} кг</span><span>Палети системи: ${d.sourcePallets}</span><span><b>Палети розрах.: ${d.calc}</b></span><span>Палети факт: ${d.fact || "—"}</span><span>Сума: ${money(d.amount)} грн</span></div><table><thead><tr><th>Артикул</th><th>ШК</th><th>Номенклатура</th><th>К-ть</th><th>Шт/кейс</th><th>Кейс/пал</th><th>Палети</th><th>Вага</th><th>Сума</th></tr></thead><tbody>${d.lines.map((x) => `<tr><td>${x.sku}</td><td>${x.barcode}</td><td>${x.name}<small>${x.volume}</small></td><td>${x.qty}</td><td>${x.unitsCase}</td><td>${x.casesPal}</td><td><b>${rnd(x.pallets, 3)}</b></td><td>${x.weight} кг</td><td>${money(x.amount)}</td></tr>`).join("")}</tbody></table>`,
    );
  }
  function picked() {
    return docs.filter((d) => selected.has(d.key));
  }
  function action(type) {
    const a = picked();
    if (!a.length) return alert("Оберіть хоча б один документ");
    if (type === "ticket") {
      a.forEach((d) => {
        d.status = "На комплектації";
        d.workflowStatus = "picking";
      });
      save();
      renderConsolidation();
      modal(
        `<h2>Передано на комплектацію</h2><p>${a.length} документів · ${new Set(a.map((x) => x.store)).size} магазинів · ${rnd(
          a.reduce((s, x) => s + x.calc, 0),
          3,
        )} пал.</p>`,
      );
    } else if (type === "route")
      modal(
        `<h2>Формування маршруту</h2><p>${a.length} документів · ${rnd(
          a.reduce((s, x) => s + x.calc, 0),
          3,
        )} пал.</p><button class="ops-choice">Додати до існуючого маршруту</button><button class="ops-choice">Створити новий маршрут</button>`,
      );
    else if (type === "ttn")
      modal(
        `<h2>Формування ТТН</h2><p>Вибрано ${a.length} документів. ТТН формуються по магазинах із збереженням зв'язку з документами та маршрутом.</p><button class="ops-choice">Сформувати пакет ТТН</button>`,
      );
  }
  function host() {
    let h = document.getElementById("ops-documents");
    if (!h) {
      h = document.createElement("section");
      h.id = "ops-documents";
      h.className = "card ops-card";
      document.querySelector(".content").prepend(h);
    }
    return h;
  }
  function showOps() {
    document.querySelector(".dashboard")?.classList.add("ops-hidden");
    host().style.display = "block";
  }
  function renderBase() {
    docs = RetailState.documents();
    imports = RetailState.read("tc_retail_imports_v1");
    showOps();
    selected.clear();
    const h = host();
    h.innerHTML = `<div class="ops-page-title"><div><h2>База Excel</h2><small>Єдине місце завантаження первинного файлу із системи · TDSheet</small></div><button class="ops-primary" data-upload>＋ Завантажити первинний Excel</button></div><div class="ops-summary"><div><small>Документів у базі</small><strong>${docs.length}</strong></div><div><small>Останній файл</small><strong>${RetailState.esc(imports[0]?.fileName || "—")}</strong></div><div><small>Нових в останньому імпорті</small><strong>${imports[0]?.n ?? "—"}</strong></div><div><small>Змінених</small><strong>${imports[0]?.changed ?? "—"}</strong></div></div><div class="ops-section"><h3>Історія завантажень</h3>${imports.length ? `<table><thead><tr><th>Дата / час</th><th>Файл</th><th>Документів</th><th>Нових</th><th>Без змін</th><th>Змінених</th></tr></thead><tbody>${imports.map((i) => `<tr><td>${new Date(i.at).toLocaleString("uk-UA")}</td><td><b>${RetailState.esc(i.fileName)}</b></td><td>${i.total}</td><td>${i.n}</td><td>${i.same}</td><td>${i.changed}</td></tr>`).join("")}</tbody></table>` : `<div class="ops-empty">Первинні файли ще не завантажувалися.</div>`}</div>`;
    h.querySelector("[data-upload]").onclick = () =>
      window.RetailImport.upload();
    window.RetailImport?.enhance();
    window.dispatchEvent(new Event("retail:rendered"));
  }
  function renderConsolidation() {
    showOps();
    const h = host();
    h.innerHTML = `<div class="ops-page-title"><div><h2>Консолідація документів</h2><small>${docs.length} документів · відбір для комплектації, маршрутизації та ТТН</small></div><div class="ops-toolbar"><button data-act="ticket">Передати на комплектацію</button><button data-act="route">Сформувати маршрут</button><button data-act="ttn">Сформувати ТТН</button></div></div><div class="ops-filters"><button class="on">Усі ${docs.length}</button><button>Нові ${docs.filter((d) => d.workflowStatus === "new").length}</button><button>На комплектації ${docs.filter((d) => d.workflowStatus === "picking").length}</button><button>У маршруті ${docs.filter((d) => d.workflowStatus === "routed").length}</button><button>ТТН сформовано ${docs.filter((d) => d.workflowStatus === "ttn_created").length}</button></div>${docs.length ? `<table class="ops-register"><thead><tr><th></th><th>Документ</th><th>Магазин / отримувач</th><th>Склад відправника</th><th>Склад отримувача</th><th>Сума</th><th>Вага</th><th>Палети системи</th><th>Палети розр.</th><th>Палети факт</th><th>Маршрут</th><th>Статус</th></tr></thead><tbody>${docs.map((d) => `<tr><td><input type="checkbox" data-id="${d.key}" ${selected.has(d.key) ? "checked" : ""}></td><td><button class="ops-link" data-doc="${d.key}">№ ${d.id}</button><small>${d.date}</small></td><td><b>${d.store}</b></td><td>${d.senderWarehouse || "—"}</td><td>${d.receiverWarehouse || "—"}</td><td>${money(d.amount)}</td><td>${d.calcWeight} кг</td><td class="ops-source">${rnd(d.sourcePallets)}</td><td><b>${d.calc}</b></td><td><input class="ops-fact" data-fact="${d.key}" type="number" min="0" step="0.01" value="${d.fact || ""}"></td><td>${d.route || "Не призначено"}</td><td><span class="tag gray">${d.status}</span></td></tr>`).join("")}</tbody></table>` : `<div class="ops-empty">База порожня. Спочатку завантажте первинний файл у розділі «База Excel».</div>`}`;
    h.querySelectorAll("[data-id]").forEach(
      (x) =>
        (x.onchange = () =>
          x.checked
            ? selected.add(x.dataset.id)
            : selected.delete(x.dataset.id)),
    );
    h.querySelectorAll("[data-doc]").forEach(
      (x) =>
        (x.onclick = () => detail(docs.find((d) => d.key === x.dataset.doc))),
    );
    h.querySelectorAll("[data-fact]").forEach(
      (x) =>
        (x.onchange = () => {
          docs.find((d) => d.key === x.dataset.fact).fact = x.value;
          save();
        }),
    );
    h.querySelector('[data-act="ticket"]').onclick = () => action("ticket");
    h.querySelector('[data-act="route"]').onclick = () => action("route");
    h.querySelector('[data-act="ttn"]').onclick = () => action("ttn");
  }
  function home() {
    host().style.display = "none";
    document.querySelector(".dashboard")?.classList.remove("ops-hidden");
  }
  function wireNav() {
    const links = [...document.querySelectorAll(".side nav a")];
    const inbound = links.find(
      (a) => a.textContent.trim() === "Вхідні вантажі",
    );
    if (inbound) {
      inbound.querySelector("span").textContent = "База Excel";
      inbound.href = "#base-excel";
    }
    const cons = links.find((a) => a.textContent.trim() === "Консолідація");
    if (cons) cons.href = "#consolidation";
    const ticket = links.find(
      (a) => a.textContent.trim() === "Талони комплектації",
    );
    if (ticket) ticket.href = "#consolidation";
    const ttn = links.find((a) => a.textContent.trim() === "ТТН");
    if (ttn) ttn.href = "#consolidation";
    links.forEach((a) =>
      a.addEventListener("click", () => setTimeout(routeView, 0)),
    );
  }
  function routeView() {
    const hash = location.hash;
    if (hash === "#base-excel") renderBase();
    else if (hash === "#consolidation" || hash === "#documents")
      renderConsolidation();
    else if (!hash || hash === "#home") home();
  }
  function css() {
    const s = document.createElement("style");
    s.textContent = `.ops-hidden{display:none!important}.ops-card{margin-bottom:14px;overflow:auto;min-height:650px}.ops-page-title{display:flex;justify-content:space-between;align-items:center;padding:20px 22px;border-bottom:1px solid #2c333b}.ops-page-title h2{margin:0 0 4px;font-size:20px}.ops-page-title small{opacity:.55}.ops-primary,.ops-toolbar button,.ops-choice{background:#8d1233;color:#fff;border:1px solid #b62a50;border-radius:8px;padding:9px 13px;cursor:pointer}.ops-toolbar{display:flex;gap:8px}.ops-summary{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;padding:18px 22px}.ops-summary>div{background:#141b22;border:1px solid #303943;border-radius:10px;padding:15px;display:flex;flex-direction:column;gap:8px}.ops-summary small{opacity:.6}.ops-summary strong{font-size:20px}.ops-section{padding:0 22px 22px}.ops-filters{display:flex;gap:8px;padding:14px 22px}.ops-filters button{background:#171e26;color:#d8dde3;border:1px solid #2b343e;border-radius:8px;padding:7px 11px}.ops-filters .on{background:#81132f;border-color:#a21c40}.ops-register{min-width:1550px}.ops-card table{width:100%;border-collapse:collapse}.ops-card th,.ops-card td{padding:9px 10px;border-bottom:1px solid #28313a;text-align:left;vertical-align:middle}.ops-card th{font-size:11px;opacity:.65}.ops-card td{font-size:12px}.ops-card td small,.ops-dialog small{display:block;opacity:.55}.ops-link{background:none;border:0;color:#e58ca4;font-weight:700;cursor:pointer}.ops-fact{width:58px;background:#17191e;border:1px solid #3b3d44;color:#fff;border-radius:6px;padding:5px}.ops-source{opacity:.55}.ops-empty{padding:42px;text-align:center;opacity:.65}#ops-modal{display:none}#ops-modal.open{display:block;position:fixed;inset:0;z-index:9999}.ops-backdrop{position:absolute;inset:0;background:#000c}.ops-dialog{position:relative;margin:5vh auto;background:#17191e;border:1px solid #49323a;border-radius:14px;width:min(1180px,94vw);max-height:88vh;overflow:auto;padding:22px;color:#eee}.ops-meta{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;background:#111318;padding:12px;border-radius:10px;margin-bottom:15px}.ops-dialog table{width:100%;border-collapse:collapse;margin-bottom:15px}.ops-dialog th,.ops-dialog td{padding:8px;border-bottom:1px solid #303238;text-align:left}.ops-close{background:#333740;color:#fff;border:0;border-radius:7px;padding:8px 14px}.ops-choice{display:block;margin:10px 0;width:340px}.ops-choice.secondary{background:#292c33;border-color:#41444c}.ops-hint{opacity:.7}.ops-import{display:flex;gap:12px;flex-wrap:wrap;margin:15px 0}.ops-import span{padding:8px 10px;border:1px solid #3b3d44;border-radius:7px}.ops-import .new{border-color:#2e7d58}.ops-import .chg{border-color:#a06b2d}@media(max-width:1100px){.ops-summary{grid-template-columns:1fr 1fr}.ops-meta{grid-template-columns:1fr 1fr}}`;
    document.head.append(s);
  }
  css();
  host();
  window.RetailOperations = { renderBase };
  window.addEventListener("hashchange", RetailState.guard(routeView));
  routeView();
})();
