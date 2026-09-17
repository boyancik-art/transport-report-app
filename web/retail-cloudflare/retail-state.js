/* Shared persistence for existing operational records; protected directories are read-only here. */
(() => {
  const allowed = new Set([
    "tc_retail_docs_v2",
    "tc_retail_docs_v3",
    "tc_retail_imports_v1",
    "tc_retail_tickets_v1",
    "tc_retail_routes_v1",
    "tc_retail_fleet_v1",
    "tc_retail_interwarehouse_v1",
    "tc_retail_ttn_journal_v1",
    "tc_retail_loading_register_v1",
    "tc_retail_orders_v1",
  ]);
  const bad = new Set();
  let feedbackTimer;
  function notice(message, kind = "error") {
    let box = document.getElementById("retail-feedback");
    if (!box) {
      box = document.createElement("div"); box.id = "retail-feedback"; box.setAttribute("role", "status"); box.setAttribute("aria-live", "polite"); document.body.append(box);
    }
    clearTimeout(feedbackTimer); if (kind === "success") feedbackTimer = setTimeout(() => (box.hidden = true), 5000);
    box.dataset.kind = kind; box.textContent = message; box.hidden = false;
    const close = document.createElement("button"); close.type = "button"; close.textContent = "×"; close.setAttribute("aria-label", "Закрити повідомлення"); close.onclick = () => (box.hidden = true); box.append(close);
  }
  function read(key, fallback = []) {
    try { const raw = localStorage.getItem(key); if (raw === null) return structuredClone(fallback); const value = JSON.parse(raw);
      if (Array.isArray(fallback) ? !Array.isArray(value) : !value || typeof value !== "object" || Array.isArray(value)) throw Error("Некоректний формат");
      if (allowed.has(key) && Array.isArray(value) && value.some((x) => !x || typeof x !== "object" || Array.isArray(x))) throw Error("Некоректний запис у списку");
      bad.delete(key); return value;
    } catch (error) { bad.add(key); notice("Не вдалося прочитати локальні дані (" + key + "). Збереження заблоковано; дані не очищено."); return structuredClone(fallback); }
  }
  function commit(changes) {
    const previous = new Map(), written = [];
    try {
      for (const [key, value] of Object.entries(changes)) { if (!allowed.has(key)) throw Error("Запис до захищеного довідника заборонено"); const old = localStorage.getItem(key); if (old !== null) { const parsed = JSON.parse(old); if (!parsed || typeof parsed !== "object" || Array.isArray(parsed) !== Array.isArray(value)) throw Error("Некоректний формат наявних даних"); } if (bad.has(key)) throw Error("Спочатку відновіть доступ до локальних даних"); previous.set(key, old); }
      const encoded = Object.entries(changes).map(([key, value]) => [key, JSON.stringify(value)]); for (const [key, value] of encoded) { localStorage.setItem(key, value); written.push(key); }
    } catch (error) { for (const key of written.reverse()) { try { const old = previous.get(key); if (old === null) localStorage.removeItem(key); else localStorage.setItem(key, old); } catch {} } notice("Не вдалося зберегти: " + error.message + ". Перевірте доступ і вільне місце у сховищі браузера."); throw error; }
  }
  const write = (key, value) => commit({ [key]: value });
  const documents = () => { try { return localStorage.getItem("tc_retail_docs_v3") !== null ? read("tc_retail_docs_v3") : read("tc_retail_docs_v2"); } catch { return read("tc_retail_docs_v3"); } };
  const docKey = (d) => String(d.key || [d.id, d.date, d.senderWarehouse, d.receiverWarehouse].join("|"));
  function docsFor(ticket, all = documents()) { if (Array.isArray(ticket.documentKeys)) return ticket.documentKeys.map((key) => { const matches = all.filter((d) => docKey(d) === key); if (matches.length !== 1) throw Error("Документ талона відсутній або неоднозначний: " + key); return matches[0]; }); return (ticket.documentIds || []).map((id) => { const matches = all.filter((d) => String(d.id) === String(id)); if (matches.length !== 1) throw Error("Неоднозначний або відсутній документ № " + id + ". Потрібна перевірка зв’язку талона."); return matches[0]; }); }
  const nextNumber = (list, field, prefix, width) => prefix + String(list.reduce((max, x) => Math.max(max, Number(String(x[field] || "").replace(/\D/g, "")) || 0), 0) + 1).padStart(width, "0");
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g,(c) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[c]);
  function guard(fn) { return (...args) => { try { const result = fn(...args); if (result?.catch) result.catch((error) => notice(error.message)); return result; } catch (error) { notice(error.message); } }; }
  let excel; function loadExcel() { if (window.XLSX) return Promise.resolve(window.XLSX); if (excel) return excel; excel = new Promise((resolve, reject) => { const script = document.createElement("script"); const timer = setTimeout(() => fail(), 15000); function fail() { clearTimeout(timer); script.remove(); excel = null; reject(Error("Модуль Excel не завантажився. Перевірте мережу та повторіть.")); } script.src="https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js"; script.onload=()=>{clearTimeout(timer);if(window.XLSX)resolve(window.XLSX);else fail()};script.onerror=fail;document.head.append(script); }); return excel; }
  const today = () => { const parts = new Intl.DateTimeFormat("en-CA", {timeZone:"Europe/Kyiv",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date()); const part=(k)=>parts.find((p)=>p.type===k).value; return part("year")+"-"+part("month")+"-"+part("day"); };
  window.RetailState={today,read,write,commit,documents,docKey,docsFor,nextNumber,notice,esc,guard,loadExcel};
})();
