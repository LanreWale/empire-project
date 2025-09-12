// assets/js/overview.js
(function () {
  const API_URL =
    (window.EMPIRE && window.EMPIRE.API_URL) ||
    (window.EMPIRE_API && window.EMPIRE_API.BASE_URL);

  const $ = (id) => document.getElementById(id);

  const fmtMoney = (n) =>
    `$${(Number(n) || 0).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const fmtPct = (n) =>
    `${(Number(n) || 0).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}%`;

  // Normalize totals across both payload variants
  function pickTotals(data) {
    const t = data.totals || {};
    return {
      earnings: +t.earnings || 0,
      leads: +t.leads || 0,
      clicks: +t.clicks || 0,
      convRate:
        t.convRate !== undefined
          ? +t.convRate
          : t.conversionRate !== undefined
          ? +t.conversionRate
          : 0,
      epc: +t.epc || 0,
      cpa: +t.cpa || 0,
      rpm: +t.rpm || 0,
    };
  }

  // Normalize breakdowns across both payload variants
  function pickBreakdowns(data) {
    const b = data.breakdowns || {};
    return {
      byGeo: b.byGeo || data.geo || {},
      byDevice: b.byDevice || data.devices || {},
      byOfferType: b.byOfferType || data.offerTypes || {},
      byDay: b.byDay || data.byDay || {},
    };
  }

  function renderTotals(t) {
    $("ov-earnings").textContent = fmtMoney(t.earnings);
    $("ov-leads").textContent = (t.leads || 0).toLocaleString();
    $("ov-clicks").textContent = (t.clicks || 0).toLocaleString();
    $("ov-convrate").textContent = fmtPct(t.convRate);
    $("ov-epc").textContent = fmtMoney(t.epc);
    $("ov-cpa").textContent = fmtMoney(t.cpa);
    $("ov-rpm").textContent = fmtMoney(t.rpm);
  }

  function clearTbody(id) {
    const el = $(id);
    if (el) el.innerHTML = "";
    return el;
  }

  function addRow(tbody, cols) {
    const tr = document.createElement("tr");
    cols.forEach((c, i) => {
      const td = document.createElement("td");
      td.textContent = c;
      if (i === 1) td.className = "num";
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  }

  function renderKVTable(tbodyId, obj, sortDesc = true) {
    const tbody = clearTbody(tbodyId);
    if (!tbody) return;

    const entries = Object.entries(obj || {});
    entries.sort((a, b) =>
      sortDesc ? Number(b[1]) - Number(a[1]) : Number(a[1]) - Number(b[1])
    );

    if (entries.length === 0) return;

    entries.forEach(([k, v]) => addRow(tbody, [k, fmtMoney(v)]));
  }

  function renderByDay(tbodyId, obj) {
    const tbody = clearTbody(tbodyId);
    if (!tbody) return;

    const entries = Object.entries(obj || {}).map(([k, v]) => {
      // Try to normalize dates like "Tue Jul 01 2025 08:00:00 GMT+0100 (...)"
      const d = new Date(k);
      const label = isNaN(d.getTime())
        ? k
        : d.toISOString().slice(0, 10); // YYYY-MM-DD
      return [label, v];
    });

    entries.sort((a, b) => (a[0] < b[0] ? -1 : 1));

    entries.forEach(([label, val]) => addRow(tbody, [label, fmtMoney(val)]));
  }

  async function fetchOverview() {
    if (!API_URL) throw new Error("Missing API URL (config.js)");
    const url = `${API_URL}?_=${Date.now()}`; // cache-bust
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`API HTTP ${res.status}`);
    return res.json();
  }

  async function load() {
    try {
      const data = await fetchOverview();

      // Defensive logging for quick verification in console
      console.log("Overview data:", data);

      const totals = pickTotals(data);
      const br = pickBreakdowns(data);

      renderTotals(totals);
      renderKVTable("tbl-geo", br.byGeo, true);
      renderKVTable("tbl-device", br.byDevice, true);
      renderKVTable("tbl-offerType", br.byOfferType, true);
      renderByDay("tbl-byDay", br.byDay);
    } catch (err) {
      console.error("Overview load error:", err);
      // Leave the zeros in place; you’ll see the error in Console.
    }
  }

  // Expose for the tab router
  window.loadOverview = load;
})();