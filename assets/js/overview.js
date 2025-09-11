/* asset/js/overview.js
   Overview renderer for The Empire Dashboard
   Requires window.EMPIRE_API.BASE_URL from config.js
*/

document.addEventListener("DOMContentLoaded", () => loadOverview());

async function loadOverview() {
  try {
    const url = `${window.EMPIRE_API.BASE_URL}?action=overview`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!data || data.ok === false) throw new Error(data.message || "Invalid payload");

    const t = data.totals || {};

    // ===== KPIs =====
    setText("#ov-earnings",   fmt(t.earnings, "money"));
    setText("#ov-leads",      fmt(t.leads));
    setText("#ov-clicks",     fmt(t.clicks));
    setText("#ov-convrate",   fmt(t.convRate, "pct"));
    setText("#ov-epc",        fmt(t.epc, "money"));
    setText("#ov-cpa",        fmt(t.cpa, "money"));
    setText("#ov-rpm",        fmt(t.rpm, "money"));

    // ===== Tables =====
    fillTable("#tbl-geo",       data.breakdowns?.byGeo,       ["Country","Earnings ($)"]);
    fillTable("#tbl-device",    data.breakdowns?.byDevice,    ["Device","Earnings ($)"]);
    fillTable("#tbl-offerType", data.breakdowns?.byOfferType, ["Offer","Earnings ($)"]);
    fillTable("#tbl-byDay",     data.breakdowns?.byDay,       ["Date","Earnings ($)"]);

  } catch (e) {
    console.error("loadOverview failed:", e);
    toast("Failed to load overview");
  }
}

/* ---------- helpers ---------- */

function $(sel){ return document.querySelector(sel); }
function setText(sel, v){ const el=$(sel); if(el) el.textContent = v ?? "0.00"; }

// Format numbers consistently to 2 decimal places
function fmt(val, type = "num") {
  if (val == null || val === "") return type === "pct" ? "0.00%" : "$0.00";
  let n = Number(val);
  if (!isFinite(n)) return type === "pct" ? "0.00%" : "$0.00";
  switch (type) {
    case "money": return "$" + n.toFixed(2);
    case "pct":   return n.toFixed(2) + "%";
    default:      return n.toFixed(2);
  }
}

function fillTable(sel, obj, headers){
  const wrap = $(sel); if(!wrap) return;
  const rows = obj ? Object.entries(obj) : [];

  let html = `<table class="mini"><thead><tr><th>${headers[0]}</th><th>${headers[1]}</th></tr></thead><tbody>`;
  if (rows.length === 0) {
    html += `<tr><td colspan="2" class="muted">No data</td></tr>`;
  } else {
    rows.forEach(([k,v])=>{
      html += `<tr><td>${escapeHtml(k)}</td><td class="num">${fmt(v,"money")}</td></tr>`;
    });
  }
  html += `</tbody></table>`;
  wrap.innerHTML = html;
}

function escapeHtml(s){ return String(s).replace(/[&<>"']/g,m=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m])); }

function toast(msg){
  let t = document.createElement("div");
  t.className = "toast";
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(()=>t.remove(), 2500);
}