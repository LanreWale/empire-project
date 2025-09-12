// /assets/js/overview.js
(function () {
  const API = window.EMPIRE && window.EMPIRE.API_URL;
  if (!API) { console.error("Missing EMPIRE.API_URL"); return; }

  const $ = (id) => document.getElementById(id);
  const money = (n) => isFinite(n) ? "$" + Number(n).toFixed(2) : "$0.00";
  const int0  = (n) => isFinite(n) ? Number(n).toLocaleString() : "0";
  const pct2  = (n) => isFinite(n) ? Number(n).toFixed(2) + "%" : "0.00%";

  function pickTotals(t) {
    // Accept both key styles
    return {
      earnings:        Number(t?.earnings ?? 0),
      leads:           Number(t?.leads ?? 0),
      clicks:          Number(t?.clicks ?? 0),
      conversionRate:  Number(t?.conversionRate ?? t?.convRate ?? 0),
      epc:             Number(t?.epc ?? t?.epcr ?? 0),
      cpa:             Number(t?.cpa ?? 0),
      rpm:             Number(t?.rpm ?? 0),
    };
  }

  function pickMap(d, keyA, keyB) {
    // try d[keyA] (e.g. 'geo'), else d.breakdowns[keyB] (e.g. 'byGeo')
    if (d && typeof d === "object") {
      if (d[keyA] && typeof d[keyA] === "object") return d[keyA];
      if (d.breakdowns && typeof d.breakdowns[keyB] === "object") return d.breakdowns[keyB];
    }
    return {};
  }

  function renderTotals(t) {
    const z = pickTotals(t);
    $("ov-earnings").textContent  = money(z.earnings);
    $("ov-leads").textContent     = int0(z.leads);
    $("ov-clicks").textContent    = int0(z.clicks);
    $("ov-convrate").textContent  = pct2(z.conversionRate);
    $("ov-epc").textContent       = money(z.epc);
    $("ov-cpa").textContent       = money(z.cpa);
    $("ov-rpm").textContent       = money(z.rpm);
  }

  function renderPairs(map, tbodyId, label) {
    const tb = $(tbodyId);
    tb.innerHTML = "";
    const keys = Object.keys(map || {});
    if (!keys.length) {
      const tr = document.createElement("tr");
      const td = document.createElement("td");
      td.colSpan = 2; td.textContent = `No ${label || "data"}`;
      tr.appendChild(td); tb.appendChild(tr); return;
    }
    keys.forEach(k => {
      const tr = document.createElement("tr");
      const tdK = document.createElement("td");
      const tdV = document.createElement("td");
      tdK.textContent = k;
      tdV.className = "num";
      tdV.textContent = money(map[k]);
      tr.appendChild(tdK); tr.appendChild(tdV);
      tb.appendChild(tr);
    });
  }

  function renderByDay(map, tbodyId) {
    const tb = $(tbodyId);
    tb.innerHTML = "";
    const entries = Object.entries(map || {}).sort(([a],[b]) => a.localeCompare(b));
    if (!entries.length) {
      const tr = document.createElement("tr");
      const td = document.createElement("td");
      td.colSpan = 2; td.textContent = "No data";
      tr.appendChild(td); tb.appendChild(tr); return;
    }
    entries.forEach(([date, val]) => {
      const tr = document.createElement("tr");
      const tdD = document.createElement("td");
      const tdV = document.createElement("td");
      tdD.textContent = date;
      tdV.className = "num";
      tdV.textContent = money(val);
      tr.appendChild(tdD); tr.appendChild(tdV);
      tb.appendChild(tr);
    });
  }

  async function loadOverview() {
    try {
      const url = API + (API.includes("?") ? "&" : "?") + "t=" + Date.now();
      const res = await fetch(url, { mode: "cors" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      console.log("Overview payload:", data);

      renderTotals(data.totals || {});
      renderPairs(pickMap(data, "geo", "byGeo"),           "tbl-geo",       "countries");
      renderPairs(pickMap(data, "devices", "byDevice"),    "tbl-device",    "devices");
      renderPairs(pickMap(data, "offerTypes", "byOfferType"), "tbl-offerType", "offer types");
      renderByDay(pickMap(data, "byDay", "byDay"),         "tbl-byDay");
    } catch (e) {
      console.error("loadOverview failed:", e);
    }
  }

  window.loadOverview = loadOverview;
  if (document.getElementById("overview")?.classList.contains("active")) {
    loadOverview();
  }
})();