/* Overview renderer: maps GAS JSON -> DOM (2 decimals) */

(function () {
  const $ = (id) => document.getElementById(id);

  const money = (v) => "$" + (Number(v||0)).toFixed(2);
  const num2  = (v) => (Number(v||0)).toFixed(2);
  const pct2  = (v) => (Number(v||0)).toFixed(2) + "%";

  function tableFromObject(obj, keyLabel, valLabel) {
    if (!obj || (typeof obj !== "object")) return "";
    const rows = Array.isArray(obj)
      ? obj.map(r => [r[keyLabel] ?? r.date ?? r.name ?? "", r[valLabel] ?? r.earnings ?? r.value ?? 0])
      : Object.entries(obj).map(([k,v]) => [k, v]);
    if (!rows.length) return "";
    const trs = rows.map(([k,v]) =>
      `<tr><td>${k}</td><td class="num">${money(v)}</td></tr>`).join("");
    return `<table><thead><tr><th>${keyLabel}</th><th class="num">Earnings ($)</th></tr></thead><tbody>${trs}</tbody></table>`;
  }

  window.renderOverview = function (data) {
    try {
      // accept both {ok:true, totals:{...}} or a flat object
      const t = (data && (data.totals || data.total || data)) || {};
      const b = data?.breakdowns || data?.by || {};

      // common alt-key fallbacks
      const conv = t.convRate ?? t.convrate ?? t.conversionRate ?? 0;
      const epc  = t.epc ?? t.EPC ?? 0;
      const cpa  = t.cpa ?? t.CPA ?? 0;
      const rpm  = t.rpm ?? t.RPM ?? 0;

      $("ov-earnings").textContent = money(t.earnings ?? t.revenue ?? 0);
      $("ov-leads").textContent    = num2(t.leads ?? 0);
      $("ov-clicks").textContent   = num2(t.clicks ?? 0);
      $("ov-convrate").textContent = pct2(conv);
      $("ov-epc").textContent      = money(epc);
      $("ov-cpa").textContent      = money(cpa);
      $("ov-rpm").textContent      = money(rpm);

      // breakdowns – flexible key support
      const byGeo       = data.byGeo       || b.byGeo       || b.geo       || {};
      const byDevice    = data.byDevice    || b.byDevice    || b.device    || {};
      const byOfferType = data.byOfferType || b.byOfferType || b.offerType || b.byOffer || {};
      const byDay       = data.byDay       || b.byDay       || [];

      $("tbl-geo").innerHTML       = tableFromObject(byGeo, "Country", "Earnings");
      $("tbl-device").innerHTML    = tableFromObject(byDevice, "Device", "Earnings");
      $("tbl-offerType").innerHTML = tableFromObject(byOfferType, "Offer", "Earnings");
      $("tbl-byDay").innerHTML     = Array.isArray(byDay) && byDay.length
        ? `<table><thead><tr><th>Date</th><th class="num">Earnings ($)</th></tr></thead><tbody>${
            byDay.map(r=>`<tr><td>${r.date||r.day||""}</td><td class="num">${money(r.earnings||r.revenue||0)}</td></tr>`).join("")
          }</tbody></table>`
        : "";
    } catch (e) {
      console.error("renderOverview failed:", e, data);
    }
  };
})();