(() => {
  const D = "tc_retail_docs_v3",
    T = "tc_retail_tickets_v1",
    R = "tc_retail_routes_v1",
    F = "tc_retail_fleet_v1",
    W = "tc_retail_warehouses_v1";
  const g = (k, d = []) =>
      k === "tc_retail_docs_v3"
        ? RetailState.documents()
        : RetailState.read(k, d),
    s = (k, v) => RetailState.write(k, v),
    n = (v) => Number(v) || 0,
    e = (x) =>
      String(x ?? "").replace(
        /[&<>"']/g,
        (c) =>
          ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;",
          })[c],
      ),
    r = (v) => Math.round(n(v) * 1000) / 1000,
    m = (v) =>
      n(v).toLocaleString("uk-UA", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }) + " грн";
  function wh() {
    return window.RetailDirectories.warehouses().map((x) => ({
      id: x.id,
      label: [x.index || x.postcode, x.city, x.address]
        .filter(Boolean)
        .join(", "),
    }));
  }
  function info(t, docs) {
    const ds = RetailState.docsFor(t, docs),
      mat = ds.reduce((a, d) => a + n(d.calc), 0),
      pal =
        t.actualPallets !== "" && t.actualPallets != null
          ? n(t.actualPallets)
          : mat,
      weight = ds.reduce(
        (a, d) => a + (n(d.sourceWeight) || n(d.calcWeight) || n(d.weight)),
        0,
      ),
      sum = ds.reduce((a, d) => a + n(d.sourceSum || d.sum || d.amount), 0);
    return {
      t,
      ds,
      store: t.store || ds[0]?.store || "",
      address: t.storeAddress || ds[0]?.storeAddress || "",
      pal: r(pal),
      weight: r(weight),
      sum: r(sum),
    };
  }
  function pool() {
    const docs = g(D),
      used = new Set(g(R).flatMap((x) => x.ticketIds || []));
    return g(T)
      .filter((x) => x.status === "Скомплектовано" && !used.has(x.number))
      .map((x) => info(x, docs));
  }
  function css() {
    if (document.getElementById("rb7css")) return;
    document.head.insertAdjacentHTML(
      "beforeend",
      `<style id="rb7css">.rb7{position:fixed;inset:0;z-index:12000;background:#050b11e8;display:grid;place-items:center;padding:18px}.rb7box{width:min(1220px,97vw);max-height:94vh;overflow:auto;background:#0e1a25;border:1px solid #385066;border-radius:14px}.rb7head,.rb7foot{padding:14px 18px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #2b4052}.rb7foot{border-top:1px solid #2b4052;border-bottom:0;justify-content:flex-end;gap:8px}.rb7body{padding:16px}.rb7grid{display:grid;grid-template-columns:repeat(4,1fr);gap:9px}.rb7 label small{display:block;color:#91a4b5;font-size:10px;font-weight:700;margin-bottom:4px}.rb7 input,.rb7 select{width:100%;height:38px;box-sizing:border-box;background:#142635;border:1px solid #39546b;border-radius:7px;color:white;padding:0 8px}.rb7pick{margin-top:18px;border:1px solid #31495d;border-radius:10px;padding:14px;display:flex;justify-content:space-between;align-items:center}.rb7stats{display:flex;gap:8px}.rb7stat{padding:7px 10px;border:1px solid #334b60;border-radius:7px}.rb7stat small{display:block;color:#8296a8;font-size:9px}.rb7tbl{margin-top:10px;overflow:auto}.rb7tbl table,.rb7select table{width:100%;border-collapse:collapse}.rb7tbl th,.rb7tbl td,.rb7select th,.rb7select td{padding:8px;border-bottom:1px solid #263b4d;font-size:10px;text-align:left}.rb7tbl input{height:32px;min-width:105px}.rb7select{position:fixed;inset:18px;z-index:13000;background:#0e1a25;border:1px solid #456078;border-radius:14px;display:flex;flex-direction:column;box-shadow:0 30px 100px #000}.rb7select .top{padding:15px 18px;border-bottom:1px solid #2c4255;display:flex;gap:12px;align-items:center}.rb7select .top input{flex:1}.rb7select .list{overflow:auto;flex:1;padding:0 16px}.rb7select .bottom{padding:13px 18px;border-top:1px solid #2c4255;display:flex;justify-content:space-between;align-items:center}.rb7select tr:hover{background:#142635}@media(max-width:900px){.rb7grid{grid-template-columns:1fr 1fr}}</style>`,
    );
  }
  function next() {
    return (
      "R-" +
      String(
        Math.max(
          0,
          ...g(R).map(
            (x) => Number(String(x.number || "").replace(/\D/g, "")) || 0,
          ),
        ) + 1,
      ).padStart(3, "0")
    );
  }
  function open(initial = []) {
    css();
    document.querySelector(".rb7")?.remove();
    const p = pool(),
      ware = wh(),
      f = g(F, {}),
      today = RetailState.today(),
      selected = new Set(initial),
      delivery = new Map(),
      root = document.createElement("div");
    root.className = "rb7";
    root.innerHTML = `<div class="rb7box"><div class="rb7head"><div><b style="font-size:20px">🚚 Формування маршруту</b><div style="color:#8fa2b4;font-size:11px">Параметри рейсу та доставка по ТТ</div></div><button data-x>×</button></div><div class="rb7body"><div class="rb7grid"><label><small>Тип доставки *</small><select data-f="type"><option value="direct">Пряме поповнення з РЦ</option><option value="interwarehouse">Переміщення між складами</option></select></label><label><small>Дата рейсу *</small><input type="date" data-f="date" value="${today}"></label><label><small>Склад відправника *</small><select data-f="from"><option value="">— Оберіть —</option>${ware.map((x) => `<option value="${e(x.id || x.label)}">${e(x.label)}</option>`).join("")}</select></label><label data-to style="display:none"><small>Склад отримувач *</small><select data-f="to"><option value="">— Оберіть —</option>${ware.map((x) => `<option value="${e(x.id || x.label)}">${e(x.label)}</option>`).join("")}</select></label><label><small>Перевізник *</small><select data-f="carrier"><option value="">— Оберіть —</option>${(f.carriers || []).map((x) => `<option value="${e(typeof x === "string" ? x : x.id || x.name)}">${e(typeof x === "string" ? x : x.name)}</option>`).join("")}</select></label><label><small>Водій *</small><select data-f="driver"><option value="">— Оберіть —</option>${(f.drivers || []).map((x) => `<option value="${e(typeof x === "string" ? x : x.id || x.name)}">${e(x.name || x)}</option>`).join("")}</select></label><label><small>Авто *</small><select data-f="vehicle"><option value="">— Оберіть —</option>${(f.vehicles || []).map((x) => `<option value="${e(x.id || x.plate || x.name || x)}">${e([x.name, x.plate].filter(Boolean).join(" · ") || x)}</option>`).join("")}</select></label><label><small>Тариф, грн</small><input type="number" data-f="tariff"></label><label><small>Час виїзду</small><input type="time" data-f="departure"></label><label data-iwdate style="display:none"><small>Дата доставки на склад *</small><input type="date" data-f="iwdate" value="${today}"></label><label data-iwfrom style="display:none"><small>Прибуття з *</small><input type="time" data-f="iwfrom"></label><label data-iwto style="display:none"><small>Прибуття до *</small><input type="time" data-f="iwto"></label></div><div class="rb7pick"><div><b>ТТ / ВТ у маршруті</b><div style="font-size:10px;color:#8fa2b4">Вибір відкривається окремим повноекранним вікном</div></div><div class="rb7stats"><div class="rb7stat"><small>ТТ</small><b data-k="tt">0</b></div><div class="rb7stat"><small>Факт палет</small><b data-k="pal">0</b></div><div class="rb7stat"><small>Вага</small><b data-k="kg">0 кг</b></div><div class="rb7stat"><small>Сума</small><b data-k="sum">0 грн</b></div><button class="ops-primary" data-pick>+ Обрати ВТ</button></div></div><div class="rb7tbl" data-table></div></div><div class="rb7foot"><button data-x>Скасувати</button><button class="ops-primary" data-save>✓ Створити маршрут</button></div></div>`;
    document.body.appendChild(root);
    const val = (k) => root.querySelector(`[data-f=${k}]`)?.value || "";
    function chosen() {
      return p.filter((x) => selected.has(x.t.number));
    }
    function capture() {
      root
        .querySelectorAll("[data-row]")
        .forEach((tr) =>
          delivery.set(tr.dataset.row, {
            date: tr.querySelector("[data-delivery-date]").value,
            from: tr.querySelector("[data-arr-from]").value,
            to: tr.querySelector("[data-arr-to]").value,
          }),
        );
    }
    function draw() {
      capture();
      const a = chosen();
      root.querySelector("[data-k=tt]").textContent = a.length;
      root.querySelector("[data-k=pal]").textContent = r(
        a.reduce((q, x) => q + x.pal, 0),
      );
      root.querySelector("[data-k=kg]").textContent =
        r(a.reduce((q, x) => q + x.weight, 0)) + " кг";
      root.querySelector("[data-k=sum]").textContent = m(
        a.reduce((q, x) => q + x.sum, 0),
      );
      root.querySelector("[data-table]").innerHTML = a.length
        ? `<table><thead><tr><th>ВТ / Магазин</th><th>Адреса</th><th>Факт палет</th><th>Вага</th><th>Дата доставки</th><th>Час з</th><th>Час до</th></tr></thead><tbody>${a.map((x) => `<tr data-row="${e(x.t.number)}"><td><b>${e(x.t.number)}</b><br>${e(x.store)}</td><td>${e(x.address)}</td><td>${x.pal}</td><td>${x.weight} кг</td><td><input type="date" data-delivery-date value="${e(delivery.get(x.t.number)?.date || val("date") || today)}"></td><td><input type="time" data-arr-from value="${e(delivery.get(x.t.number)?.from || "")}"></td><td><input type="time" data-arr-to value="${e(delivery.get(x.t.number)?.to || "")}"></td></tr>`).join("")}</tbody></table>`
        : '<div style="padding:22px;text-align:center;color:#8296a8">ВТ ще не обрані.</div>';
      if (val("type") === "interwarehouse")
        root
          .querySelectorAll(
            "[data-delivery-date],[data-arr-from],[data-arr-to]",
          )
          .forEach((x) => (x.disabled = true));
    }
    function picker() {
      if (document.querySelector(".rb7select")) return;
      let modal = document.createElement("div");
      modal.className = "rb7select";
      modal.innerHTML = `<div class="top"><b style="font-size:18px">Обрати ВТ зі «Скомплектовано»</b><input data-search placeholder="Пошук за ВТ, магазином або адресою"><button data-all>Обрати всі</button><button data-close>×</button></div><div class="list"><table><thead><tr><th></th><th>ВТ</th><th>Магазин</th><th>Адреса</th><th>Док.</th><th>Факт палет</th><th>Вага</th><th>Сума</th></tr></thead><tbody>${p.map((x) => `<tr data-item><td><input type="checkbox" data-c value="${e(x.t.number)}" ${selected.has(x.t.number) ? "checked" : ""}></td><td><b>${e(x.t.number)}</b></td><td>${e(x.store)}</td><td>${e(x.address)}</td><td>${x.ds.length}</td><td>${x.pal}</td><td>${x.weight} кг</td><td>${m(x.sum)}</td></tr>`).join("")}</tbody></table></div><div class="bottom"><b data-count>Обрано: ${selected.size}</b><div><button data-close>Скасувати</button> <button class="ops-primary" data-ok>Додати обрані ВТ</button></div></div>`;
      document.body.appendChild(modal);
      const count = () =>
        (modal.querySelector("[data-count]").textContent =
          "Обрано: " + modal.querySelectorAll("[data-c]:checked").length);
      modal.onchange = count;
      modal.querySelector("[data-search]").oninput = (ev) => {
        const q = ev.target.value.toLowerCase();
        modal
          .querySelectorAll("[data-item]")
          .forEach(
            (tr) =>
              (tr.style.display = tr.textContent.toLowerCase().includes(q)
                ? "table-row"
                : "none"),
          );
      };
      modal.onclick = (ev) => {
        if (ev.target.closest("[data-close]")) modal.remove();
        if (ev.target.closest("[data-all]")) {
          modal.querySelectorAll("[data-c]").forEach((c) => (c.checked = true));
          count();
        }
        if (ev.target.closest("[data-ok]")) {
          selected.clear();
          modal
            .querySelectorAll("[data-c]:checked")
            .forEach((c) => selected.add(c.value));
          modal.remove();
          draw();
        }
      };
    }
    function updateFleet() {
      const carrier = val("carrier"),
        record = (f.carriers || []).find(
          (x) => (x.id || x.name || x) === carrier,
        ),
        name = record?.name || record || carrier;
      for (const [field, records] of [
        ["driver", f.drivers || []],
        ["vehicle", f.vehicles || []],
      ]) {
        const select = root.querySelector("[data-f=" + field + "]"),
          previous = select.value;
        select.innerHTML =
          '<option value="">— Оберіть —</option>' +
          records
            .filter(
              (x) =>
                (!x.carrierId && !x.carrier) ||
                x.carrierId === carrier ||
                x.carrier === carrier ||
                x.carrier === name,
            )
            .map(
              (x) =>
                '<option value="' +
                e(x.id || x.plate || x.name || x) +
                '">' +
                e(
                  field === "vehicle"
                    ? [x.name, x.plate].filter(Boolean).join(" · ") || x
                    : x.name || x,
                ) +
                "</option>",
            )
            .join("");
        if ([...select.options].some((x) => x.value === previous))
          select.value = previous;
        select.disabled = !carrier;
      }
    }
    updateFleet();
    root.onchange = (ev) => {
      if (ev.target.matches("[data-f=carrier]")) updateFleet();
      if (ev.target.matches("[data-f=type]")) {
        const iw = ev.target.value === "interwarehouse";
        root.querySelector("[data-to]").style.display = iw ? "block" : "none";
        root.querySelector("[data-iwdate]").style.display = iw
          ? "block"
          : "none";
        root.querySelector("[data-iwfrom]").style.display = iw
          ? "block"
          : "none";
        root.querySelector("[data-iwto]").style.display = iw ? "block" : "none";
        draw();
      }
    };
    let saving = false;
    root.onclick = RetailState.guard((ev) => {
      if (ev.target.closest("[data-x]")) root.remove();
      if (ev.target.closest("[data-pick]")) picker();
      if (ev.target.closest("[data-save]")) {
        if (saving) return;
        const a = chosen(),
          iw = val("type") === "interwarehouse";
        if (
          !val("date") ||
          !val("from") ||
          !val("carrier") ||
          !val("driver") ||
          !val("vehicle")
        )
          return alert(
            "Заповніть дату рейсу, склад, перевізника, водія та авто.",
          );
        if (
          iw &&
          (!val("to") || !val("iwdate") || !val("iwfrom") || !val("iwto"))
        )
          return alert(
            "Для міжскладського маршруту вкажіть склад отримувач, дату та інтервал прибуття.",
          );
        if (iw && val("from") === val("to"))
          return alert("Склад відправника та отримувач мають бути різними.");
        if (
          val("tariff") &&
          (!Number.isFinite(Number(val("tariff"))) || Number(val("tariff")) < 0)
        )
          return alert("Тариф має бути невід’ємним числом.");
        if (iw && (val("iwdate") < val("date") || val("iwfrom") >= val("iwto")))
          return alert("Перевірте дату та інтервал прибуття.");
        if (!a.length) return alert("Оберіть хоча б одну ВТ.");
        const freshPool = pool(),
          available = new Set(freshPool.map((x) => x.t.number));
        if (
          a.some(
            (x) =>
              JSON.stringify(x) !==
              JSON.stringify(freshPool.find((z) => z.t.number === x.t.number)),
          )
        )
          throw Error("Вантаж змінився. Відкрийте форму маршруту повторно.");
        if (a.some((x) => !available.has(x.t.number)))
          throw Error(
            "Обрані талони вже використані або змінені. Відкрийте форму повторно.",
          );
        const windows = {};
        if (!iw) {
          for (const x of a) {
            const tr = root.querySelector(
                `[data-row="${CSS.escape(x.t.number)}"]`,
              ),
              date = tr.querySelector("[data-delivery-date]").value,
              from = tr.querySelector("[data-arr-from]").value,
              to = tr.querySelector("[data-arr-to]").value;
            if (!date || !from || !to)
              return alert(
                "Для кожної ТТ вкажіть дату доставки та інтервал часу.",
              );
            if (date < val("date") || from >= to)
              return alert(
                "Дата доставки має бути не раніше рейсу; час до — пізніше часу з.",
              );
            windows[x.t.number] = { date, from, to };
          }
        }
        const route = {
          number: next(),
          type: iw ? "Міжскладське переміщення" : "Пряме поповнення",
          deliveryType: iw ? "interwarehouse" : "direct",
          status: "Створено",
          ticketIds: a.map((x) => x.t.number),
          warehouse:
            ware.find((x) => (x.id || x.label) === val("from"))?.label || "",
          warehouseId: val("from"),
          destinationWarehouse: iw
            ? ware.find((x) => (x.id || x.label) === val("to"))?.label || ""
            : "",
          destinationWarehouseId: iw ? val("to") : "",
          carrier:
            root.querySelector("[data-f=carrier]").selectedOptions[0]
              .textContent,
          carrierId: val("carrier"),
          driver:
            root.querySelector("[data-f=driver]").selectedOptions[0]
              .textContent,
          driverId: val("driver"),
          vehicle:
            (f.vehicles || []).find(
              (x) => (x.id || x.plate || x.name || x) === val("vehicle"),
            )?.plate || val("vehicle"),
          vehicleId: val("vehicle"),
          date: val("date"),
          departure: val("departure"),
          tariff: val("tariff"),
          arrivalWindows: windows,
          interwarehouseDelivery: iw
            ? { date: val("iwdate"), from: val("iwfrom"), to: val("iwto") }
            : null,
          createdAt: new Date().toISOString(),
        };
        saving = true;
        const button = root.querySelector("[data-save]");
        button.disabled = true;
        button.textContent = "Збереження…";
        try {
          const keys = new Set(a.flatMap((x) => x.ds.map(RetailState.docKey)));
          RetailState.commit({
            [R]: [route, ...g(R)],
            [D]: g(D).map((d) =>
              keys.has(RetailState.docKey(d))
                ? {
                    ...d,
                    route: route.number,
                    status: "У маршруті",
                    workflowStatus: "routed",
                  }
                : d,
            ),
          });
          root.remove();
          window.RetailRoutes?.render?.();
          RetailState.notice(
            "Маршрут " + route.number + " збережено.",
            "success",
          );
        } finally {
          if (root.isConnected) {
            saving = false;
            button.disabled = false;
            button.textContent = "✓ Створити маршрут";
          }
        }
      }
    });
    draw();
  }
  window.RetailRouteBuilderV7 = { open: RetailState.guard(open) };
})();
