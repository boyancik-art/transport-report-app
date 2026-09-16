/* Preserve the existing Preview test fleet without rewriting it on every load. */
(() => {
  const key = "tc_retail_fleet_v1";
  RetailState.guard(() => {
    const raw = localStorage.getItem(key);
    const fleet = raw === null ? {} : JSON.parse(raw);
    if (!fleet || Array.isArray(fleet) || typeof fleet !== "object")
      throw Error("Некоректний довідник транспорту. Дані залишено без змін.");
    let changed = false;
    for (const field of ["carriers", "drivers", "vehicles"]) {
      if (fleet[field] === undefined) {
        fleet[field] = [];
        changed = true;
      }
      if (!Array.isArray(fleet[field]))
        throw Error(
          "Некоректний список транспорту: " +
            field +
            ". Дані залишено без змін.",
        );
    }
    const has = (a, name) =>
      a.some(
        (x) =>
          String(
            typeof x === "string" ? x : x?.name || x?.plate || "",
          ).trim() === name,
      );
    if (!has(fleet.carriers, "Тест 1")) {
      fleet.carriers.push({ id: "TEST-CARRIER-1", name: "Тест 1" });
      changed = true;
    }
    if (!has(fleet.drivers, "Тест 1")) {
      fleet.drivers.push({
        id: "TEST-DRIVER-1",
        name: "Тест 1",
        license: "Тест 1",
        phone: "Тест 1",
      });
      changed = true;
    }
    if (
      !fleet.vehicles.some(
        (x) =>
          String(typeof x === "string" ? x : x?.name || "").trim() ===
            "Тест 1" || String(x?.plate || "").trim() === "Тест 1",
      )
    ) {
      fleet.vehicles.push({
        id: "TEST-VEHICLE-1",
        name: "Тест 1",
        brand: "Тест 1",
        model: "Тест 1",
        plate: "Тест 1",
      });
      changed = true;
    }
    if (changed) RetailState.write(key, fleet);
  })();
})();
