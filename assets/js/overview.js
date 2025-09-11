async function loadOverview() {
  try {
    const res = await fetch(window.EMPIRE_API.BASE_URL);
    const data = await res.json();
    if (!data.ok) throw new Error("API error");

    const t = data.totals;

    // Main totals
    document.getElementById("ov-earnings").textContent    = `$${t.earnings.toFixed(2)}`;
    document.getElementById("ov-leads").textContent       = t.leads.toFixed(0);
    document.getElementById("ov-clicks").textContent      = t.clicks.toFixed(0);
    document.getElementById("ov-convrate").textContent    = `${t.conversionRate.toFixed(2)}%`;
    document.getElementById("ov-epc").textContent         = `$${t.epc.toFixed(2)}`;
    document.getElementById("ov-cpa").textContent         = `$${t.cpa.toFixed(2)}`;
    document.getElementById("ov-rpm").textContent         = `$${t.rpm.toFixed(2)}`;

    // Helpers for rendering tables
    const renderTable = (obj, headers) => {
      if (!obj) return "<p class='muted'>No data</p>";
      let html = "<table><thead><tr>";
      headers.forEach(h => html += `<th>${h}</th>`);
      html += "</tr></thead><tbody>";
      for (const [k,v] of Object.entries(obj)) {
        html += `<tr><td>${k}</td><td class="num">$${v.toFixed(2)}</td></tr>`;
      }
      html += "</tbody></table>";
      return html;
    };

    // Render each breakdown
    document.getElementById("tbl-geo").innerHTML        = renderTable(data.geo, ["Country", "Earnings ($)"]);
    document.getElementById("tbl-device").innerHTML     = renderTable(data.devices, ["Device", "Earnings ($)"]);
    document.getElementById("tbl-offerType").innerHTML  = renderTable(data.offerTypes, ["Offer Type", "Earnings ($)"]);
    document.getElementById("tbl-byDay").innerHTML      = renderTable(data.byDay, ["Date", "Earnings ($)"]);

  } catch (err) {
    console.error("Overview load failed:", err);
    alert("Failed to load overview");
  }
}