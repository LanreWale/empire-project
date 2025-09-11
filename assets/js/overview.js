async function loadOverview() {
  try {
    const res = await fetch(GAS_URL + "?action=overview");
    const data = await res.json();
    if (!data.ok) throw new Error("Bad response");

    const t = data.totals;
    document.getElementById("ov-earnings").textContent   = "$" + t.earnings.toFixed(2);
    document.getElementById("ov-leads").textContent      = t.leads.toFixed(2);
    document.getElementById("ov-clicks").textContent     = t.clicks.toFixed(2);
    document.getElementById("ov-convrate").textContent   = t.convRate.toFixed(2) + "%";
    document.getElementById("ov-epc").textContent        = "$" + t.epc.toFixed(2);
    document.getElementById("ov-cpa").textContent        = "$" + t.cpa.toFixed(2);
    document.getElementById("ov-rpm").textContent        = "$" + t.rpm.toFixed(2);

    // By Geo
    document.getElementById("tbl-geo").innerHTML =
      makeTable(["Country", "Earnings ($)"], data.breakdowns.byGeo);

    // By Device
    document.getElementById("tbl-device").innerHTML =
      makeTable(["Device", "Earnings ($)"], data.breakdowns.byDevice);

    // By OfferType
    document.getElementById("tbl-offerType").innerHTML =
      makeTable(["Offer Type", "Earnings ($)"], data.breakdowns.byOfferType);

  } catch (err) {
    console.error(err);
  }
}

// helper: turn object into table
function makeTable(headers, obj) {
  let rows = Object.entries(obj || {}).map(
    ([k,v]) => `<tr><td>${k}</td><td class="num">$${Number(v).toFixed(2)}</td></tr>`
  ).join("");
  return `<table><thead><tr><th>${headers[0]}</th><th>${headers[1]}</th></tr></thead><tbody>${rows}</tbody></table>`;
}