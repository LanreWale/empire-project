// assets/js/overview.js
async function loadOverview() {
  try {
    if (!window.EMPIRE_API || !window.EMPIRE_API.BASE_URL) {
      console.error("BASE_URL missing. Check assets/js/config.js");
      return;
    }

    // Cache-bust the request so you always get fresh JSON
    const url = `${window.EMPIRE_API.BASE_URL}?_=${Date.now()}`;
    console.log("Fetching overview from:", url);

    const res = await fetch(url, { headers: { "Accept": "application/json" } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    console.log("Overview data:", data);

    if (!data.ok || !data.totals) throw new Error("API returned unexpected payload");

    const t = data.totals;

    // Totals
    const $ = (id) => document.getElementById(id);
    $("ov-earnings").textContent  = `$${Number(t.earnings).toFixed(2)}`;
    $("ov-leads").textContent     = Number(t.leads).toFixed(0);
    $("ov-clicks").textContent    = Number(t.clicks).toFixed(0);
    $("ov-convrate").textContent  = `${Number(t.conversionRate).toFixed(2)}%`;
    $("ov-epc").textContent       = `$${Number(t.epc).toFixed(2)}`;
    $("ov-cpa").textContent       = `$${Number(t.cpa).toFixed(2)}`;
    $("ov-rpm").textContent       = `$${Number(t.rpm).toFixed(2)}`;

    // Table helper
    const renderTable = (obj, headers) => {
      if (!obj || !Object.keys(obj).length) return "<p class='muted'>No data</p>";
      let html = "<table><thead><tr>";
      headers.forEach(h => html += `<th>${h}</th>`);
      html += "</tr></thead><tbody>";
      Object.entries(obj).forEach(([k,v])=>{
        const isMoney = typeof v === "number";
        html += `<tr><td>${k}</td><td class="num">${isMoney ? "$"+v.toFixed(2) : v}</td></tr>`;
      });
      html += "</tbody></table>";
      return html;
    };

    // Breakdowns
    $("tbl-geo").innerHTML        = renderTable(data.geo, ["Country","Earnings ($)"]);
    $("tbl-device").innerHTML     = renderTable(data.devices, ["Device","Earnings ($)"]);
    $("tbl-offerType").innerHTML  = renderTable(data.offerTypes, ["Offer Type","Earnings ($)"]);
    $("tbl-byDay").innerHTML      = renderTable(data.byDay, ["Date","Earnings ($)"]);

  } catch (err) {
    console.error("loadOverview error:", err);
    // Show a small inline error so you know it fired
    const el = document.getElementById("ov-earnings");
    if (el) el.textContent = "Error";
  }
}

// Fire once on DOM ready as a safety (in case the tab router doesn’t)
document.addEventListener("DOMContentLoaded", () => {
  try { loadOverview(); } catch(e){ console.error(e); }
});