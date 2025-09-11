<script>
/* expects window.EMPIRE_API.BASE_URL from config.js  */

async function loadOverview() {
  try {
    const url = `${window.EMPIRE_API.BASE_URL}?action=overview`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    if (!data || data.ok === false) throw new Error(data.message || "Invalid payload");

    // ===== numbers =====
    setText("#ov-earnings",   money(data.totals?.earnings));
    setText("#ov-leads",      int(data.totals?.leads));
    setText("#ov-clicks",     int(data.totals?.clicks));
    setText("#ov-convrate",   pct(data.totals?.convrate));   // e.g. 62.62%
    setText("#ov-epc",        money(data.totals?.epc));      // $ per click
    setText("#ov-cpa",        money(data.totals?.cpa));      // cost per acquisition
    setText("#ov-rpm",        money(data.totals?.rpm));      // revenue per mille

    // ===== tables =====
    fillTable("#tbl-geo",       data.breakdowns?.byGeo,       ["key","value"], ["Country","Earnings ($)"]);
    fillTable("#tbl-device",    data.breakdowns?.byDevice,    ["key","value"], ["Device","Earnings ($)"]);
    fillTable("#tbl-offerType", data.breakdowns?.byOfferType, ["key","value"], ["Offer","Earnings ($)"]);
    fillTable("#tbl-byDay",     data.breakdowns?.byDay,       ["key","value"], ["Date","Earnings ($)"]);

  } catch (e) {
    console.error("loadOverview failed:", e);
    toast("Failed to load overview");
  }
}

/* ---------- helpers ---------- */
function $(sel){ return document.querySelector(sel); }
function setText(sel, v){ const el=$(sel); if(el) el.textContent = v ?? "0"; }
function money(n){ n = +n||0; return `$${n.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}`; }
function int(n){ n = +n||0; return n.toLocaleString(); }
function pct(n){ n = +n||0; return `${n.toFixed(2)}%`; }

function fillTable(wrapperSel, objOrArr, keys, headers){
  const wrap = $(wrapperSel); if(!wrap) return;
  let rows = [];
  if (Array.isArray(objOrArr)) {
    rows = objOrArr.map(r => [r[keys[0]], r[keys[1]]]);
  } else if (objOrArr && typeof objOrArr === "object") {
    rows = Object.entries(objOrArr).map(([k,v]) => [k, v]);
  }
  // build table HTML
  let html = `<table class="mini"><thead><tr><th>${headers[0]}</th><th>${headers[1]}</th></tr></thead><tbody>`;
  if (rows.length === 0) {
    html += `<tr><td colspan="2" class="muted">No data</td></tr>`;
  } else {
    rows.forEach(([k,v])=>{
      html += `<tr><td>${escapeHtml(k)}</td><td class="num">${money(v)}</td></tr>`;
    });
  }
  html += `</tbody></table>`;
  wrap.innerHTML = html;
}
function escapeHtml(s){ return String(s).replace(/[&<>"']/g,m=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m])); }

/* optional mini toast */
function toast(msg){
  let t = document.createElement("div");
  t.className = "toast";
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(()=>t.remove(), 2500);
}

/* auto-run when Overview tab becomes visible or on first load */
document.addEventListener("DOMContentLoaded", ()=>{
  // if Overview is the default tab, load immediately
  loadOverview();
});
</script>