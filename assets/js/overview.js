// assets/js/overview.js
// ----- Overview loader & renderer (2-dp rounding) -----

(function () {
  const $ = (id) => document.getElementById(id);

  const fmt2 = (n, with$ = false) => {
    if (n == null || isNaN(n)) n = 0;
    const s = Number(n).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return with$ ? `$${s}` : s;
  };

  const pct2 = (n) =>
    (n == null || isNaN(n) ? 0 : n).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }) + "%";

  function tableFromObject(obj, keyHeader, valHeader, money = false) {
    if (!obj || typeof obj !== "object") return "<div class=\"muted\">No data</div>";
    const rows = Object.entries(obj)
      .sort((a, b) => Number(b[1]) - Number(a[1]))
      .map(
        ([k, v]) =>
          `<tr><td>${k}</td><td class="num">${money ? fmt2(v, true) : fmt2(v)}</td></tr>`
      )
      .join("");
    return `
      <table>
        <thead><tr><th>${keyHeader}</th><th>${valHeader}</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>`;
  }

  function tableFromArray(obj, keyHeader, valHeader, money = false) {
    if (!obj || typeof obj !== "object") return "<div class=\"muted\">No data</div>";
    const rows = Object.keys(obj)
      .sort() // dates asc
      .map(
        (k) =>
          `<tr><td>${k}</td><td class="num">${money ? fmt2(obj[k], true) : fmt2(obj[k])}</td></tr>`
      )
      .join("");
    return `
      <table>
        <thead><tr><th>${keyHeader}</th><th>${valHeader}</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>`;
  }

  // ---- RENDER ----
  window.renderOverview = function renderOverview(d) {
    if (!d) return;

    // Support both shapes: {ok:true, totals:{...}} OR flat keys
    const t = d.totals || d;

    $("ov-earnings").textContent   = fmt2(t.earnings, true);
    $("ov-leads").textContent      = fmt2(t.leads);
    $("ov-clicks").textContent     = fmt2(t.clicks);
    $("ov-convrate").textContent   = pct2(t.conversionRate);
    $("ov-epc").textContent        = fmt2(t.epc, true);
    $("ov-cpa").textContent        = fmt2(t.cpa, true);
    $("ov-rpm").textContent        = fmt2(t.rpm, true);

    // Breakdowns
    $("tbl-geo").innerHTML        = tableFromObject(d.geo,        "Country", "Earnings ($)", true);
    $("tbl-device").innerHTML     = tableFromObject(d.devices,    "Device",  "Earnings ($)", true);
    $("tbl-offerType").innerHTML  = tableFromObject(d.offerTypes, "Offer",   "Earnings ($)", true);
    $("tbl-byDay").innerHTML      = tableFromArray (d.byDay,      "Date",    "Earnings ($)", true);
  };

  // ---- LOAD ----
  window.loadOverview = async function loadOverview() {
    const base = (window.EMPIRE_API && window.EMPIRE_API.BASE_URL) || "";
    // cache-buster because mobile caches hard
    const bust = `_=${Date.now()}`;

    try {
      // 1) Try raw endpoint (matches your working URL)
      let res = await fetch(`${base}?${bust}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      let d = await res.json();

      // Some deployments expect ?action=overview; if totals are missing, try again
      if (!d || (!d.totals && d.ok === false)) {
        const res2 = await fetch(`${base}?action=overview&${bust}`);
        if (!res2.ok) throw new Error(`HTTP ${res2.status}`);
        d = await res2.json();
      }

      window.renderOverview(d);
    } catch (e) {
      console.error("Overview load failed:", e);
      // Show something instead of zeros if fetch fails
      $("tbl-geo").innerHTML = `<div class="muted">Failed to load overview (${e.message})</div>`;
    }
  };
})();