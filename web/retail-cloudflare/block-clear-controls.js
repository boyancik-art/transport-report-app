(() => {
  const KEYS = {
    "base-excel": [
      "tc_retail_docs_v2",
      "tc_retail_docs_v3",
      "tc_retail_imports_v1",
    ],
    "picking-tickets": ["tc_retail_tickets_v1"],
    completed: ["tc_retail_tickets_v1"],
    "routes-page": ["tc_retail_routes_v1"],
    interwarehouse: ["tc_retail_interwarehouse_v1"],
    "ttn-journal": ["tc_retail_ttn_journal_v1"],
  };
  const labels = {
    "base-excel": "базу Excel",
    "picking-tickets": "талони комплектації",
    completed: "блок «Скомплектовано»",
    "routes-page": "маршрути",
    interwarehouse: "міжскладські рейси",
    "ttn-journal": "журнал ТТН",
  };
  function run() {
    const key = location.hash.slice(1);
    if (!KEYS[key]) return;
    const h = document.getElementById("ops-documents");
    if (!h) return;
    const head = h.querySelector(".ops-page-title");
    if (!head || head.querySelector("[data-clear-block]")) return;
    const b = document.createElement("button");
    b.dataset.clearBlock = "1";
    b.textContent = "Очистити блок";
    b.title =
      "Очищає лише локальні дані цього блоку. У базу даних нічого не записується.";
    b.style.cssText = "opacity:.72;margin-left:8px";
    b.onclick = RetailState.guard(() => {
      if (
        !confirm(
          `Очистити ${labels[key]}? Це видалить лише локальні дані браузера, без збереження в базі.`,
        )
      )
        return;
      if (
        [
          "base-excel",
          "picking-tickets",
          "completed",
          "routes-page",
          "interwarehouse",
          "ttn-journal",
        ].includes(key)
      ) {
        const dependent =
          key === "base-excel"
            ? [
                "tc_retail_tickets_v1",
                "tc_retail_routes_v1",
                "tc_retail_interwarehouse_v1",
                "tc_retail_ttn_journal_v1",
              ]
            : key === "ttn-journal"
              ? ["tc_retail_routes_v1", "tc_retail_interwarehouse_v1"]
              : ["tc_retail_routes_v1", "tc_retail_ttn_journal_v1"];
        if (
          dependent.some(
            (k) => !KEYS[key].includes(k) && RetailState.read(k).length,
          )
        )
          return RetailState.notice(
            "Очищення заблоковано: існують пов’язані талони, маршрути або ТТН.",
          );
      }
      RetailState.commit(Object.fromEntries(KEYS[key].map((k) => [k, []])));
      location.reload();
    });
    head.appendChild(b);
  }
  window.RetailClearControls = { render: run };
  window.addEventListener("retail:rendered", run);
})();
