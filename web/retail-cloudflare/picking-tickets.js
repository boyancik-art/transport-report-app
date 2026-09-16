(() => {
  const DOCS = "tc_retail_docs_v3",
    TICKETS = "tc_retail_tickets_v1";
  const get = (k, d = []) =>
    k === "tc_retail_docs_v3"
      ? RetailState.documents()
      : RetailState.read(k, d);
  const set = (k, v) => RetailState.write(k, v);
  const esc = (s) =>
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
  const n = (v) => Number(v) || 0,
    r = (v, p = 3) => Math.round(n(v) * 10 ** p) / 10 ** p;
  const key = (d) =>
    [
      d.senderWarehouse || "",
      d.receiverWarehouse || d.store || "",
      d.store || "",
    ].join("|");
  function groupLines(docs) {
    const m = new Map();
    docs.forEach((d) =>
      (d.lines || []).forEach((x) => {
        const k = [x.sku, x.barcode, x.name, x.volume].join("|");
        const z = m.get(k) || {
          sku: x.sku,
          barcode: x.barcode || "",
          name: x.name,
          volume: x.volume,
          qty: 0,
          weight: 0,
          pallets: 0,
          docs: [],
        };
        z.qty += n(x.qty);
        z.weight += n(x.weight);
        z.pallets += n(x.pallets);
        if (!z.docs.includes(String(d.id))) z.docs.push(String(d.id));
        m.set(k, z);
      }),
    );
    return [...m.values()];
  }
  function normalizeTickets() {
    return get(TICKETS);
  }
  async function exportExcel(ticket, docs, lines) {
    await RetailState.loadExcel();
    const head = [
      ["ТАЛОН КОМПЛЕКТАЦІЇ", ticket.number],
      ["Магазин", docs[0]?.store || ""],
      ["Адреса", docs[0]?.storeAddress || ""],
      ["Склад відправника", docs[0]?.senderWarehouse || ""],
      ["Склад отримувача", docs[0]?.receiverWarehouse || ""],
      ["Документи", docs.map((d) => d.id).join(", ")],
      [],
      [
        "Артикул",
        "ШК",
        "Найменування",
        "К-ть план",
        "Фактично підібрано",
        "Залишок",
        "Палети розр.",
        "Вага, кг",
        "Документи",
      ],
    ];
    const rows = lines.map((x) => [
      x.sku,
      x.barcode,
      x.name,
      x.qty,
      "",
      "",
      r(x.pallets, 4),
      r(x.weight, 3),
      x.docs.join(", "),
    ]);
    const ws = XLSX.utils.aoa_to_sheet([...head, ...rows]);
    ws["!cols"] = [
      { wch: 16 },
      { wch: 18 },
      { wch: 52 },
      { wch: 12 },
      { wch: 20 },
      { wch: 12 },
      { wch: 14 },
      { wch: 12 },
      { wch: 20 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Талон");
    const det = [
      [
        "Талон",
        "Магазин",
        "Документ",
        "Артикул",
        "ШК",
        "Найменування",
        "К-ть",
        "Шт/кейс",
        "Кейсів/пал",
        "Палети",
        "Вага",
      ],
    ];
    docs.forEach((d) =>
      (d.lines || []).forEach((x) =>
        det.push([
          ticket.number,
          d.store,
          d.id,
          x.sku,
          x.barcode || "",
          x.name,
          x.qty,
          x.unitsCase,
          x.casesPal,
          r(x.pallets, 6),
          r(x.weight, 3),
        ]),
      ),
    );
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.aoa_to_sheet(det),
      "Деталізація",
    );
    XLSX.writeFile(wb, `${ticket.number}.xlsx`);
  }
  function exportPdf(ticket, docs, lines) {
    const w = window.open("", "_blank");
    if (!w) return alert("Дозвольте спливаючі вікна для експорту PDF.");
    w.document.write(
      `<!doctype html><html><head><meta charset="utf-8"><title>${ticket.number}</title><style>@page{size:A4 landscape;margin:10mm}body{font:11px Arial;color:#111}h1{font-size:20px;margin:0 0 8px}.meta{display:grid;grid-template-columns:1fr 1fr;gap:4px 24px;margin-bottom:12px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #777;padding:5px;text-align:left}th{background:#eee}.fact{min-width:80px;height:18px}.sign{margin-top:18px;display:flex;justify-content:space-between}</style></head><body><h1>ТАЛОН КОМПЛЕКТАЦІЇ ${esc(ticket.number)}</h1><div class="meta"><b>Магазин: ${esc(docs[0]?.store)}</b><b>Склад: ${esc(docs[0]?.senderWarehouse)}</b><span>Адреса: ${esc(docs[0]?.storeAddress)}</span><span>Документи: ${docs.map((d) => esc(d.id)).join(", ")}</span></div><table><thead><tr><th>№</th><th>Артикул</th><th>ШК</th><th>Найменування</th><th>План</th><th>Факт</th><th>Палети</th><th>Вага</th><th>Документи</th></tr></thead><tbody>${lines.map((x, i) => `<tr><td>${i + 1}</td><td>${esc(x.sku)}</td><td>${esc(x.barcode)}</td><td>${esc(x.name)}</td><td>${x.qty}</td><td class="fact"></td><td>${r(x.pallets, 4)}</td><td>${r(x.weight, 3)}</td><td>${x.docs.join(", ")}</td></tr>`).join("")}</tbody></table><div class="sign"><span>Комплектувальник __________________</span><span>Перевірив __________________</span><span>Фактичні палети ______</span></div><script>window.onload=()=>window.print()<\/script></body></html>`,
    );
    w.document.close();
  }
  function openTicket(no) {
    const tickets = get(TICKETS),
      ticket = tickets.find((t) => t.number === no);
    if (!ticket) return;
    const all = get(DOCS),
      docs = RetailState.docsFor(ticket, all);
    const lines = groupLines(docs);
    const host = document.getElementById("ops-documents");
    host.innerHTML = `<div class="ops-page-title"><div><h2>Талон комплектації ${esc(ticket.number)}</h2><small>${esc(docs[0]?.store || "")} · документів ${docs.length}</small></div><div class="ops-toolbar"><button data-pdf>Експорт PDF</button><button data-xlsx>Експорт Excel</button><button data-back>До списку</button></div></div><div class="ops-grid"><div><small>Магазин</small><b>${esc(docs[0]?.store)}</b></div><div><small>Адреса</small><b>${esc(docs[0]?.storeAddress)}</b></div><div><small>Склад відправника</small><b>${esc(docs[0]?.senderWarehouse)}</b></div><div><small>Документи</small><b>${docs.map((d) => "№ " + esc(d.id)).join(", ")}</b></div><div><small>Розрахункові палети</small><b>${r(
      docs.reduce((s, d) => s + n(d.calc), 0),
      3,
    )}</b></div><div><small>Фактичні палети</small><input data-ap type="number" min="0" step="0.01" value="${esc(ticket.actualPallets ?? "")}"></div></div><h3>Товарні позиції · консолідовано</h3><table class="ops-register"><thead><tr><th>Артикул</th><th>ШК</th><th>Найменування</th><th>План</th><th>Фактично підібрано</th><th>Залишок</th><th>Палети розр.</th><th>Вага</th><th>Документи</th></tr></thead><tbody>${lines.map((x) => `<tr><td>${esc(x.sku)}</td><td>${esc(x.barcode)}</td><td>${esc(x.name)}</td><td>${x.qty}</td><td><input class="ops-fact" data-sku="${esc(x.sku)}" type="number" min="0" max="${x.qty}" step="1" value="${ticket.picked?.[x.sku] ?? ""}"></td><td data-rem="${esc(x.sku)}">${ticket.picked?.[x.sku] == null ? "" : Math.max(0, x.qty - n(ticket.picked[x.sku]))}</td><td>${r(x.pallets, 4)}</td><td>${r(x.weight, 3)} кг</td><td>${x.docs.join(", ")}</td></tr>`).join("")}</tbody></table>`;
    const save = () => {
      if (
        get("tc_retail_routes_v1").some((x) =>
          (x.ticketIds || []).includes(ticket.number),
        )
      )
        return;
      ticket.picked = ticket.picked || {};
      host.querySelectorAll(".ops-fact").forEach((i) => {
        if (i.value === "") delete ticket.picked[i.dataset.sku];
        else {
          const value = Number(i.value);
          if (!Number.isFinite(value) || value < 0 || value > Number(i.max))
            throw Error("Фактична кількість має бути від 0 до планової.");
          ticket.picked[i.dataset.sku] = value;
        }
      });
      ticket.actualPallets = host.querySelector("[data-ap]").value;
      if (
        ticket.actualPallets !== "" &&
        (!Number.isFinite(Number(ticket.actualPallets)) ||
          Number(ticket.actualPallets) < 0)
      )
        throw Error("Фактичні палети мають бути невід’ємним числом.");
      const entered = Object.keys(ticket.picked).length,
        total = lines.reduce((s, x) => s + x.qty, 0),
        done = lines.reduce(
          (s, x) => s + Math.min(x.qty, n(ticket.picked[x.sku])),
          0,
        );
      ticket.status = !entered
        ? "До комплектації"
        : done < total
          ? "Частково скомплектовано"
          : "Скомплектовано";
      set(
        TICKETS,
        get(TICKETS).map((x) => (x.number === ticket.number ? ticket : x)),
      );
    };
    host.querySelectorAll(".ops-fact").forEach(
      (i) =>
        (i.oninput = RetailState.guard(() => {
          save();
          host.querySelector(
            `[data-rem="${CSS.escape(i.dataset.sku)}"]`,
          ).textContent =
            i.value === "" ? "" : Math.max(0, n(i.max) - n(i.value));
        })),
    );
    host.querySelector("[data-ap]").oninput = RetailState.guard(save);
    host.querySelector("[data-pdf]").onclick = RetailState.guard(() => {
      save();
      exportPdf(ticket, docs, lines);
    });
    host.querySelector("[data-xlsx]").onclick = RetailState.guard(async () => {
      save();
      await exportExcel(ticket, docs, lines);
    });
    host.querySelector("[data-back]").onclick = RetailState.guard(render);
    window.RetailPickingEnhancements?.enhance();
    if (
      get("tc_retail_routes_v1").some((x) =>
        (x.ticketIds || []).includes(ticket.number),
      )
    )
      host
        .querySelectorAll("input,[data-complete-ok],[data-complete-changed]")
        .forEach((x) => (x.disabled = true));
    window.dispatchEvent(new Event("retail:rendered"));
  }
  function render() {
    if (location.hash !== "#picking-tickets") return;
    const host = document.getElementById("ops-documents");
    if (!host) return;
    const tickets = normalizeTickets(),
      docs = get(DOCS);
    host.hidden = false;
    host.style.display = "block";
    host.innerHTML = `<div class="ops-page-title"><div><h2>Талони комплектації</h2><small>Автоматичне групування документів за магазином і складом відправника</small></div></div>${
      tickets.length
        ? `<table class="ops-register"><thead><tr><th>Талон</th><th>Магазин</th><th>Документи</th><th>Розр. палети</th><th>Факт палети</th><th>Статус</th></tr></thead><tbody>${tickets
            .map((t) => {
              const ds = RetailState.docsFor(t, docs);
              return `<tr><td><button class="ops-doc-link" data-open="${esc(t.number)}">${esc(t.number)}</button></td><td>${esc(ds[0]?.store || "—")}</td><td>${ds.length}</td><td>${r(
                ds.reduce((s, d) => s + n(d.calc), 0),
                3,
              )}</td><td>${esc(t.actualPallets ?? "—")}</td><td>${esc(t.status || "До комплектації")}</td></tr>`;
            })
            .join("")}</tbody></table>`
        : `<div style="padding:70px;text-align:center;color:#929aa5">Талонів ще немає. Передайте документи з «База Excel» на комплектацію.</div>`
    }`;
    host
      .querySelectorAll("[data-open]")
      .forEach(
        (b) =>
          (b.onclick = RetailState.guard(() => openTicket(b.dataset.open))),
      );
  }
  window.addEventListener("hashchange", () =>
    setTimeout(RetailState.guard(render), 30),
  );
  setTimeout(RetailState.guard(render), 100);
})();
