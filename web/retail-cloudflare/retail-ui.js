/* Presentation for the approved UI v1. Operational writes use existing services/state. */
(() => {
  "use strict";
  const S = RetailState,
    D = "tc_retail_docs_v3",
    T = "tc_retail_tickets_v1",
    R = "tc_retail_routes_v1",
    J = "tc_retail_ttn_journal_v1",
    F = "tc_retail_fleet_v1";
  const e = S.esc,
    n = (x) => Number(x) || 0,
    fmt = (x, p = 0) =>
      Number(x || 0).toLocaleString("uk-UA", { maximumFractionDigits: p }),
    read = (k, d = []) => S.read(k, d),
    docs = () => S.documents(),
    tickets = () => read(T),
    routes = () => read(R),
    done = (t) =>
      t.pickingStatus === "completed" || t.status === "Скомплектовано";
  const filters = {},
    selected = {},
    focus = {},
    pageNo = {},
    tabs = {},
    subtabs = {},
    results = {},
    routeDraft = {};
  try {
    Object.assign(
      routeDraft,
      JSON.parse(sessionStorage.getItem("retail_ui_draft_v1") || "{}"),
    );
  } catch {}
  let active = "",
    host,
    busy = false;
  const paths = {
    file: "M6 2h8l6 6v14H6z M14 2v7h6 M9 13h8 M9 17h8",
    box: "M3 7l9-5 9 5v11l-9 5-9-5z M3 7l9 5 9-5 M12 12v11 M7 4l10 6",
    store: "M3 10h18l-2-7H5z M5 11v10h14V11 M9 21v-7h6v7",
    chart: "M4 21V11h3v10 M10 21V4h3v17 M16 21V8h3v13",
    clock: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18 M12 7v5l4 3",
    print: "M6 8V2h12v6 M6 17H3V9h18v8h-3 M6 14h12v8H6z M17 11h1",
    truck:
      "M2 6h12v12H2z M14 10h5l3 4v4h-8 M6 16a3 3 0 1 0 0 6 3 3 0 0 0 0-6 M18 16a3 3 0 1 0 0 6 3 3 0 0 0 0-6",
    check: "M4 12l5 5L21 5 M22 12a10 10 0 1 1-9-10",
    search: "M10 3a7 7 0 1 0 0 14 7 7 0 0 0 0-14 M15 15l7 7",
    upload:
      "M7 17H5a4 4 0 0 1-1-8 8 8 0 0 1 16-1 5 5 0 0 1-1 9h-2 M12 22V10 M7 15l5-5 5 5",
    calendar: "M3 5h18v17H3z M3 10h18 M7 2v6 M17 2v6 M7 14h3 M14 14h3 M7 18h3",
    save: "M3 3h15l3 3v16H3z M7 3v7h10V3 M7 22v-8h10v8",
    coins:
      "M3 6c0-5 18-5 18 0s-18 5-18 0 M3 6v6c0 5 18 5 18 0V6 M3 12v6c0 5 18 5 18 0v-6",
    route: "M5 3v12a4 4 0 0 0 8 0V9a4 4 0 0 1 8 0v12 M2 3h6 M18 21h6",
    weight: "M7 6h10l5 16H2z M9 6V2h6v4",
  };
  const icon = (k) =>
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[k] || paths.file}"/></svg>`;
  const btn = (text, action, cls = "", attr = "") =>
    `<button type="button" class="${cls}" data-action="${action}" ${attr}>${text}</button>`;
  const pill = (text, color = "") =>
    `<span class="ui-pill ${color}">${e(text)}</span>`;
  const opt = (xs, value = "") =>
    `<option value="">Усі</option>` +
    xs
      .filter(Boolean)
      .filter((v, i, a) => a.indexOf(v) === i)
      .map(
        (v) =>
          `<option ${v === value ? "selected" : ""} value="${e(v)}">${e(v)}</option>`,
      )
      .join("");
  const date = (x) => {
      if (!x) return "—";
      const d = new Date(x);
      return Number.isNaN(d.getTime())
        ? String(x).slice(0, 10)
        : d.toLocaleDateString("uk-UA");
    },
    time = (x) => (x ? new Date(x).toLocaleString("uk-UA") : "—");
  const setFor = (k) => selected[k] || (selected[k] = new Set()),
    filterFor = (k) => filters[k] || (filters[k] = {}),
    sum = (a, f) => a.reduce((s, x) => s + n(f(x)), 0);
  function info(t) {
    const ds = S.docsFor(t, docs()),
      goods = sum(ds, (d) => d.sourceWeight || d.calcWeight || d.weight),
      fact =
        t.actualPallets == null || t.actualPallets === ""
          ? null
          : n(t.actualPallets);
    return {
      t,
      ds,
      store: t.store || ds[0]?.store || "",
      address: t.storeAddress || ds[0]?.storeAddress || "",
      warehouse: ds[0]?.senderWarehouse || "",
      mat: sum(ds, (d) => d.calc),
      fact,
      goods,
      weight: goods + (fact || 0) * 20,
    };
  }
  function hero(title, sub, kind = "warehouse", eyebrow = "ОПЕРАЦІЙНИЙ БЛОК") {
    return `<section class="ui-hero ${kind}"><div>${active === "picking-tickets" || active === "completed" ? "" : `<small>${e(eyebrow)}</small>`}<h2>${title}</h2><p>${sub}</p></div><aside>КОНТРОЛЬ<br>ГОТОВНІСТЬ<br>СКЛАДИ<br>КОМПЛЕКТАЦІЯ <em>●</em><br>ВІДВАНТАЖЕННЯ</aside></section>`;
  }
  function kpis(items) {
    return `<div class="ui-kpis">${items.map(([value, label, color, ic, sub]) => `<div class="ui-kpi ${color}"><div class="ui-symbol">${icon(ic)}</div><div><strong>${e(value)}</strong><b>${label}</b><small>${sub || ""}</small></div></div>`).join("")}</div>`;
  }
  function table(headers, body) {
    return `<div class="ui-table-scroll"><table class="ui-table"><thead><tr>${headers.map((h) => `<th>${h}</th>`).join("")}</tr></thead><tbody>${body || `<tr><td colspan="${headers.length}"><div class="ui-empty">Записів ще немає</div></td></tr>`}</tbody></table></div>`;
  }
  function pagination(total, k) {
    const page = pageNo[k] || 1;
    return `<div class="ui-pagination"><span>Вибрано: ${setFor(k).size} з ${total}</span><span>Рядків на сторінці: <select data-page-size><option>25</option></select></span><span>${total ? (page - 1) * 25 + 1 : 0} – ${Math.min(page * 25, total)} з ${total}</span><div>${btn("‹", "prev", "ghost", page <= 1 ? "disabled" : "")}${btn("›", "next", "ghost", page * 25 >= total ? "disabled" : "")}</div></div>`;
  }
  function filterBar(k, a, actions = "", statusOptions = []) {
    const f = filterFor(k);
    return `<div class="ui-filter"><label class="search">Пошук<input data-filter="q" value="${e(f.q || "")}" placeholder="№ документа, талона, магазин, адреса…"></label><label>Період (дата документа)<input type="date" data-filter="from" value="${e(f.from || "")}" aria-label="Початок періоду"></label><label>До<input type="date" data-filter="to" value="${e(f.to || "")}" aria-label="Кінець періоду"></label><label>Склад<select data-filter="warehouse">${opt(
      a.map((x) => x.warehouse || x.senderWarehouse),
      f.warehouse,
    )}</select></label><label>Магазин<select data-filter="store">${opt(
      a.map((x) => x.store),
      f.store,
    )}</select></label>${statusOptions.length ? `<label>Статус<select data-filter="status">${opt(statusOptions, f.status)}</select></label>` : ""}<div class="ui-actions">${actions}${btn("↻ Скинути", "reset", "compact")}</div></div>`;
  }
  function filtered(a, k) {
    const f = filterFor(k);
    return a.filter((x) => {
      const d = x.t || x,
        txt = [d.id, d.number, x.store, x.address, x.senderWarehouse]
          .join(" ")
          .toLowerCase(),
        raw = d.date || d.createdAt || "",
        iso = /^\d{2}\.\d{2}\.\d{4}/.test(raw)
          ? raw.slice(0, 10).split(".").reverse().join("-")
          : raw.slice(0, 10);
      return (
        (!f.q || txt.includes(f.q.toLowerCase())) &&
        (!f.warehouse || (x.warehouse || x.senderWarehouse) === f.warehouse) &&
        (!f.store || x.store === f.store) &&
        (!f.from || iso >= f.from) &&
        (!f.to || iso <= f.to) &&
        (!f.status || x.uiStatus === f.status)
      );
    });
  }
  function tabsBar(k, list) {
    const chosen = tabs[k] || "all";
    return `<div class="ui-tabs">${list.map(([id, label, count]) => btn(`${e(label)}${count != null ? `<b>${count}</b>` : ""}`, "tab", chosen === id ? "active" : "", `data-tab="${id}"`)).join("")}</div>`;
  }
  function dashboard() {
    const ds = docs(),
      ts = tickets(),
      rs = routes(),
      stores = RetailDirectories.stores(),
      delivered = rs.filter((r) => r.deliveredAt),
      costs = rs.filter((r) => r.tariff !== "" && r.tariff != null),
      pallets = sum(ds, (d) => d.calc),
      start = filterFor("home").week
        ? new Date(filterFor("home").week + "T12:00:00")
        : new Date();
    start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
    start.setHours(0, 0, 0, 0);
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      return d;
    });
    const values = days.map((day) =>
        sum(
          ds.filter((d) => date(d.date) === date(day)),
          (d) => d.calc,
        ),
      ),
      max = Math.max(1, ...values);
    const byStore = new Map(),
      storeCounts = new Map();
    ts.forEach((t) => {
      const x = info(t);
      byStore.set(x.store, (byStore.get(x.store) || 0) + (x.fact ?? x.mat));
      storeCounts.set(x.store, (storeCounts.get(x.store) || 0) + 1);
    });
    byStore.forEach((v, k) => byStore.set(k, v / storeCounts.get(k)));
    const top = [...byStore]
      .sort((a, b) =>
        filterFor("home").volume === "lowest" ? a[1] - b[1] : b[1] - a[1],
      )
      .slice(0, filterFor("home").volume === "all" ? 39 : 10);
    const delivery = delivered
      .map((r) => {
        const dd = ds
          .filter((d) => d.route === r.number)
          .map((d) => new Date(d.date).getTime())
          .filter(Number.isFinite);
        return dd.length
          ? (new Date(r.deliveredAt) - Math.min(...dd)) / 86400000
          : null;
      })
      .filter((x) => x != null);
    const leadTimes = new Map();
    delivered.forEach((r) => {
      const grouped = new Map();
      ds.filter((d) => d.route === r.number).forEach((d) => {
        const t = new Date(d.date).getTime();
        if (Number.isFinite(t))
          grouped.set(d.store, Math.min(grouped.get(d.store) ?? Infinity, t));
      });
      grouped.forEach((t, store) => {
        const days = (new Date(r.deliveredAt) - t) / 86400000;
        if (days >= 0) {
          const a = leadTimes.get(store) || [];
          a.push(days);
          leadTimes.set(store, a);
        }
      });
    });
    const storeTimes = [...leadTimes]
      .map(([store, a]) => [store, sum(a, (x) => x) / a.length])
      .sort((a, b) => b[1] - a[1]);
    const average = delivery.length
      ? fmt(sum(delivery, (x) => x) / delivery.length, 1)
      : "—";
    return (
      hero(
        'БІЛЬШЕ МОЖЛИВОСТЕЙ<br><span style="color:#acc5d4">ДЛЯ РОЗВИТКУ</span> <span style="color:#ec2557">РАЗОМ</span>',
        "Точна логістика. Реальні результати.",
        "truck",
        "НАДІЙНІ ПОСТАВКИ · СТАБІЛЬНА МЕРЕЖА",
      ).replace(
        "</section>",
        `<input class="ui-week" type="date" aria-label="Тиждень Dashboard" data-filter="week" value="${filterFor("home").week || S.today()}"></section>`,
      ) +
      kpis([
        [
          fmt(
            sum(values, (x) => x),
            2,
          ),
          "Палет на доставку",
          "red",
          "box",
          "на цьому тижні",
        ],
        [ds.length, "Документів", "blue", "file", "на доставку"],
        [
          stores.length,
          "Магазинів WT",
          "orange",
          "store",
          "у доставці / у мережі",
        ],
        [average, "Середній термін доставки", "green", "clock", "днів"],
        [
          costs.length ? fmt(sum(costs, (x) => x.tariff)) + " ₴" : "—",
          "Витрати на доставку",
          "purple",
          "coins",
          "за даними маршрутів",
        ],
      ]) +
      `<div class="ui-dashboard-grid"><section class="ui-panel"><div class="ui-panel-head"><span>${icon("calendar")}Палети на доставку по днях</span><small>За тиждень: ${fmt(sum(values, (x) => x))} палет</small></div><div class="ui-chart">${days.map((day, i) => `<div class="ui-chart-col"><b>${fmt(values[i], 1)}</b><i style="height:${Math.max(3, (values[i] / max) * 165)}px"></i><small>${["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Нд"][i]}<br>${date(day).slice(0, 5)}</small></div>`).join("")}</div></section><section class="ui-panel"><div class="ui-panel-head"><span>${icon("clock")}Середній термін доставки по магазинах</span><select class="ui-control"><option>Топ 7</option></select></div>${
        delivery.length
          ? `<div class="ui-horizontal">${storeTimes
              .slice(0, 7)
              .map(
                ([name, duration]) =>
                  `<div><span>${e(name)}</span><i><em style="width:${Math.max(2, (duration / Math.max(1, ...storeTimes.map((x) => x[1]))) * 100)}%"></em></i><b>${fmt(duration, 1)} дн.</b></div>`,
              )
              .join("")}</div>`
          : '<div class="ui-empty">Дані з’являться після фактичної доставки.<br>Від першого документа до дати доставки.</div>'
      }</section></div><div class="ui-bottom-grid"><section class="ui-panel"><div class="ui-panel-head"><span>${icon("chart")}Середні об’єми по магазинах</span><div>${pill("Палети")}<select data-filter="volume"><option value="top" ${filterFor("home").volume === "top" ? "selected" : ""}>Топ 10</option><option value="lowest" ${filterFor("home").volume === "lowest" ? "selected" : ""}>Найменші 10</option><option value="all" ${filterFor("home").volume === "all" ? "selected" : ""}>Усі магазини</option></select></div></div>${top.length ? `<div class="ui-chart">${top.map(([name, value]) => `<div class="ui-chart-col"><b>${fmt(value, 1)}</b><i style="height:${Math.max(3, (value / Math.max(...top.map((x) => x[1]), 1)) * 135)}px"></i><small>${e(name)}</small></div>`).join("")}</div>` : '<div class="ui-empty">Немає даних за обраний період</div>'}</section><section class="ui-panel"><div class="ui-panel-head">${icon("coins")}Аналітика витрат ${btn("По магазинах", "store-costs", "compact")}</div><div class="ui-dashboard-notes"><div><b>${stores.length}</b><small>Магазинів у мережі</small></div><div><b>${top.length ? fmt(pallets / Math.max(top.length, 1), 1) : "—"}</b><small>Середній об’єм на магазин (палет)</small></div><div><b>${costs.length ? fmt(sum(costs, (x) => x.tariff)) + " ₴" : "—"}</b><small>Вартість доставки за маршрутами</small></div></div></section></div>`
    );
  }
  function base() {
    const ds = docs(),
      assigned = new Set(
        tickets().flatMap((t) => S.docsFor(t, ds).map(S.docKey)),
      ),
      all = ds.map((d) => ({
        ...d,
        uiStatus: assigned.has(S.docKey(d))
          ? "Переданий на комплектацію"
          : "Новий",
      })),
      a = filtered(all, "base-excel"),
      page = pageNo[active] || 1;
    return (
      hero(
        'ІНФОРМАЦІЯ З БАЗИ<br>ЛИСТИ <span style="color:#f22452">ВІДБОРУ</span>',
        "Актуальні документи з системи. Готові до комплектації.",
        "warehouse",
        "ЄДИНЕ ДЖЕРЕЛО ДАНИХ",
      ) +
      kpis([
        [ds.length, "Листів відбору", "red", "file"],
        [RetailDirectories.stores().length, "Магазини WT", "orange", "store"],
        [
          fmt(
            sum(ds, (d) => d.calc),
            3,
          ),
          "Математичних палет",
          "blue",
          "truck",
        ],
        [
          fmt(
            sum(ds, (d) => d.sourceWeight || d.calcWeight),
            1,
          ) + " кг",
          "Вага (брутто)",
          "purple",
          "weight",
        ],
        [
          fmt(sum(ds, (d) => d.sourceSumNoVat ?? d.amount)) + " ₴",
          "Сума (без ПДВ)",
          "green",
          "coins",
        ],
      ]) +
      `<div class="ui-upload-wrap"><button class="ui-upload" data-action="upload" data-upload>${icon("upload")}<span><strong>Завантажити первинний Excel</strong><small>Перетягніть файл сюди або натисніть для вибору<br>Підтримуються формати .xls, .xlsx</small></span></button></div>` +
      filterBar(active, all, btn("Очистити дані", "clear", "danger"), [
        "Новий",
        "Переданий на комплектацію",
      ]) +
      `<section class="ui-panel ui-list-panel"><div class="ui-panel-head"><span>${icon("file")}Документи з системи (Лист відбору)</span><div>${btn("Передати на комплектацію", "transfer", "primary", ` ${setFor(active).size ? "" : "disabled"}`)} <small>Всього: ${a.length} документів</small></div></div>` +
      table(
        [
          '<input type="checkbox" data-select-all aria-label="Вибрати всі">',
          "№ документа",
          "Дата документа",
          "Дата завантаження",
          "Магазин / ТТ",
          "Склад",
          "К-ть поз.",
          "Палети (мат.)",
          "Вага (кг)",
          "Сума без ПДВ",
          "Статус",
          "",
        ],
        a
          .slice((page - 1) * 25, page * 25)
          .map(
            (d) =>
              `<tr class="${setFor(active).has(S.docKey(d)) ? "selected" : ""}"><td><input type="checkbox" data-select="${e(S.docKey(d))}" ${setFor(active).has(S.docKey(d)) ? "checked" : ""}></td><td class="no-wrap">${btn("ЛВ-" + e(d.id), "doc", "ghost", `data-id="${e(S.docKey(d))}"`)}</td><td>${e(date(d.date))}</td><td>${e(time(d.loadedAt || d.importedAt || d.uploadedAt))}</td><td>${e(d.store)}</td><td>${e(d.senderWarehouse)}</td><td>${(d.lines || []).length}</td><td>${fmt(d.calc, 3)}</td><td>${fmt(d.sourceWeight || d.calcWeight, 2)}</td><td>${fmt(d.sourceSumNoVat ?? d.amount, 2)}</td><td>${pill(d.uiStatus, assigned.has(S.docKey(d)) ? "orange" : "")}</td><td>⋯</td></tr>`,
          )
          .join(""),
      ) +
      pagination(a.length, active) +
      "</section>"
    );
  }
  function drawer(x, completed = false) {
    if (!x) return "";
    const { t, ds } = x,
      sub = subtabs[active] || "lines",
      lines = RetailPickingTickets.groupLines(ds),
      isDone = done(t);
    return `<aside class="ui-panel ui-drawer"><div class="ui-panel-head"><span>${icon("file")}Деталі талона</span>${btn("×", "close-drawer", "ghost")}</div><div class="ui-drawer-title"><span style="color:#eb0644">${icon("file")}</span><div><h3>${e(t.number)} ${pill(isDone ? "Скомплектовано" : "Новий", isDone ? "green" : "")}</h3><p>${e(x.store)}<br>${e(x.address)}</p></div></div><div class="ui-mini-grid"><div><small>Документи</small><b>${ds.length}</b></div><div><small>Мат. палети</small><b>${fmt(x.mat, 3)}</b></div><div><small>Факт палети</small>${completed ? `<b>${fmt(x.fact, 2)}</b>` : `<input type="number" data-ap min="0" step="0.01" value="${e(t.actualPallets ?? "")}" ${isDone ? "disabled" : ""}>`}</div><div><small>Статус друку</small><b style="color:#00dca4">${t.printStatus === "printed" ? "Так" : "Ні"}</b></div></div>${!completed ? `<div class="ui-result"><span>Результат комплектації</span>${btn("✓ Зібрано без змін", "result", results[t.number] === "unchanged" || t.completionResult === "unchanged" ? "success" : "", `data-result="unchanged" ${isDone ? "disabled" : ""}`)}${btn("△ Зібрано зі змінами", "result", results[t.number] === "changed" || t.completionResult === "changed" ? "success" : "", `data-result="changed" ${isDone ? "disabled" : ""}`)}</div>` : ""}<div class="ui-tabs">${[
      ["lines", "Товарні позиції (" + lines.length + ")"],
      ["docs", "Документи (" + ds.length + ")"],
      ["history", "Історія"],
    ]
      .map(([id, label]) =>
        btn(label, "subtab", sub === id ? "active" : "", `data-sub="${id}"`),
      )
      .join(
        "",
      )}</div>${sub === "lines" ? table(["Артикул", "Магазин", "Найменування", "План", "Факт", "Різниця", "Вага", "Мат. палети"], lines.map((l) => `<tr><td>${e(l.sku)}</td><td>${e(l.barcode)}</td><td>${e(l.name)}</td><td>${l.qty}</td><td>${completed || isDone ? e(t.picked?.[l.sku] ?? l.qty) : `<input class="ui-fact" data-sku="${e(l.sku)}" type="number" min="0" max="${l.qty}" value="${e(t.picked?.[l.sku] ?? "")}">`}</td><td>${t.picked?.[l.sku] == null ? "—" : fmt(n(t.picked[l.sku]) - l.qty)}</td><td>${fmt(l.weight, 2)}</td><td>${fmt(l.pallets, 4)}</td></tr>`).join("")) : sub === "docs" ? ds.map((d) => `<div class="ui-info-row"><span>Лист відбору ${e(d.id)}</span><b>${e(date(d.date))} · ${fmt(d.calc, 3)} пал.</b></div>`).join("") : `<div class="ui-info-row"><span>Створено</span><b>${e(time(t.createdAt))}</b></div><div class="ui-info-row"><span>Скомплектовано</span><b>${e(time(t.completedAt))}</b></div><div class="ui-info-row"><span>Результат</span><b>${t.completionResult === "changed" ? "Зібрано зі змінами" : t.completionResult === "unchanged" ? "Зібрано без змін" : "—"}</b></div>`}<div class="ui-drawer-footer">${completed ? btn("Передрук", "print-one") + btn("Експорт Excel", "excel-one") : btn("Скасувати", "close-drawer") + btn("Зберегти зміни", "save-ticket", "primary", isDone ? "disabled" : "")}</div></aside>`;
  }
  function picking(completed = false) {
    const k = active,
      all = tickets()
        .map(info)
        .filter((x) => !completed || done(x.t)),
      used = new Set(routes().flatMap((r) => r.ticketIds || [])),
      a = filtered(all, k).filter((x) => {
        const tab = tabs[k] || "all";
        return (
          tab === "all" ||
          (tab === "new" && !done(x.t) && x.t.printStatus !== "printed") ||
          (tab === "unprinted" && x.t.printStatus !== "printed") ||
          (tab === "printed" && x.t.printStatus === "printed") ||
          (tab === "done" && done(x.t)) ||
          (tab === "unchanged" && x.t.completionResult === "unchanged") ||
          (tab === "changed" && x.t.completionResult === "changed") ||
          (tab === "waiting" && !used.has(x.t.number)) ||
          (tab === "planned" && used.has(x.t.number))
        );
      });
    if (focus[k] === undefined) focus[k] = a[0]?.t.number || "";
    const x = all.find((x) => x.t.number === focus[k]),
      ts = tickets(),
      doneCount = ts.filter(done).length;
    const stats = completed
      ? [
          [all.length, "Скомплектовано сьогодні", "green", "check"],
          [
            fmt(sum(all, (x) => x.fact)),
            "Палет (факт) сьогодні",
            "orange",
            "box",
          ],
          [
            new Set(all.map((x) => x.store)).size,
            "Магазини сьогодні",
            "red",
            "store",
          ],
          [sum(all, (x) => x.ds.length), "Документи сьогодні", "blue", "file"],
          [
            all.filter((x) => used.has(x.t.number)).length,
            "Передано в маршрути",
            "purple",
            "truck",
          ],
        ]
      : [
          [ts.length, "Талонів всього", "red", "file"],
          [
            ts.filter((t) => !done(t) && t.printStatus !== "printed").length,
            "Нові",
            "blue",
            "file",
          ],
          [
            ts.filter((t) => !done(t) && t.printStatus === "printed").length,
            "В роботі",
            "orange",
            "file",
          ],
          [doneCount, "Скомплектовано", "green", "print"],
          [
            `${fmt(
              sum(
                all.filter((x) => done(x.t)),
                (x) => x.fact,
              ),
            )} / ${fmt(sum(all, (x) => x.mat))}`,
            "Палет скомплектовано",
            "green",
            "check",
            "загальний прогрес",
          ],
        ];
    const actions = completed
      ? btn(
          `Передати в планування · ${setFor(active).size} ТТ / ${fmt(
            sum(
              all.filter((x) => setFor(active).has(x.t.number)),
              (x) => x.fact,
            ),
            2,
          )} пал / ${fmt(
            sum(
              all.filter((x) => setFor(active).has(x.t.number)),
              (x) => x.weight,
            ),
            1,
          )} кг`,
          "plan-selected",
          "primary",
        )
      : btn("Друк талонів ▾", "print-menu", "primary") +
        btn("Експорт Excel", "excel-selected") +
        btn("Очистити дані", "clear", "danger");
    const listTabs = completed
      ? [
          ["all", "Усі", all.length],
          [
            "unchanged",
            "Зібрано без змін",
            all.filter((x) => x.t.completionResult === "unchanged").length,
          ],
          [
            "changed",
            "Зібрано зі змінами",
            all.filter((x) => x.t.completionResult === "changed").length,
          ],
          [
            "waiting",
            "Очікує планування",
            all.filter((x) => !used.has(x.t.number)).length,
          ],
          [
            "planned",
            "Передано в маршрути",
            all.filter((x) => used.has(x.t.number)).length,
          ],
        ]
      : [
          ["all", "Усі", all.length],
          [
            "new",
            "Нові",
            ts.filter((t) => !done(t) && t.printStatus !== "printed").length,
          ],
          [
            "unprinted",
            "Не роздруковані",
            ts.filter((t) => t.printStatus !== "printed").length,
          ],
          [
            "printed",
            "Роздруковані",
            ts.filter((t) => t.printStatus === "printed").length,
          ],
          ["done", "Скомплектовано", doneCount],
        ];
    return (
      hero(
        completed ? "СКОМПЛЕКТОВАНІ" : "КОМПЛЕКТАЦІЯ",
        completed
          ? "Замовлення, підготовлені до відвантаження.<br>Контроль по магазинах, складам та датам комплектації."
          : "Від сортування до готовності.<br>Контроль комплектації замовлень по магазинах.",
      ) +
      kpis(stats) +
      filterBar(k, all, actions) +
      `<div class="ui-split ${x ? "" : "closed"}"><section class="ui-panel ui-list-panel">${tabsBar(k, listTabs)}` +
      table(
        [
          '<input type="checkbox" data-select-all aria-label="Вибрати всі">',
          "№ талона",
          "Магазин / адреса",
          "Док.",
          "Мат. палети",
          "Факт палети",
          completed ? "Вага, кг" : "Статус",
          "Результат",
          "",
        ],
        a
          .slice(((pageNo[k] || 1) - 1) * 25, (pageNo[k] || 1) * 25)
          .map(
            (y) =>
              `<tr class="${focus[k] === y.t.number ? "selected" : ""}" data-focus="${e(y.t.number)}"><td><input type="checkbox" data-select="${e(y.t.number)}" ${setFor(k).has(y.t.number) ? "checked" : ""}></td><td class="no-wrap">${e(y.t.number)}</td><td>${e(y.store)}<small>${e(y.address)}</small></td><td>${y.ds.length}</td><td>${fmt(y.mat, 3)}</td><td>${y.fact == null ? "—" : fmt(y.fact, 2)}</td><td>${completed ? fmt(y.weight, 2) : pill(done(y.t) ? "Скомплектовано" : y.t.printStatus === "printed" ? "Роздрукований" : "Новий", done(y.t) ? "green" : y.t.printStatus === "printed" ? "purple" : "")}</td><td>${y.t.completionResult ? pill(y.t.completionResult === "changed" ? "Зі змінами" : "Без змін", y.t.completionResult === "changed" ? "" : "green") : "—"}</td><td>⋯</td></tr>`,
          )
          .join(""),
      ) +
      pagination(a.length, k) +
      `</section>${drawer(x, completed)}</div>`
    );
  }
  function stepper(current = 3) {
    return `<div class="ui-stepper">${["Тип доставки", "Вибір замовлень", "Налаштування рейсу", "Перевірка та планування", "Формування маршруту"].map((s, i) => `<span class="${i + 1 === current ? "active" : ""}"><i>${i + 1}</i>${s}</span>`).join("")}</div>`;
  }
  function plannerTemplate({ p, ware, f, today, selected }) {
    const options = (a, field = "name") =>
      '<option value="">— Оберіть —</option>' +
      a
        .map(
          (x) =>
            `<option value="${e(x.id || x.plate || x.name || x)}">${e(x[field] || x.name || x.plate || x)}</option>`,
        )
        .join("") +
      '<option value="__manual">Ввести вручну…</option>';
    const field = (title, key, html) =>
      `<label>${title}${html || `<input data-extra="${key}" value="${e(routeDraft[key] || "")}">`}</label>`;
    return `${stepper()}<div class="ui-planner-grid"><div><section class="ui-panel"><h3>1. Тип доставки</h3><div class="ui-types"><label>${icon("store")}<span><b>Пряме поповнення WT</b><small>Доставка зі складу на магазини мережі WT</small></span><input type="radio" name="deliveryType" value="direct" checked></label><label>${icon("box")}<span><b>Міжскладське переміщення</b><small>Переміщення між складами компанії</small></span><input type="radio" name="deliveryType" value="interwarehouse"></label></div></section><section class="ui-panel" style="margin-top:10px"><h3>2. Вибір скомплектованих документів</h3><div class="ui-filter"><input data-planner-search placeholder="Пошук: № талона, магазин, адреса…"><span>Готові до планування</span></div><div class="ui-tabs"><button class="active" type="button">Усі <b>${p.length}</b></button><span class="ui-note">Обрано <strong data-count>0</strong> із ${p.length}</span></div>${table(["", "№ талона", "Магазин / адреса", "Док.", "Факт палет", "Вага, кг", "Результат"], p.map((x) => `<tr data-plan-row data-plan-search="${e([x.t.number, x.store, x.address].join(" ").toLowerCase())}"><td><input type="checkbox" data-c value="${e(x.t.number)}" ${selected.has(x.t.number) ? "checked" : ""} ${x.hasActual ? "" : "disabled"}></td><td>${e(x.t.number)}</td><td>${e(x.store)}<small>${e(x.address)}</small></td><td>${x.ds.length}</td><td>${x.hasActual ? fmt(x.pal, 2) : "—"}</td><td>${fmt(x.weight + n(x.pal) * 20, 2)}</td><td>${pill(x.t.completionResult === "changed" ? "Зі змінами" : "Без змін", x.t.completionResult === "changed" ? "" : "green")}</td></tr>`).join(""))}<div class="ui-pagination">Вибрано <b data-k="tt">0</b> ТТ · Разом <b data-k="pal">0</b> пал · <b data-k="kg">0</b><span data-k="sum" hidden></span></div></section><section class="ui-panel" style="margin-top:10px"><h3>4. Попередній перегляд рейсу</h3><p class="ui-note">Склад ТТ і порядок можна скоригувати у вкладці маршруту перед формуванням ТТН.</p><div data-plan-preview></div></section></div><div><section class="ui-panel"><h3>3. Налаштування рейсу</h3><div class="ui-fields">${field("Перевізник *", "carrier", `<select data-f="carrier">${options(f.carriers || [])}</select><input data-extra="manualCarrier" placeholder="Назва перевізника вручну" hidden>`)}${field("Код ЄДРПОУ", "carrierCode")}${field("Водій *", "driver", `<select data-f="driver">${options(f.drivers || [])}</select><input data-extra="manualDriver" placeholder="ПІБ водія вручну" hidden>`)}${field("№ посвідчення", "driverLicense")}${field("Авто *", "vehicle", `<select data-f="vehicle">${options(f.vehicles || [], "plate")}</select><input data-extra="manualVehicle" placeholder="Марка / модель / держномер" hidden>`)}${field("Причіп", "trailer", `<input data-extra="trailer" placeholder="Держномер / без причепа">`)}<div class="ui-params"><b>Параметри ТЗ (довідково)</b><dl><dt>Вантажопідйомність</dt><dd><input data-extra="vehicleCapacity" placeholder="кг"></dd><dt>Довжина / ширина / висота</dt><dd><input data-extra="vehicleDimensions" placeholder="м"></dd><dt>Вага без вантажу</dt><dd><input data-extra="vehicleTare" placeholder="кг"></dd></dl></div><div class="ui-params"><b>Параметри причепа (довідково)</b><dl><dt>Вантажопідйомність</dt><dd><input data-extra="trailerCapacity" placeholder="кг"></dd><dt>Довжина / ширина / висота</dt><dd><input data-extra="trailerDimensions" placeholder="м"></dd><dt>Вага без вантажу</dt><dd><input data-extra="trailerTare" placeholder="кг"></dd></dl></div>${field("Склад відвантаження *", "from", `<select data-f="from"><option value="">— Оберіть склад —</option>${ware.map((w) => `<option value="${e(w.id)}">${e(w.label)}</option>`).join("")}</select>`)}${field("Місце стоянки авто *", "parking")}${field("Відповідальний за відвантаження", "responsible")}${field("Посада", "position")}${field("Дата рейсу *", "date", `<input type="date" data-f="date" value="${today}">`)}${field("Склад-отримувач (міжскладський)", "destination", `<select data-extra="destinationWarehouseId"><option value="">— Оберіть склад —</option>${ware.map((w) => `<option value="${e(w.id)}">${e(w.label)}</option>`).join("")}</select>`)}</div></section><section class="ui-panel" style="margin-top:10px"><h3>Підсумок маршруту</h3><p class="ui-note">Товарна деталізація автоматично переноситься з талонів.</p><label class="ui-note">Примітки до рейсу<textarea data-extra="notes" style="width:100%;height:80px;margin-top:8px" placeholder="Додати примітку…"></textarea></label></section></div></div><div class="ui-planner-footer"><button data-x>← Назад</button><button type="button" data-action="save-draft">${icon("save")}Зберегти чернетку</button><button class="primary" data-save>Далі: Сформувати маршрут →</button></div>`;
  }
  function updatePlanner(root, a) {
    root.querySelector("[data-k=kg]").textContent =
      fmt(
        sum(a, (x) => x.weight + n(x.pal) * 20),
        2,
      ) + " кг";
    root.querySelector("[data-plan-preview]").innerHTML = table(
      ["№", "Точка доставки", "Документи", "Палети", "Повна вага"],
      a
        .map(
          (x, i) =>
            `<tr><td>${i + 1}</td><td>${e(x.store)}<small>${e(x.address)}</small></td><td>${x.ds.length}</td><td>${fmt(x.pal, 2)}</td><td>${fmt(x.weight + n(x.pal) * 20, 2)} кг</td></tr>`,
        )
        .join(""),
    );
  }
  function collectRouteFields(root) {
    const extra = {};
    root
      .querySelectorAll("[data-extra]")
      .forEach((i) => (extra[i.dataset.extra] = i.value.trim()));
    const type =
      root.querySelector("[name=deliveryType]:checked")?.value || "direct";
    if (
      type === "interwarehouse" &&
      (!extra.destinationWarehouseId ||
        extra.destinationWarehouseId ===
          root.querySelector("[data-f=from]").value)
    )
      throw Error("Оберіть інший склад-отримувач.");
    for (const kind of ["carrier", "driver", "vehicle"])
      if (root.querySelector(`[data-f=${kind}]`).value === "__manual") {
        const value = extra["manual" + kind[0].toUpperCase() + kind.slice(1)];
        if (!value) throw Error("Заповніть реквізити вручну.");
        extra[kind] = value;
        extra[kind + "Id"] = "";
      }
    extra.deliveryType = type;
    extra.type =
      type === "direct" ? "Пряме поповнення WT" : "Міжскладське переміщення";
    extra.destinationWarehouse = RetailDirectories.warehouses().find(
      (w) => w.id === extra.destinationWarehouseId,
    );
    extra.destinationWarehouse = extra.destinationWarehouse
      ? RetailDirectories.warehouseLabel(extra.destinationWarehouse)
      : "";
    extra.arrivalWindows = {};
    return extra;
  }
  function routePage(no) {
    const route = routes().find((r) => r.number === no);
    if (!route) return '<div class="ui-empty">Маршрут не знайдено</div>';
    const all = tickets(),
      a = (route.ticketIds || []).map((id) => {
        const t = all.find((t) => t.number === id);
        if (!t) throw Error("Відсутній талон " + id);
        return info(t);
      }),
      ttns = read(J).filter((x) => x.route === no),
      isFinal = ttns.length > 0;
    return `<div class="ui-page-title"><div><h2>Маршрут ${e(no)}</h2><p>${e(route.type)} · ${e(date(route.date))} · ${pill(route.status, isFinal ? "green" : "")}</p></div><div class="ui-menu">${btn("← Планування", "back-planning")}${btn("Реєстр маршрутів", "route-register")}</div></div>${stepper(4)}${kpis(
      [
        [a.length, "Точок доставки", "blue", "store"],
        [
          fmt(
            sum(a, (x) => x.fact),
            2,
          ),
          "Факт палет",
          "orange",
          "box",
        ],
        [
          fmt(
            sum(a, (x) => x.weight),
            2,
          ) + " кг",
          "Повна логістична вага",
          "green",
          "weight",
        ],
        [ttns.length, "Пов’язаних ТТН", "red", "file"],
      ],
    )}<div class="ui-planner-grid"><section class="ui-panel"><div class="ui-panel-head">Точки маршруту та коридори прибуття</div>${table(
      [
        "Порядок",
        "Магазин / склад",
        "Док.",
        "Палети",
        "Дата доставки",
        "З",
        "До",
      ],
      a
        .map((x, i) => {
          const win = route.arrivalWindows?.[x.t.number] || {};
          return `<tr><td>${btn("↑", "move-up", "compact", `data-index="${i}" ${isFinal || i === 0 ? "disabled" : ""}`)}${btn("↓", "move-down", "compact", `data-index="${i}" ${isFinal || i === a.length - 1 ? "disabled" : ""}`)}</td><td>${e(route.deliveryType === "interwarehouse" ? route.destinationWarehouse : x.store)}<small>${e(x.address)}</small></td><td>${x.ds.length}</td><td>${fmt(x.fact, 2)}</td><td><input type="date" data-window="${e(x.t.number)}" data-field="date" value="${e(win.date || route.date)}"></td><td><input type="time" data-window="${e(x.t.number)}" data-field="from" value="${e(win.from || "")}"></td><td><input type="time" data-window="${e(x.t.number)}" data-field="to" value="${e(win.to || "")}"></td></tr>`;
        })
        .join(""),
    )}<div class="ui-panel-head">Товарна деталізація</div>${table(["Документ", "Товар", "Кількість", "Палети", "Вага"], a.flatMap((x) => x.ds.flatMap((d) => (d.lines || []).map((l) => `<tr><td>${e(d.id)}</td><td>${e(l.name)}</td><td>${fmt(l.qty)}</td><td>${fmt(l.pallets, 4)}</td><td>${fmt(l.weight, 2)}</td></tr>`))).join(""))}</section><section class="ui-panel" style="padding:16px"><h3>Реквізити рейсу</h3>${[
      ["Склад відвантаження", route.warehouse],
      ["Перевізник", route.carrier],
      ["ЄДРПОУ", route.carrierCode],
      ["Водій", route.driver],
      ["Посвідчення", route.driverLicense],
      ["Авто", route.vehicle],
      ["Причіп", route.trailer],
      ["Місце стоянки", route.parking],
      ["Відповідальний", route.responsible],
      ["Посада", route.position],
    ]
      .map(
        ([k, v]) =>
          `<div class="ui-info-row"><span>${k}</span><b>${e(v || "—")}</b></div>`,
      )
      .join(
        "",
      )}<div class="ui-menu" style="padding-top:20px">${btn("Зберегти коридори", "save-windows", "primary")}${btn("Параметри друку / пломби", "register-params")}</div><p class="ui-note">Перед формуванням ТТН заповніть транспортні реквізити та пломби у параметрах друку.</p><div class="ui-menu">${btn("Сформувати ТТН та друкувати", "generate-ttn", "primary")}${btn("Сформувати без друку", "generate-only")}${btn("Попередній перегляд", "preview-ttn")}</div>${ttns.map((t) => `<div class="ui-info-row"><span>${e(t.number)}</span>${pill("Сформовано", "green")}</div>`).join("")}</section></div>`;
  }
  function registry(ttn = false) {
    const a = ttn
      ? read(J)
      : routes().filter((r) => read(J).some((j) => j.route === r.number));
    const f = filterFor(active),
      shown = a.filter(
        (x) =>
          (!f.from || (x.date || "") >= f.from) &&
          (!f.to || (x.date || "") <= f.to) &&
          (!f.warehouse || (x.warehouse || x.from) === f.warehouse) &&
          (!f.store || x.to === f.store) &&
          (!f.q ||
            JSON.stringify([
              x.number,
              x.route,
              x.carrier,
              x.driver,
              x.vehicle,
              x.to,
            ])
              .toLowerCase()
              .includes(f.q.toLowerCase())),
      );
    return (
      hero(
        ttn ? "РЕЄСТР ТТН" : "РЕЄСТР МАРШРУТІВ",
        ttn
          ? "Сформовані документи. Перегляд і повторний друк."
          : "Історія сформованих маршрутів та пов’язаних ТТН.",
      ) +
      kpis([
        [
          a.length,
          ttn ? "ТТН у реєстрі" : "Сформованих маршрутів",
          "red",
          "file",
        ],
        [
          fmt(
            sum(a, (x) =>
              ttn
                ? x.pallets
                : sum(
                    (x.ticketIds || [])
                      .map((id) => tickets().find((t) => t.number === id))
                      .filter(Boolean),
                    (t) => t.actualPallets,
                  ),
            ),
            2,
          ),
          "Факт палет",
          "orange",
          "box",
        ],
        [
          new Set(a.map((x) => x.vehicle).filter(Boolean)).size,
          "Авто",
          "blue",
          "truck",
        ],
        [
          new Set(a.map((x) => x.carrier).filter(Boolean)).size,
          "Перевізники",
          "green",
          "store",
        ],
      ]) +
      filterBar(
        active,
        a.map((x) => ({
          ...x,
          store: x.to || "",
          warehouse: x.warehouse || x.from || "",
        })),
        btn("Планування", "back-planning"),
      ) +
      `<section class="ui-panel ui-list-panel"><div class="ui-panel-head">${ttn ? "Кожна ТТН — окремий запис" : "Усі сформовані маршрути"} <small>${shown.length} записів</small></div>` +
      table(
        ttn
          ? [
              "№ ТТН",
              "Маршрут",
              "Дата",
              "Одержувач",
              "Док.",
              "Палети",
              "Вага, кг",
              "Перевізник / водій",
              "Авто",
              "Статус",
              "Дії",
            ]
          : [
              "№ маршруту",
              "Тип",
              "Дата",
              "Склад",
              "Перевізник",
              "Водій",
              "Авто / причіп",
              "ТТН",
              "Дії",
            ],
        shown
          .slice(((pageNo[active] || 1) - 1) * 25, (pageNo[active] || 1) * 25)
          .map((x) =>
            ttn
              ? `<tr><td>${e(x.number)}</td><td>${e(x.route)}</td><td>${e(date(x.date))}</td><td>${e(x.to)}</td><td>${x.documents || 0}</td><td>${fmt(x.pallets, 2)}</td><td>${fmt(n(x.weight) + n(x.pallets) * 20, 2)}</td><td>${e(x.carrier)}<small>${e(x.driver)}</small></td><td>${e(x.vehicle)}</td><td>${pill(x.status, "green")}</td><td><div class="ui-menu">${btn("Перегляд", "journal-preview", "compact", `data-no="${e(x.route)}"`)}${btn("Передрук", "journal-print", "compact", `data-no="${e(x.route)}"`)}${btn("Реквізити", "journal-edit", "compact", `data-no="${e(x.route)}"`)}</div></td></tr>`
              : `<tr><td>${e(x.number)}</td><td>${e(x.type)}</td><td>${e(date(x.date))}</td><td>${e(x.warehouse)}</td><td>${e(x.carrier)}</td><td>${e(x.driver)}</td><td>${e(x.vehicle)}<small>${e(x.trailer || "")}</small></td><td>${read(
                  J,
                )
                  .filter((j) => j.route === x.number)
                  .map((j) => e(j.number))
                  .join(
                    "<br>",
                  )}</td><td>${btn("Відкрити", "open-route", "compact", `data-no="${e(x.number)}"`)}</td></tr>`,
          )
          .join(""),
      ) +
      pagination(shown.length, active) +
      "</section>"
    );
  }
  const navItems = [
    ["home", "Головна", "home"],
    ["base-excel", "Інформація з бази", "file"],
    ["picking-tickets", "Комплектація", "box"],
    ["completed", "Скомплектовані", "check"],
    ["routes-page", "Планування маршрутів", "pin"],
    ["route-register", "Реєстр маршрутів", "truck"],
    ["ttn-journal", "Реєстр ТТН", "file"],
    ["stores-page", "Магазини WT", "store"],
    ["warehouses-page", "Склади", "warehouse"],
    ["carriers-page", "Перевізники", "truck"],
    ["analytics-page", "Аналітика", "chart"],
    ["references-page", "Довідники", "books"],
    ["users-page", "Користувачі", "users"],
    ["settings-page", "Налаштування", "gear"],
  ];
  function navigation() {
    const nav = document.querySelector(".side nav");
    nav.innerHTML = navItems
      .map(
        ([id, title, ic], i) =>
          `${i === 11 ? "<hr>" : ""}<a href="#${id}" class="${active === id || (active === "route" && id === "routes-page") ? "active" : ""}"><img src="./assets/icon-${ic}.png" alt=""><span>${title}</span></a>`,
      )
      .join("");
    const bell = document.querySelector(".ui-bell");
    if (!bell) {
      const el = document.createElement("div");
      el.className = "ui-bell";
      el.innerHTML =
        '<img src="./assets/icon-bell.png" alt="Сповіщення"><i>3</i>';
      document.querySelector(".avatar").before(el);
    }
  }
  function render() {
    const key = (location.hash.slice(1) || "home").split("/")[0];
    active = key;
    navigation();
    document.documentElement.dataset.retailPage = key;
    const directory = ["stores-page", "warehouses-page"].includes(key);
    if (directory) {
      delete document.documentElement.dataset.uiScreen;
      document.querySelector(".brand img").src =
        "./assets/winetime-reference.png";
      RetailDirectoryViews.render();
      return;
    }
    document.documentElement.dataset.uiScreen = key;
    document.querySelector(".brand img").src =
      key === "home"
        ? "./assets/ui-home-logo.png"
        : key === "base-excel"
          ? "./assets/ui-base-logo.png"
          : key === "routes-page"
            ? "./assets/ui-plan-logo.png"
            : "./assets/ui-winetime.png";
    RetailDirectoryViews.render();
    const content = document.querySelector(".content");
    host = document.getElementById("ops-documents");
    if (!host) {
      host = document.createElement("section");
      host.id = "ops-documents";
      content.append(host);
    }
    host.hidden = false;
    host.style.display = "block";
    host.className = "ui-root";
    document.querySelector(".dashboard")?.classList.add("ops-hidden");
    document.querySelector("header h1").textContent =
      key === "routes-page" ? "Планування маршрутів" : "Retail ТОВ «ТС ПЛЮС»";
    document.querySelector("header p").textContent =
      key === "home"
        ? "Аналітика. Логістика. Результат."
        : {
            "base-excel":
              "Інформація з бази. Листи відбору. Актуальні дані з системи.",
            "picking-tickets":
              "Комплектація. Контроль підготовки замовлень до відвантаження.",
            completed:
              "Скомплектовані. Контроль готових замовлень до відвантаження.",
            "routes-page": "Формування рейсів з готових замовлень",
          }[key] || "Логістика. Контроль. Результат.";
    host.onclick = S.guard(click);
    host.onchange = S.guard(change);
    host.oninput = input;
    host.ondragover = (ev) => {
      if (ev.target.closest("[data-action=upload]")) ev.preventDefault();
    };
    host.ondrop = S.guard((ev) => {
      if (!ev.target.closest("[data-action=upload]")) return;
      ev.preventDefault();
      const file = ev.dataTransfer.files[0];
      if (file) RetailImport.upload(file);
    });
    if (key === "routes-page") {
      host.innerHTML = "";
      RetailRouteBuilderV7.open(
        routeDraft.selected || [...setFor("completed")],
      );
      for (const [selector, value] of Object.entries(routeDraft.fields || {})) {
        const el = host.querySelector(selector);
        if (el) {
          if (el.type === "radio") el.checked = value;
          else el.value = value;
          el.dispatchEvent(new Event("change", { bubbles: true }));
        }
      }
      return;
    }
    host.innerHTML =
      key === "home"
        ? dashboard()
        : key === "base-excel"
          ? base()
          : key === "picking-tickets"
            ? picking()
            : key === "completed"
              ? picking(true)
              : key === "route"
                ? routePage(
                    decodeURIComponent(location.hash.split("/")[1] || ""),
                  )
                : key === "route-register"
                  ? registry()
                  : key === "ttn-journal"
                    ? registry(true)
                    : key === "references-page"
                      ? `<div class="ui-page-title"><h2>Довідники</h2></div><div class="ui-menu"><a class="ui-btn" href="#stores-page">Магазини WT</a><a class="ui-btn" href="#warehouses-page">Склади</a></div>`
                      : '<div class="ui-empty">Розділ не входить до поточного UI-етапу.</div>';
  }
  function saveTicket() {
    const id = focus[active],
      t = tickets().find((t) => t.number === id);
    if (!t) throw Error("Талон не знайдено");
    if (done(t) || routes().some((r) => (r.ticketIds || []).includes(id)))
      throw Error(
        "Завершений або включений у маршрут талон недоступний для редагування.",
      );
    const actual = host.querySelector("[data-ap]").value;
    if (
      actual !== "" &&
      (!Number.isFinite(Number(actual)) || Number(actual) < 0)
    )
      throw Error("Перевірте фактичні палети");
    t.actualPallets = actual;
    t.picked = { ...t.picked };
    host.querySelectorAll(".ui-fact").forEach((i) => {
      if (i.value === "") delete t.picked[i.dataset.sku];
      else {
        const v = Number(i.value);
        if (v < 0 || v > Number(i.max) || !Number.isFinite(v))
          throw Error("Фактична кількість має бути від 0 до плану");
        t.picked[i.dataset.sku] = v;
      }
    });
    if (!results[id]) {
      S.write(
        T,
        tickets().map((x) => (x.number === id ? t : x)),
      );
      S.notice(
        "Зміни талона збережено. Оберіть результат для завершення.",
        "success",
      );
      return;
    }
    if (actual === "") throw Error("Вкажіть фактичні палети");
    if (results[id] === "changed") {
      S.write(
        T,
        tickets().map((x) => (x.number === id ? t : x)),
      );
      return RetailPickingEnhancements.changedDialog(t);
    }
    t.picked = {};
    info(t).ds.forEach((d) =>
      (d.lines || []).forEach(
        (l) => (t.picked[l.sku] = (t.picked[l.sku] || 0) + n(l.qty)),
      ),
    );
    RetailPickingEnhancements.finish(t, "unchanged");
  }
  async function print(ids, excel = false) {
    if (!ids.length) throw Error("Оберіть талони");
    for (const id of ids) {
      const t = tickets().find((t) => t.number === id);
      if (!t) throw Error("Талон не знайдено");
      const x = info(t),
        ls = RetailPickingTickets.groupLines(x.ds);
      if (excel) await RetailPickingTickets.exportExcel(t, x.ds, ls);
      else RetailPickingTickets.exportPdf(t, x.ds, ls);
      if (excel) continue;
      S.write(
        T,
        tickets().map((z) =>
          z.number === id
            ? {
                ...z,
                printStatus: "printed",
                printedAt: new Date().toISOString(),
                ...(!done(z)
                  ? { pickingStatus: "picking", status: "В підборі" }
                  : {}),
              }
            : z,
        ),
      );
    }
    render();
  }
  function currentRoute() {
    return routes().find(
      (r) => r.number === decodeURIComponent(location.hash.split("/")[1] || ""),
    );
  }
  function saveWindows() {
    const r = currentRoute();
    if (!r) throw Error("Маршрут не знайдено");
    const windows = {};
    host
      .querySelectorAll("[data-window]")
      .forEach(
        (i) => ((windows[i.dataset.window] ||= {})[i.dataset.field] = i.value),
      );
    for (const w of Object.values(windows))
      if (!w.date || !w.from || !w.to || w.date < r.date || w.from >= w.to)
        throw Error("Для кожної ТТ вкажіть дату та коректний часовий коридор");
    S.write(
      R,
      routes().map((x) =>
        x.number === r.number ? { ...x, arrivalWindows: windows } : x,
      ),
    );
    S.notice("Коридори прибуття збережено.", "success");
    return r;
  }
  function modal(title, body, handler) {
    const m = document.createElement("div");
    m.className = "ui-modal";
    m.innerHTML = `<div><h3>${title}</h3>${body}<div class="ui-modal-actions"><button data-close>Закрити</button></div></div>`;
    host.append(m);
    m.onclick = S.guard((ev) => {
      if (ev.target.closest("[data-close]")) m.remove();
      else handler?.(ev, m);
    });
  }
  async function click(ev) {
    const button = ev.target.closest("[data-action]"),
      row = ev.target.closest("[data-focus]");
    if (!button) {
      if (row && !ev.target.closest("input")) {
        focus[active] = row.dataset.focus;
        render();
      }
      return;
    }
    const action = button.dataset.action;
    if (action === "store-costs") {
      const map = new Map();
      let pending = 0;
      for (const r of routes().filter(
        (r) => r.tariff !== "" && r.tariff != null,
      )) {
        const names = [
          ...new Set(
            (r.ticketIds || [])
              .map((id) => tickets().find((t) => t.number === id)?.store)
              .filter(Boolean),
          ),
        ];
        if (names.length === 1)
          map.set(names[0], (map.get(names[0]) || 0) + n(r.tariff));
        else pending += n(r.tariff);
      }
      return modal(
        "Витрати по магазинах",
        table(
          ["Магазин", "Витрати, грн"],
          [...map]
            .map(
              ([store, cost]) =>
                `<tr><td>${e(store)}</td><td>${fmt(cost, 2)}</td></tr>`,
            )
            .join(""),
        ) +
          (pending
            ? `<p class="ui-note">${fmt(pending, 2)} грн багатоточкових маршрутів очікують розподілу між магазинами.</p>`
            : ""),
      );
    }
    if (action === "upload") return RetailImport.upload();
    if (action === "reset") {
      filters[active] = {};
      tabs[active] = "all";
      pageNo[active] = 1;
      render();
    } else if (action === "transfer") {
      RetailPicking.transfer([...setFor(active)]);
      setFor(active).clear();
    } else if (action === "tab") {
      tabs[active] = button.dataset.tab;
      pageNo[active] = 1;
      render();
    } else if (action === "subtab") {
      subtabs[active] = button.dataset.sub;
      render();
    } else if (action === "close-drawer") {
      focus[active] = "";
      render();
    } else if (action === "result") {
      results[focus[active]] = button.dataset.result;
      button
        .closest(".ui-result")
        .querySelectorAll("button")
        .forEach((b) => b.classList.toggle("success", b === button));
    } else if (action === "save-ticket") saveTicket();
    else if (action === "print-menu")
      modal(
        "Друк талонів",
        `${btn("PDF / Друк", "print-selected", "primary")}${btn("Excel", "excel-selected")}`,
      );
    else if (action === "print-selected" || action === "excel-selected")
      await print([...setFor(active)], action === "excel-selected");
    else if (action === "print-one" || action === "excel-one")
      await print([focus[active]], action === "excel-one");
    else if (action === "plan-selected") {
      if (!setFor(active).size) throw Error("Оберіть скомплектовані талони");
      location.hash = "#routes-page";
    } else if (action === "prev" || action === "next") {
      pageNo[active] = Math.max(
        1,
        (pageNo[active] || 1) + (action === "next" ? 1 : -1),
      );
      render();
    } else if (action === "back-planning") location.hash = "#routes-page";
    else if (action === "route-register") location.hash = "#route-register";
    else if (action === "open-route") openRoute(button.dataset.no);
    else if (action === "save-windows") saveWindows();
    else if (action === "register-params")
      RetailRouteTTN.editRegister(currentRoute().number);
    else if (action === "preview-ttn")
      RetailRouteTTN.preview(currentRoute().number);
    else if (action === "generate-ttn" || action === "generate-only") {
      const r = saveWindows();
      if (r.deliveryType === "interwarehouse")
        throw Error(
          "Консолідована ТТН між складами ще не доступна. Маршрут збережено.",
        );
      RetailRouteTTN.generate(r.number, {
        print: action === "generate-ttn",
        includeRegister: false,
      });
    } else if (action === "journal-preview")
      RetailRouteTTN.preview(button.dataset.no);
    else if (action === "journal-print")
      RetailRouteTTN.generate(button.dataset.no, { includeRegister: false });
    else if (action === "journal-edit") {
      const r = routes().find((x) => x.number === button.dataset.no);
      if (!r) throw Error("Маршрут не знайдено");
      const fields = [
        ["carrier", "Перевізник"],
        ["carrierCode", "ЄДРПОУ"],
        ["driver", "Водій"],
        ["driverLicense", "Посвідчення"],
        ["vehicle", "Авто / держномер"],
        ["trailer", "Причіп"],
        ["parking", "Місце стоянки"],
        ["responsible", "Відповідальний"],
        ["position", "Посада"],
      ];
      modal(
        "Транспортні реквізити",
        `<p class="ui-note">${e(r.number)} · Номери сформованих ТТН зберігаються.</p><div class="ui-fields">${fields.map(([key, label]) => `<label>${label}<input data-edit="${key}" value="${e(r[key] || "")}"></label>`).join("")}</div><button data-save-meta class="primary">Зберегти реквізити</button>`,
        (ev, m) => {
          if (!ev.target.closest("[data-save-meta]")) return;
          const patch = {};
          m.querySelectorAll("[data-edit]").forEach(
            (i) => (patch[i.dataset.edit] = i.value.trim()),
          );
          if (!patch.carrier || !patch.driver || !patch.vehicle)
            throw Error("Заповніть перевізника, водія та авто");
          if (patch.vehicle !== r.vehicle) patch.vehicleId = "";
          if (patch.driver !== r.driver) patch.driverId = "";
          if (patch.carrier !== r.carrier) patch.carrierId = "";
          S.commit({
            [R]: routes().map((x) =>
              x.number === r.number ? { ...x, ...patch } : x,
            ),
            [J]: read(J).map((x) =>
              x.route === r.number
                ? { ...x, ...patch, updatedAt: new Date().toISOString() }
                : x,
            ),
          });
          m.remove();
          render();
          S.notice(
            "Реквізити збережено. Передрук використовує той самий номер ТТН.",
            "success",
          );
        },
      );
    } else if (action === "move-up" || action === "move-down") {
      const r = currentRoute(),
        ids = [...r.ticketIds],
        i = Number(button.dataset.index),
        j = i + (action === "move-up" ? -1 : 1);
      if (read(J).some((t) => t.route === r.number) || j < 0 || j >= ids.length)
        throw Error("Порядок сформованого маршруту не можна змінити.");
      [ids[i], ids[j]] = [ids[j], ids[i]];
      S.write(
        R,
        routes().map((x) =>
          x.number === r.number ? { ...x, ticketIds: ids } : x,
        ),
      );
      render();
    } else if (action === "save-draft") {
      host
        .querySelectorAll("[data-extra]")
        .forEach((i) => (routeDraft[i.dataset.extra] = i.value));
      routeDraft.selected = [...host.querySelectorAll("[data-c]:checked")].map(
        (i) => i.value,
      );
      routeDraft.fields = {};
      host
        .querySelectorAll("[data-f],[data-extra],[name=deliveryType]")
        .forEach((i) => {
          const selector = i.dataset.f
            ? `[data-f="${i.dataset.f}"]`
            : i.dataset.extra
              ? `[data-extra="${i.dataset.extra}"]`
              : `[name=deliveryType][value="${i.value}"]`;
          routeDraft.fields[selector] =
            i.type === "radio" ? i.checked : i.value;
        });
      sessionStorage.setItem("retail_ui_draft_v1", JSON.stringify(routeDraft));
      S.notice("Чернетка збережена в цій вкладці браузера.", "success");
    } else if (action === "clear") {
      if (tickets().length || routes().length || read(J).length)
        throw Error(
          "Очищення заблоковано: існують пов’язані талони, маршрути або ТТН.",
        );
      if (confirm("Очистити дані цього блоку?")) {
        S.commit(
          active === "base-excel"
            ? { [D]: [], tc_retail_docs_v2: [], tc_retail_imports_v1: [] }
            : { [T]: [] },
        );
        render();
      }
    } else if (action === "doc") {
      const d = docs().find((d) => S.docKey(d) === button.dataset.id);
      modal(
        "Лист відбору " + e(d.id),
        table(
          ["Артикул", "Товар", "Кількість", "Палети"],
          (d.lines || [])
            .map(
              (l) =>
                `<tr><td>${e(l.sku)}</td><td>${e(l.name)}</td><td>${fmt(l.qty)}</td><td>${fmt(l.pallets, 4)}</td></tr>`,
            )
            .join(""),
        ),
      );
    }
  }
  function change(ev) {
    const el = ev.target;
    if (el.matches("[data-select]")) {
      el.checked
        ? setFor(active).add(el.dataset.select)
        : setFor(active).delete(el.dataset.select);
      render();
    } else if (el.matches("[data-select-all]")) {
      host.querySelectorAll("[data-select]").forEach((x) => {
        el.checked
          ? setFor(active).add(x.dataset.select)
          : setFor(active).delete(x.dataset.select);
      });
      render();
    } else if (el.dataset.filter) {
      filterFor(active)[el.dataset.filter] = el.value;
      pageNo[active] = 1;
      render();
    } else if (
      el.matches("[data-f=carrier],[data-f=driver],[data-f=vehicle]")
    ) {
      const kind = el.dataset.f,
        input = host.querySelector(
          `[data-extra="manual${kind[0].toUpperCase() + kind.slice(1)}"]`,
        );
      if (input) input.hidden = el.value !== "__manual";
    }
  }
  function input(ev) {
    const el = ev.target;
    if (el.matches("[data-planner-search]"))
      host
        .querySelectorAll("[data-plan-row]")
        .forEach(
          (r) =>
            (r.hidden = !r.dataset.planSearch.includes(el.value.toLowerCase())),
        );
    else if (el.dataset.filter === "q") {
      const start = el.selectionStart;
      filterFor(active).q = el.value;
      pageNo[active] = 1;
      render();
      const next = host.querySelector("[data-filter=q]");
      next.focus();
      next.setSelectionRange(start, start);
    }
  }
  function openRoute(no) {
    location.hash = "#route/" + encodeURIComponent(no);
  }
  window.RetailUI = {
    render: S.guard(render),
    plannerTemplate,
    updatePlanner,
    collectRouteFields,
    openRoute,
    clearDraft() {
      sessionStorage.removeItem("retail_ui_draft_v1");
      Object.keys(routeDraft).forEach((k) => delete routeDraft[k]);
      setFor("completed").clear();
    },
  };
  window.addEventListener("hashchange", S.guard(render));
  S.guard(render)();
})();
