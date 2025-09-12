(function () {
  const API = window.EMPIRE && window.EMPIRE.API_URL;
  const $  = (id) => document.getElementById(id);
  const $m = (n) => "$" + (Number(n)||0).toFixed(2);
  const $p = (n) => (Number(n)||0).toFixed(2) + "%";
  const $i = (n) => (Number(n)||0).toLocaleString();

  function rowsToTbody(tbodyId, entries, money=true, dateSort=false){
    const tb = $(tbodyId); if (!tb) return;
    const arr = Object.entries(entries||{});
    if (dateSort) arr.sort((a,b)=> new Date(a[0]) - new Date(b[0]));
    else          arr.sort((a,b)=> Number(b[1]) - Number(a[1]));
    tb.innerHTML = arr.map(([k,v]) =>
      `<tr><td>${k}</td><td class="num">${money? $m(v) : $i(v)}</td></tr>`
    ).join("") || `<tr><td colspan="2" class="muted">No data</td></tr>`;
  }

  async function loadOverview(){
    try{
      if(!API){ console.warn("[OV] Missing EMPIRE.API_URL"); return; }
      const res = await fetch(API + "?t=" + Date.now(), {cache:"no-store"});
      if(!res.ok) throw new Error("HTTP "+res.status);
      const data = await res.json();
      console.log("[OV] payload:", data);

      // Totals: supports convRate OR conversionRate
      const t = data.totals || {};
      const totals = {
        earnings: t.earnings||0,
        leads: t.leads||0,
        clicks: t.clicks||0,
        conv: t.convRate ?? t.conversionRate ?? 0,
        epc: t.epc||0, cpa: t.cpa||0, rpm: t.rpm||0
      };

      $("ov-earnings").textContent = $m(totals.earnings);
      $("ov-leads").textContent    = $i(totals.leads);
      $("ov-clicks").textContent   = $i(totals.clicks);
      $("ov-convrate").textContent = $p(totals.conv);
      $("ov-epc").textContent      = $m(totals.epc);
      $("ov-cpa").textContent      = $m(totals.cpa);
      $("ov-rpm").textContent      = $m(totals.rpm);

      // Breakdowns: supports both shapes
      const B = data.breakdowns || {};
      const byGeo       = B.byGeo       || data.geo        || {};
      const byDevice    = B.byDevice    || data.devices    || {};
      const byOfferType = B.byOfferType || data.offerTypes || {};
      const byDay       = B.byDay       || data.byDay      || {};

      rowsToTbody("tbl-geo",       byGeo);
      rowsToTbody("tbl-device",    byDevice);
      rowsToTbody("tbl-offerType", byOfferType);
      rowsToTbody("tbl-byDay",     byDay, true, true);
    }catch(err){
      console.error("[OV] failed:", err);
    }
  }

  window.loadOverview = loadOverview;
  // fire once on first paint too
  window.addEventListener("DOMContentLoaded", loadOverview);
})();