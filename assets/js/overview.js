// asset/js/overview.js
document.addEventListener("DOMContentLoaded", () => loadOverview());

async function loadOverview() {
  try {
    const url = `${window.EMPIRE_API.BASE_URL}?action=overview`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const t = data.totals || data.total || data || {};

    set("#ov-earnings", money(t.earnings ?? t.revenue ?? 0));
    set("#ov-leads",    fixed2(t.leads ?? 0));
    set("#ov-clicks",   fixed2(t.clicks ?? 0));
    set("#ov-convrate", fixed2(t.convRate ?? t.convrate ?? t.conversionRate ?? 0) + "%");
    set("#ov-epc",      money(t.epc ?? 0));
    set("#ov-cpa",      money(t.cpa ?? 0));
    set("#ov-rpm",      money(t.rpm ?? 0));

    const b = data.breakdowns || data.by || {};
    fill("#tbl-geo",       objToTable(b.byGeo       || data.byGeo,       "Country"));
    fill("#tbl-device",    objToTable(b.byDevice    || data.byDevice,    "Device"));
    fill("#tbl-offerType", objToTable(b.byOfferType || data.byOfferType, "Offer"));
    fill("#tbl-byDay",     dayTable(b.byDay || data.byDay || []));
  } catch (e) {
    console.error(e);
    alert("Overview failed: " + (e.message || e));
  }
}

// helpers
const $ = (s)=>document.querySelector(s);
const set=(s,v)=>{ const el=$(s); if(el) el.textContent=v; };
const fixed2=(n)=>Number(n||0).toFixed(2);
const money =(n)=>"$"+fixed2(n);

function objToTable(obj, keyHdr){
  if (!obj || typeof obj!=="object") return "";
  const rows = Object.entries(obj).map(([k,v])=>`<tr><td>${k}</td><td class="num">${money(v)}</td></tr>`).join("") || `<tr><td colspan="2" class="muted">No data</td></tr>`;
  return `<table><thead><tr><th>${keyHdr}</th><th class="num">Earnings ($)</th></tr></thead><tbody>${rows}</tbody></table>`;
}
function dayTable(arr){
  if (!Array.isArray(arr) || !arr.length) return "";
  const rows = arr.map(r=>{
    const d = r.date || r.day || "";
    const v = r.earnings ?? r.revenue ?? 0;
    return `<tr><td>${d}</td><td class="num">${money(v)}</td></tr>`;
  }).join("");
  return `<table><thead><tr><th>Date</th><th class="num">Earnings ($)</th></tr></thead><tbody>${rows}</tbody></table>`;
}