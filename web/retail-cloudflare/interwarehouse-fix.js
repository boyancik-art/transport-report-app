(() => {
  const V2 = "tc_retail_docs_v2",
    V3 = "tc_retail_docs_v3",
    X = "tc_retail_interwarehouse_v1";
  const get = (k, d = []) =>
      k === "tc_retail_docs_v3"
        ? RetailState.documents()
        : RetailState.read(k, d),
    set = (k, v) => RetailState.write(k, v);
  function enhance() {
    if (location.hash !== "#interwarehouse") return;
    const host = document.getElementById("ops-documents");
    if (!host) return;
    host.querySelectorAll(".iw-card[data-id]").forEach((card) => {
      if (card.querySelector("[data-iw-delete]")) return;
      const id = card.dataset.id,
        actions = card.querySelector(".iw-actions");
      if (!actions) return;
      const b = document.createElement("button");
      b.dataset.iwDelete = "1";
      b.textContent = "Видалити рейс";
      b.style.marginRight = "auto";
      b.onclick = RetailState.guard(() => {
        if (get("tc_retail_ttn_journal_v1").some((x) => x.route === id))
          return RetailState.notice(
            "Рейс пов’язаний з ТТН і не може бути видалений.",
          );
        if (!confirm(`Видалити ${id}?`)) return;
        set(
          X,
          get(X).filter((x) => x.id !== id),
        );
        window.RetailInterwarehouse.render();
      });
      actions.prepend(b);
    });
  }
  window.RetailInterwarehouseEnhance = enhance;
})();
