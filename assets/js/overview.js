/* ===== Self-contained Overview (fetch + render + on-screen diagnostics) ===== */
(function () {
  const $ = id => document.getElementById(id);
  const money = v => "$" + Number(v || 0).toFixed(2);
  const num2  = v => Number(v || 0).toFixed(2);
  const pct2  = v => Number(v || 0).toFixed(2) + "%";

  // Small status/debug badge in the corner
  function status(msg, isErr){
    let el = document.getElementById("empire-status");
    if (!el){
      el = document.createElement("div");
      el.id="empire-status";
      el.style.cssText="position:fixed;right:8px;bottom:8px;z-index:9999;background:#0b1320;color:#e6f1ff;border:1px solid #2d416f;padding:8px 10px;border-radius:8px;max-width:80vw;font:12px system-ui,Arial";
      document.body.appendChild(el);
    }
    el.style.borderColor = isErr ? "#ff5c5c" : "#2d416f";
    el.style.color = isErr ? "#ffb3b3" : "#e6f1ff";
    el.textContent = msg;
  }

  function tableFromPairs(pairs, keyHeader){
    if (!pairs || !pairs.length) return "";
    const rows = pairs.map(r => `<tr><td>${r[0]}</td><td class="num">${money(r[1])}</td></tr>`).join("");
    return `<table><thead><tr><th>${keyHeader}</th><th class="num">Earnings ($)</th></tr></thead><tbody>${rows}</tbody></table>`;
  }

  function renderOverview(data){
    try{
      // Accept { totals:{}, breakdowns:{} } or flat
      const totals = (data && (data.totals || data.total || data)) || {};
      const b      = (data && (data.breakdowns || data.by || {})) || {};

      const earnings = totals.earnings ?? totals.revenue ?? 0;
      const leads    = totals.leads ?? 0;
      const clicks   = totals.clicks ?? 0;
      const conv     = (totals.convRate ?? totals.convrate ?? totals.conversionRate ?? 0);
      const epc      = totals.epc ?? totals.EPC ?? 0;
      const cpa      = totals.cpa ?? totals.CPA ?? 0;
      const rpm      = totals.rpm ?? totals.RPM ?? 0;

      $("ov-earnings").textContent = money(earnings);
      $("ov-leads").textContent    = num2(leads);
      $("ov-clicks").textContent   = num2(clicks);
      $("ov-convrate").textContent = pct2(conv);
      $("ov-epc").textContent      = money(epc);
      $("ov-cpa").textContent      = money(cpa);
      $("ov-rpm").textContent      = money(rpm);

      const byGeo    = data.byGeo    || b.byGeo    || b.geo    || {};
      const byDevice = data.byDevice || b.byDevice || b.device || {};
      const byOffer  = data.byOfferType || b.byOfferType || b.byOffer || {};
      const byDay    = data.byDay    || b.byDay    || [];

      $("tbl-geo").innerHTML       = tableFromPairs(Object.keys(byGeo   ).map(k=>[k, byGeo[k]]), "Country");
      $("tbl-device").innerHTML    = tableFromPairs(Object.keys(byDevice).map(k=>[k, byDevice[k]]), "Device");
      $("tbl-offerType").innerHTML = tableFromPairs(Object.keys(byOffer ).map(k=>[k, byOffer[k]]), "Offer");

      if (Array.isArray(byDay) && byDay.length){
        const rows = byDay.map(r=>{
          const d = r.date || r.day || "";
          const v = (r.earnings ?? r.revenue ?? 0);
          return `<tr><td>${d}</td><td class="num">${money(v)}</td></tr>`;
        }).join("");
        $("tbl-byDay").innerHTML =
          `<table><thead><tr><th>Date</th><th class="num">Earnings ($)</th></tr></thead><tbody>${rows}</tbody></table>`;
      } else {
        $("tbl-byDay").innerHTML = "";
      }

      // Show top-level keys for quick verification
      status("Overview OK • keys: " + Object.keys(data || {}).join(", "));
    }catch(e){
      console.error("renderOverview error", e, data);
      status("Render error: " + e.message, true);
    }
  }

  async function fetchOverview(){
    try{
      const base = (window.EMPIRE_API && window.EMPIRE_API.BASE_URL) || "";
      if (!base) { status("BASE_URL missing", true); return; }
      const url = base + "?" + new URLSearchParams({ action: "overview" });
      status("Fetching overview…");
      const res = await fetch(url);
      if (!res.ok) throw new Error("HTTP " + res.status);
      const json = await res.json();
      if (json && json.ok === false) status("API ok:false", true);
      renderOverview(json);
    }catch(e){
      console.error("fetchOverview error", e);
      status("Fetch error: " + (e.message || e), true);
    }
  }

  // expose (router can call it), and also run once now
  window.loadOverview = fetchOverview;
  document.addEventListener("DOMContentLoaded", fetchOverview);
})();