(() => {
  const DOCS = "tc_retail_docs_v3",
    IMPORTS = "tc_retail_imports_v1",
    TICKETS = "tc_retail_tickets_v1";
  const get = (k, d = []) =>
    k === "tc_retail_docs_v3"
      ? RetailState.documents()
      : RetailState.read(k, d);
  const set = (k, v) => RetailState.write(k, v);
  const txt = (v) => String(v ?? "").trim(),
    num = (v) => Number(String(v ?? "").replace(",", ".")) || 0,
    rnd = (n, p = 3) => Math.round((Number(n) || 0) * 10 ** p) / 10 ** p;
  const esc = (s) =>
    txt(s).replace(
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
  const dateFrom = (s) =>
    (txt(s).match(/(?:від|от)\s*(\d{2}\.\d{2}\.\d{4})/i) || [])[1] || "";
  const STORES = [
    [["рівне №2", "рівне 2"], "WT Рівне №2", "Рівне", "вул. Щаслива, буд. 1"],
    [
      ["рівне №1", "рівне 1"],
      "WT Рівне №1",
      "Рівне",
      "вул. Міцкевича, буд. 32",
    ],
    [
      ["шалімова"],
      "WT Софіївська Борщагівка (Шалімова)",
      "Софіївська Борщагівка",
      "вул. Академіка Шалімова, буд. 69, прим. 95",
    ],
    [
      ["молодіжна"],
      "WT Софіївська Борщагівка (Молодіжна)",
      "Софіївська Борщагівка",
      "вул. Молодіжна, буд. 3, прим. 128",
    ],
    [
      ["верхогляда"],
      "WT Верхогляда",
      "Київ",
      "вул. Андрія Верхогляда, буд. 9А",
    ],
    [["маккейна"], "WT Маккейна", "Київ", "вул. Джона Маккейна, буд. 1"],
    [["філатова"], "WT Філатова", "Київ", "вул. Академіка Філатова, буд. 2/1"],
    [["голосіївська"], "WT Голосіївська", "Київ", "вул. Голосіївська, буд. 13"],
    [
      ["ярославів вал"],
      "WT Ярославів Вал",
      "Київ",
      "вул. Ярославів Вал, буд. 37",
    ],
    [
      ["здановської"],
      "WT Здановської",
      "Київ",
      "вул. Юлії Здановської, буд. 48А",
    ],
    [["вишгородська"], "WT Вишгородська", "Київ", "вул. Вишгородська, буд. 45"],
    [
      ["велика васильківська"],
      "WT Велика Васильківська",
      "Київ",
      "вул. Велика Васильківська, буд. 100",
    ],
    [["верхній вал"], "WT Верхній Вал", "Київ", "вул. Верхній Вал, буд. 16/4"],
    [["мокра"], "WT Мокра", "Київ", "вул. Мокра, буд. 18А"],
    [["дмитрівська"], "WT Дмитрівська", "Київ", "вул. Дмитрівська, буд. 62/20"],
    [
      ["палладіна"],
      "WT Палладіна",
      "Київ",
      "просп. Академіка Палладіна, буд. 59Б",
    ],
    [["бажана"], "WT Бажана", "Київ", "просп. Миколи Бажана, буд. 1Е"],
    [["соборності"], "WT Соборний", "Київ", "просп. Соборності, буд. 7Б"],
    [["кременчук"], "WT Кременчук", "Кременчук", "вул. Соборна, буд. 34/32"],
    [
      ["черкаси"],
      "WT Черкаси",
      "Черкаси",
      "вул. Михайла Грушевського, буд. 110",
    ],
    [
      ["крихівці"],
      "WT Крихівці",
      "Крихівці",
      "вул. Слобідська, буд. 2, прим. 266",
    ],
    [["ужгород"], "WT Ужгород", "Ужгород", "вул. Собранецька, буд. 26"],
    [
      ["тернопіль"],
      "WT Тернопіль",
      "Тернопіль",
      "вул. Соломії Крушельницької, буд. 51",
    ],
    [["луцьк"], "WT Луцьк", "Луцьк", "вул. Градний Узвіз, буд. 2"],
    [
      ["хмельницьк"],
      "WT Хмельницький",
      "Хмельницький",
      "вул. Проскурівська, буд. 16",
    ],
    [["чернігів"], "WT Чернігів", "Чернігів", "вул. Київська, буд. 11"],
    [
      ["івано-франків", "франківськ"],
      "WT Івано-Франківськ",
      "Івано-Франківськ",
      "бульв. Південний, буд. 27Б",
    ],
    [
      ["княгині ольги"],
      "WT Львів (Княгині Ольги)",
      "Львів",
      "вул. Княгині Ольги, буд. 100К",
    ],
    [
      ["чорновола"],
      "WT Львів",
      "Львів",
      "просп. В'ячеслава Чорновола, буд. 45",
    ],
    [["зодчих"], "WT Вінниця №1", "Вінниця", "вул. Зодчих, буд. 5"],
    [
      ["космонавтів"],
      "WT Вінниця №2",
      "Вінниця",
      "просп. Космонавтів, буд. 40",
    ],
    [
      ["поля, 59", "поля,59", "о.поля"],
      "WT Дніпро №3",
      "Дніпро",
      "просп. Олександра Поля, буд. 59",
    ],
    [
      ["яворницького"],
      "WT Дніпро №1",
      "Дніпро",
      "просп. Дмитра Яворницького, буд. 77",
    ],
    [
      ["головна, 37", "головна,37"],
      "WT Чернівці №2",
      "Чернівці",
      "вул. Головна, буд. 37",
    ],
    [["стоянка"], "WT Стоянка", "Стоянка", "вул. Меліораторів, буд. 1/3"],
  ];
  function storeInfo(raw) {
    const q = txt(raw).toLowerCase().replace(/ё/g, "е");
    for (const [keys, name, city, address] of STORES)
      if (keys.some((k) => q.includes(k)))
        return { name, city, address, full: `${city}, ${address}` };
    const cleaned = txt(raw)
      .replace(/^Склад\s*№?\d*\s*магазин\s*/i, "")
      .trim();
    return {
      name: cleaned || "Не зіставлено",
      city: "",
      address: "",
      full: cleaned || "Не зіставлено",
    };
  }
  function findHeaders(rows) {
    let docRow = -1,
      itemRow = -1,
      groupRow = -1;
    for (let i = 0; i < Math.min(rows.length, 40); i++) {
      const c = (rows[i] || []).map(txt);
      if (c.includes("Номер") && c.some((x) => /Склад\s*получатель/i.test(x))) {
        docRow = i;
        groupRow = Math.max(0, i - 1);
      }
      if (c.includes("Артикул") && c.some((x) => /Номенклатура/i.test(x)))
        itemRow = i;
    }
    if (docRow < 0)
      throw new Error(
        "Не знайдено заголовки документа: «Номер / Склад получатель».",
      );
    if (itemRow < 0)
      throw new Error(
        "Не знайдено заголовки товару: «Артикул / Номенклатура».",
      );
    const d = (rows[docRow] || []).map(txt),
      p = (rows[itemRow] || []).map(txt),
      g = (rows[groupRow] || []).map(txt);
    const idx = (a, re) => a.findIndex((x) => re.test(x));
    return {
      start: Math.max(docRow, itemRow) + 1,
      docNo: idx(d, /^Номер$/i),
      receiver: idx(d, /^Склад\s*получатель$/i),
      pallets: idx(d, /^Кол-во\s*палет$/i),
      weight: idx(d, /^Общий\s*вес$/i),
      link: idx(d, /^Ссылка$/i),
      docQty: idx(d, /^Количество$/i),
      docAmount: idx(d, /^Сумма$/i),
      sender: idx(g, /Склад\s*отправитель/i),
      sku: idx(p, /^Артикул$/i),
      barcode: idx(p, /Основний\s*ШК/i),
      casesPal: idx(p, /Кейсов\s*на\s*паллете/i),
      unitsCase: idx(p, /Штук\s*в\s*ящику/i),
      unitWeight: idx(p, /^Вес$/i),
      name: idx(p, /^Номенклатура$/i),
      volume: idx(p, /Ємність/i),
    };
  }
  function parse(rows) {
    const h = findHeaders(rows);
    let sender = "",
      cur = null;
    const out = [];
    for (let i = h.start; i < rows.length; i++) {
      const r = rows[i] || [];
      const label = txt(r[h.link]);
      const docNo = txt(r[h.docNo]);
      const receiver = txt(r[h.receiver]);
      const senderCell = h.sender >= 0 ? txt(r[h.sender]) : "";
      if (
        senderCell &&
        /^Склад\s/i.test(senderCell) &&
        !/^Лист\s*відбору/i.test(senderCell) &&
        !docNo
      ) {
        sender = senderCell;
        cur = null;
        continue;
      }
      if (/^Лист\s*відбору/i.test(label)) {
        const labelNo =
          (label.match(/Лист\s*відбору\s*0*(\d+)/i) || [])[1] || "";
        const id = /^\d+$/.test(docNo) ? docNo : labelNo;
        if (!id || !receiver) continue;
        const info = storeInfo(receiver);
        cur = {
          id,
          date: dateFrom(label),
          store: info.name,
          storeAddress: info.full,
          receiverWarehouse: receiver,
          senderWarehouse: sender || "Не визначено",
          sourcePallets: num(r[h.pallets]),
          sourceWeight: num(r[h.weight]),
          qty: num(r[h.docQty]),
          amount: num(r[h.docAmount]),
          fact: "",
          route: "",
          status: "Новий",
          workflowStatus: "new",
          lines: [],
        };
        out.push(cur);
        continue;
      }
      if (cur) {
        const sku = txt(r[h.sku]),
          name = txt(r[h.name]);
        if (/^\d{6,}$/.test(sku) && name) {
          const casesPal = num(r[h.casesPal]),
            unitsCase = num(r[h.unitsCase]),
            unitWeight = num(r[h.unitWeight]),
            qty = num(r[h.docQty]),
            amount = num(r[h.docAmount]);
          cur.lines.push({
            sku,
            barcode: txt(r[h.barcode]),
            casesPal,
            unitsCase,
            unitWeight,
            name,
            volume: txt(r[h.volume]),
            qty,
            amount,
            pallets:
              casesPal && unitsCase ? rnd(qty / unitsCase / casesPal, 6) : 0,
            weight: rnd(qty * unitWeight, 3),
          });
        }
      }
    }
    out.forEach((d) => {
      d.calc = rnd(
        d.lines.reduce((s, x) => s + x.pallets, 0),
        3,
      );
      d.calcWeight = rnd(
        d.lines.reduce((s, x) => s + x.weight, 0),
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
  function modal(html) {
    let m = document.getElementById("ops-fix-modal");
    if (!m) {
      m = document.createElement("div");
      m.id = "ops-fix-modal";
      document.body.append(m);
    }
    m.innerHTML = `<div class="ops-backdrop"></div><div class="ops-dialog">${html}<button class="ops-close">Закрити</button></div>`;
    m.className = "open";
    m.querySelector(".ops-backdrop").onclick = m.querySelector(
      ".ops-close",
    ).onclick = () => (m.className = "");
  }
  function openDoc(id) {
    const d = get(DOCS).find((x) => RetailState.docKey(x) === String(id));
    if (!d) return;
    modal(
      `<h2>Документ № ${esc(d.id)}</h2><div class="ops-grid"><div><small>Магазин</small><b>${esc(d.store)}</b></div><div><small>Адреса з довідника</small><b>${esc(d.storeAddress)}</b></div><div><small>Склад відправника</small><b>${esc(d.senderWarehouse)}</b></div><div><small>Склад отримувача</small><b>${esc(d.receiverWarehouse)}</b></div><div><small>Вага системи</small><b>${rnd(d.sourceWeight)} кг</b></div><div><small>Палети розрах.</small><b>${rnd(d.calc)}</b></div></div><h3>Товарні позиції · ${d.lines?.length || 0}</h3><table class="ops-register"><thead><tr><th>Артикул</th><th>Номенклатура</th><th>К-ть</th><th>Шт/кейс</th><th>Кейс/пал</th><th>Палети</th><th>Вага</th></tr></thead><tbody>${(d.lines || []).map((x) => `<tr><td>${esc(x.sku)}</td><td>${esc(x.name)}</td><td>${x.qty}</td><td>${x.unitsCase}</td><td>${x.casesPal}</td><td>${rnd(x.pallets, 4)}</td><td>${rnd(x.weight)} кг</td></tr>`).join("")}</tbody></table>`,
    );
  }
  function details(force = false) {
    const h = document.getElementById("ops-documents");
    if (!h) return;
    let box = h.querySelector("#base-doc-details");
    if (box && !force) {
      box.remove();
      return;
    }
    if (box) box.remove();
    const docs = get(DOCS);
    box = document.createElement("div");
    box.id = "base-doc-details";
    box.className = "ops-section";
    box.innerHTML = `<div class="ops-page-title"><div><h3>Документи в базі · ${docs.length}</h3><p>Оберіть документи для комплектації або натисніть номер документа для перегляду товару.</p></div><div class="ops-toolbar"><button class="ops-primary" data-ticket>Передати на комплектацію</button></div></div>${docs.length ? `<table class="ops-register"><thead><tr><th><input type="checkbox" data-all></th><th>Документ</th><th>Дата</th><th>Магазин</th><th>Адреса магазину</th><th>Склад відправника</th><th>Склад отримувача</th><th>Вага</th><th>Палети системи</th><th>Палети розр.</th><th>Статус</th></tr></thead><tbody>${docs.map((d) => `<tr><td><input type="checkbox" data-doc="${esc(RetailState.docKey(d))}"></td><td><button class="ops-link" data-open="${esc(RetailState.docKey(d))}">№ ${esc(d.id)}</button></td><td>${esc(d.date || "—")}</td><td><b>${esc(d.store || "Не зіставлено")}</b></td><td>${esc(d.storeAddress || "Не зіставлено")}</td><td>${esc(d.senderWarehouse || "—")}</td><td>${esc(d.receiverWarehouse || "—")}</td><td>${rnd(d.sourceWeight)} кг</td><td class="ops-source">${rnd(d.sourcePallets)}</td><td><b>${rnd(d.calc)}</b></td><td>${esc(d.status || "Новий")}</td></tr>`).join("")}</tbody></table>` : '<div class="ops-empty">Документів ще немає.</div>'}`;
    h.append(box);
    box
      .querySelector("[data-all]")
      ?.addEventListener("change", (e) =>
        box
          .querySelectorAll("[data-doc]")
          .forEach((c) => (c.checked = e.target.checked)),
      );
    box
      .querySelectorAll("[data-open]")
      .forEach((b) => (b.onclick = () => openDoc(b.dataset.open)));
    window.RetailPicking?.enhance();
    box.scrollIntoView({ block: "start" });
  }
  let uploadBusy = false;
  async function upload(droppedFile) {
    if (uploadBusy) return;
    uploadBusy = true;
    const button = document.querySelector("[data-upload]");
    if (button) {
      button.disabled = true;
      button.textContent = "Завантаження модуля Excel…";
    }
    try {
      await RetailState.loadExcel();
      const input = document.createElement("input");
      input.type = "file";
      input.accept = ".xlsx,.xls";
      input.onchange = RetailState.guard(async () => {
        const file = droppedFile || input.files?.[0];
        if (!file) return;
        try {
          const wb = XLSX.read(await file.arrayBuffer(), { type: "array" }),
            sheet = wb.Sheets.TDSheet || wb.Sheets[wb.SheetNames[0]];
          if (!sheet) throw Error("Файл не містить аркушів");
          const incoming = parse(
            XLSX.utils.sheet_to_json(sheet, {
              header: 1,
              raw: true,
              defval: null,
              blankrows: false,
            }),
          );
          if (!incoming.length) throw Error("Документи TDSheet не знайдені");
          const unique = new Map();
          for (const d of incoming) {
            const key = RetailState.docKey(d);
            if (unique.has(key) && unique.get(key).hash !== d.hash)
              throw Error("Конфлікт дублікатів у файлі: " + d.id);
            unique.set(key, d);
          }
          const old = get(DOCS),
            assigned = new Set(
              get(TICKETS).flatMap((t) =>
                RetailState.docsFor(t, old).map(RetailState.docKey),
              ),
            );
          const map = new Map(old.map((d) => [RetailState.docKey(d), d]));
          let added = 0,
            updated = 0,
            unchanged = 0,
            locked = 0;
          for (const [key, d] of unique) {
            const previous = map.get(key);
            if (!previous) {
              map.set(key, {...d, loadedAt: new Date().toISOString()});
              added++;
            } else if (previous.hash === d.hash) {
              unchanged++;
            } else if (
              assigned.has(key) ||
              [
                "picking",
                "picked",
                "routed",
                "ttn_created",
                "dispatched",
                "delivered",
              ].includes(previous.workflowStatus)
            ) {
              locked++;
            } else {
              map.set(key, {
                ...d,
                loadedAt: new Date().toISOString(),
                fact: previous.fact ?? "",
                route: previous.route || "",
                status: previous.status || "Новий",
                workflowStatus: previous.workflowStatus || "new",
              });
              updated++;
            }
          }
          modal(
            `<h2>Перевірка імпорту</h2><p>${esc(file.name)}</p><p>${added} нових · ${updated} оновлень · ${unchanged} без змін · ${locked} захищених документів залишаться без змін</p><p>Документи, відсутні у файлі, зберігаються.</p><button class="ops-primary" data-confirm-import>Підтвердити імпорт</button>`,
          );
          const box = document.getElementById("ops-fix-modal"),
            confirm = box.querySelector("[data-confirm-import]");
          let saved = false;
          const snapshot = JSON.stringify(old);
          confirm.onclick = RetailState.guard(() => {
            if (saved) return;
            confirm.disabled = true;
            try {
              if (JSON.stringify(get(DOCS)) !== snapshot)
                throw Error(
                  "Дані змінилися під час перевірки. Повторіть імпорт.",
                );
              RetailState.commit({
                [DOCS]: [...map.values()],
                [IMPORTS]: [
                  {
                    fileName: file.name,
                    at: new Date().toISOString(),
                    total: unique.size,
                    n: added,
                    changed: updated,
                    same: unchanged,
                    locked,
                  },
                  ...get(IMPORTS),
                ].slice(0, 20),
              });
              saved = true;
              box.className = "";
              window.RetailOperations.renderBase();
              RetailState.notice(
                "Імпорт збережено: " +
                  added +
                  " нових, " +
                  updated +
                  " оновлено.",
                "success",
              );
            } finally {
              if (!saved) confirm.disabled = false;
            }
          });
        } catch (error) {
          RetailState.notice("Помилка імпорту: " + error.message);
        }
      });
      if(droppedFile) await input.onchange(); else input.click();
    } catch (error) {
      RetailState.notice(error.message);
    } finally {
      uploadBusy = false;
      if (button) {
        button.disabled = false;
        button.textContent = "＋ Завантажити первинний Excel";
      }
    }
  }
  function enhance() {
    if (location.hash !== "#base-excel") return;
    const h = document.getElementById("ops-documents");
    if (!h || h.style.display === "none") return;
    const title = h.querySelector(".ops-page-title");
    if (title && !title.querySelector("[data-details3]")) {
      const b = document.createElement("button");
      b.className = "ops-primary";
      b.dataset.details3 = "1";
      b.textContent = "Переглянути документи";
      b.onclick = () => details();
      const a = document.createElement("div");
      a.className = "ops-toolbar";
      const u = title.querySelector("[data-upload]");
      if (u) {
        u.replaceWith(a);
        a.append(b, u);
      } else a.append(b);
      title.append(a);
    }
  }
  const style = document.createElement("style");
  style.textContent =
    ".ops-link{background:none;border:0;color:#ff6b83;font-weight:800;cursor:pointer;padding:0}.ops-link:hover{text-decoration:underline}#ops-fix-modal{display:none}#ops-fix-modal.open{display:block;position:fixed;inset:0;z-index:99999}#ops-fix-modal .ops-backdrop{position:absolute;inset:0;background:#000b}#ops-fix-modal .ops-dialog{position:absolute;left:5%;right:5%;top:5%;max-height:88vh;overflow:auto;background:#101821;border:1px solid #34404d;border-radius:14px;padding:22px;color:#fff}.ops-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:14px 0}.ops-grid>div{background:#17212c;padding:10px;border-radius:8px}.ops-grid small,.ops-grid b{display:block}.ops-close{margin-top:14px}.ops-register input[type=checkbox]{width:16px;height:16px;accent-color:#9d1235}";
  document.head.append(style);
  window.RetailImport = { upload, enhance, parse };
  if (location.hash === "#base-excel") enhance();
})();
