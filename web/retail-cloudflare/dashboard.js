/* Presentation navigation. Feature workspaces own their active hashes. */
(() => {
  const dashboard = document.querySelector(".dashboard"),
    ops = () => document.getElementById("ops-documents"),
    links = [...document.querySelectorAll(".side nav a")],
    byText = (t) => links.find((a) => a.textContent.trim() === t);
  byText("Консолідація")?.remove();
  byText("Тарифи")?.remove();
  const mapping = {
    "База Excel": "#base-excel",
    Маршрути: "#routes-page",
    "Талони комплектації": "#picking-tickets",
    Скомплектовано: "#completed",
    "Журнал ТТН": "#ttn-journal",
    "Магазини WT": "#stores-page",
    Склади: "#warehouses-page",
    Перевізники: "#carriers-page",
    Аналітика: "#analytics-page",
    Довідники: "#references-page",
    Користувачі: "#users-page",
    Налаштування: "#settings-page",
  };
  Object.entries(mapping).forEach(([t, h]) => {
    const a = byText(t);
    if (a) a.href = h;
  });
  const titles = {
      "stores-page": ["Магазини WT", "Довідник магазинів WineTime"],
      "warehouses-page": ["Склади", "Довідник складів та хабів"],
      "carriers-page": ["Перевізники", "Довідник перевізників і транспорту"],
      "analytics-page": ["Аналітика", "Операційна статистика Retail"],
      "references-page": ["Довідники", "Системні довідники Retail"],
      "users-page": ["Користувачі", "Керування користувачами та ролями"],
      "settings-page": ["Налаштування", "Налаштування модуля Retail"],
    },
    owned = new Set([
      "base-excel",
      "routes-page",
      "picking-tickets",
      "completed",
      "ttn-journal",
      "interwarehouse",
    ]);
  function active(hash) {
    let done = false;
    links.forEach((a) => {
      const m = !done && a.getAttribute("href") === hash;
      a.classList.toggle("active", m);
      if (m) done = true;
    });
  }
  function dev(key) {
    dashboard?.classList.add("ops-hidden");
    const h = ops();
    if (!h) return;
    h.hidden = false;
    h.style.display = "block";
    const [t, d] = titles[key] || ["Розділ", "Функціонал готується"];
    h.innerHTML = `<div class="ops-page-title"><div><h2>${t}</h2><small>${d}</small></div></div><div style="min-height:520px;display:grid;place-items:center"><h2>Розділ у розробці</h2></div>`;
  }
  function navigate() {
    const key = location.hash.slice(1) || "home";
    document.documentElement.dataset.retailPage = key;
    if (key === "home") {
      const h = ops();
      if (h) {
        h.hidden = true;
        h.style.display = "none";
      }
      dashboard?.classList.remove("ops-hidden");
      active("#home");
      return;
    }
    if (owned.has(key)) {
      dashboard?.classList.add("ops-hidden");
      const h = ops();
      if (h) {
        h.hidden = false;
        h.style.display = "block";
      }
      active(key === "interwarehouse" ? "#routes-page" : "#" + key);
      return;
    }
    if (titles[key]) {
      dev(key);
      active("#" + key);
      return;
    }
    location.hash = "home";
  }
  window.addEventListener("hashchange", () => setTimeout(navigate, 0));
  setTimeout(navigate, 0);
})();
