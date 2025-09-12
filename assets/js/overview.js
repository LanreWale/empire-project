// assets/js/overview.js

function $id(id){ return document.getElementById(id); }
function money(n){
  if (n == null || isNaN(n)) return "$0.00";
  return "$" + Number(n).toLocaleString(undefined,{minimumFractionDigits:2, maximumFractionDigits:2});
}
function pct(n){
  if (n == null || isNaN(n)) return "0.00%";
  return Number(n).toLocaleString(undefined,{minimumFractionDigits:2, maximumFractionDigits:2}) + "%";
}
function fillTable(tbodyId, rows){
  const tb = $id(tbodyId);
  tb.innerHTML = rows.length ? rows.map(r=>`<tr><td>${r[0]}</td><td class="num">${money(r[1])}</td></tr>`).join("") : `<tr><td colspan="2" class="muted">—</td></tr>`;
}

// Normalizes slightly different key names that have appeared in your samples
function normalizeTotals(t){
  if (!t) return {};
  return {
    earnings:       t.earnings ?? t.Earnings ?? 0,
    leads:          t.leads ?? t.Leads ?? 0,
    clicks:         t.clicks ?? t.Clicks ?? 0,
    convRate:       t.convRate ?? t.conversionRate ?? t.ConversionRate ?? 0,
    epc:            t.epc ?? t.EPC ?? 0,
    cpa:            t.cpa ?? t.CPA ?? 0,
    rpm:            t.rpm ?? t.RPM ?? 0,
  };
}

async function fetchOverview(){
  const url = window.EMPIRE?.API_URL;
  if (!url) throw new Error("API_URL missing in window.EMPIRE");
  const res  = await fetch(url, {headers: {"Accept":"application/json"}});
  const text = await res.text();             // guard against non-JSON errors
  let data;
  try { data = JSON.parse(text); } catch(e){
    console.error("Non-JSON response:", text);
    throw new Error("API returned non-JSON. See console for payload.");
  }
  console.log("[EMPIRE] RAW API:", data);
  if (data.ok !== true) {
    throw new Error("API returned ok=false");
  }
  // expected shape:
  // { ok:true, totals:{...}, breakdowns:{ byGeo:{}, byDevice:{}, byOfferType:{}, byDay:{} } }
  return data;
}

window.loadOverview = async function loadOverview(){
  try {
    const { totals, breakdowns } = await fetchOverview();

    const t = normalizeTotals(totals);

    // Fallback compute if some totals missing
    if (!t.epc && t.clicks) t.epc = t.earnings / t.clicks;
    if (!t.cpa && t.leads)  t.cpa = t.earnings / t.leads;
    if (!t.rpm)             t.rpm = t.earnings * 1000 / (t.clicks || 1000); // soft fallback

    // Totals
    $id("ov-earnings").textContent  = money(t.earnings);
    $id("ov-leads").textContent     = Number(t.leads || 0).toLocaleString();
    $id("ov-clicks").textContent    = Number(t.clicks || 0).toLocaleString();
    $id("ov-convrate").textContent  = pct(t.convRate || 0);
    $id("ov-epc").textContent       = money(t.epc || 0);
    $id("ov-cpa").textContent       = money(t.cpa || 0);
    $id("ov-rpm").textContent       = money(t.rpm || 0);

    // Breakdowns
    const byGeo      = Object.entries(breakdowns?.byGeo || {});
    const byDevice   = Object.entries(breakdowns?.byDevice || {});
    const byOffer    = Object.entries(breakdowns?.byOfferType || {});
    const byDayPairs = Object.entries(breakdowns?.byDay || {}); // { dateString: earnings }

    fillTable("tbl-geo",       byGeo);
    fillTable("tbl-device",    byDevice);
    fillTable("tbl-offerType", byOffer);

    // By Day (format date a bit)
    const byDay = byDayPairs.map(([k,v])=>{
      const d = new Date(k);
      const label = isNaN(d) ? k : d.toDateString();
      return [label, v];
    });
    const tb = document.getElementById("tbl-byDay");
    tb.innerHTML = byDay.length ? byDay.map(r=>`<tr><td>${r[0]}</td><td class="num">${money(r[1])}</td></tr>`).join("") : `<tr><td colspan="2" class="muted">—</td></tr>`;
  } catch(err){
    console.error("[EMPIRE] Overview failed:", err);
    // Surface a gentle message in the UI (center totals box)
    const totalsBox = document.querySelector('#overview .card') || document.getElementById('overview');
    if (totalsBox) {
      const warn = document.createElement('div');
      warn.style.color = '#ff6b6b';
      warn.style.margin = '6px 0';
      warn.textContent = "Failed to load data: " + err.message;
      totalsBox.prepend(warn);
    }
  }
};