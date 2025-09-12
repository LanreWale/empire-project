/* assets/js/overview.js
 * Populates the Overview tab from the GAS endpoint.
 * Expects config.js to define GAS_ENDPOINT. Falls back to the hardcoded URL below.
 */

(function () {
  // ---- CONFIG ----
  const ENDPOINT =
    (typeof window !== "undefined" && window.GAS_ENDPOINT) ||
    "https://script.google.com/macros/s/AKfycbz-jj7Cr_KzqCku4SQPQ14MEIuCPdq5OEgiiqjo_O2A0FItBrHlmfkoJHViDxuX4P6z/exec";

  // ---- HELPERS ----
  const $ = (sel) => document.querySelector(sel);

  const formatUSD = (n) =>
    isFinite(n) ? `$${Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "$0.00";

  const formatNum = (n) =>
    isFinite(n) ? Number(n).toLocaleString(undefined) : "0";

  const formatPct = (n) =>
    isFinite(n) ? `${Number(n).toFixed(2)}%` : "0.00%";

  function fillTable(tbodyEl, rows) {
    tbodyEl.innerHTML = rows
      .map(
        (r) =>
          `<tr><td>${r[0]}</td><td class="num">${formatUSD(r[1])}</td></tr>`
      )
      .join("");
  }

  function safeGet(obj, path, fallback = 0) {
    try {
      const val = path.split(".").reduce((a, k) => (a ? a[k] : undefined), obj);
      return val == null ? fallback : val;
    } catch {
      return fallback;
    }
  }

  async function fetchOverview() {
    const url = ENDPOINT + (ENDPOINT.includes("?") ? "&" : "?") + "_ts=" + Date.now();
    const res = await fetch(url, { credentials: "omit" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  // ---- MAIN LOADER ----
  async function loadOverview() {
    try {
      // show placeholders (prevents “all zeros” feelings during fetch)
      $("#ov-earnings").textContent = "…";
      $("#ov-leads").textContent = "…";
      $("#ov-clicks").textContent = "…";
      $("#ov-convrate").textContent = "…";
      $("#ov-epc").textContent = "…";
      $("#ov-cpa").textContent = "…";
      $("#ov-rpm").textContent = "…";
      $("#tbl-geo").innerHTML =
        '<tr><td class="muted" colspan="2">Loading…</td></tr>';
      $("#tbl-device").innerHTML =
        '<tr><td class="muted" colspan="2">Loading…</td></tr>';
      $("#tbl-offerType").innerHTML =
        '<tr><td class="muted" colspan="2">Loading…</td></tr>';
      $("#tbl-byDay").innerHTML =
        '<tr><td class="muted" colspan="2">Loading…</td></tr>';

      const data = await fetchOverview();
      if (!data || data.ok !== true) throw new Error("Invalid payload");

      // Totals
      const totals = data.totals || {};
      $("#ov-earnings").textContent = formatUSD(totals.earnings);
      $("#ov-leads").textContent = formatNum(totals.leads);
      $("#ov-clicks").textContent = formatNum(totals.clicks);
      $("#ov-convrate").textContent = formatPct(totals.conversionRate);
      $("#ov-epc").textContent = formatUSD(totals.epc);
      $("#ov-cpa").textContent = formatUSD(totals.cpa);
      $("#ov-rpm").textContent = formatUSD(totals.rpm);

      // By Geo
      const geo = safeGet(data, "geo", {});
      const geoRows = Object.entries(geo)
        .sort((a, b) => b[1] - a[1]);
      $("#tbl-geo").innerHTML = "";
      fillTable($("#tbl-geo"), geoRows);

      // By Device
      const devices = safeGet(data, "devices", {});
      const deviceRows = Object.entries(devices)
        .sort((a, b) => b[1] - a[1]);
      $("#tbl-device").innerHTML = "";
      fillTable($("#tbl-device"), deviceRows);

      // By Offer Type
      const offerTypes = safeGet(data, "offerTypes", {});
      const offerRows = Object.entries(offerTypes)
        .sort((a, b) => b[1] - a[1]);
      $("#tbl-offerType").innerHTML = "";
      fillTable($("#tbl-offerType"), offerRows);

      // By Day
      const byDay = safeGet(data, "byDay", {});
      const dayRows = Object.entries(byDay)
        .sort((a, b) => (a[0] < b[0] ? -1 : 1))
        .map(([d, v]) => [d, v]);
      $("#tbl-byDay").innerHTML = dayRows
        .map(
          (r) =>
            `<tr><td>${r[0]}</td><td class="num">${formatUSD(r[1])}</td></tr>`
        )
        .join("");

    } catch (err) {
      console.error("Overview load failed:", err);
      // graceful fallback UI
      const failMsg =
        '<tr><td class="muted" colspan="2">No data</td></tr>';
      $("#tbl-geo").innerHTML = failMsg;
      $("#tbl-device").innerHTML = failMsg;
      $("#tbl-offerType").innerHTML = failMsg;
      $("#tbl-byDay").innerHTML = failMsg;
      $("#ov-earnings").textContent = "$0.00";
      $("#ov-leads").textContent = "0";
      $("#ov-clicks").textContent = "0";
      $("#ov-convrate").textContent = "0.00%";
      $("#ov-epc").textContent = "$0.00";
      $("#ov-cpa").textContent = "$0.00";
      $("#ov-rpm").textContent = "$0.00";
    }
  }

  // expose for the tab router
  window.loadOverview = loadOverview;
})();