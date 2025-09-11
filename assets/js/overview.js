/* ===== Overview renderer (tolerant keys + 2 decimals) ===== */
(function () {
  function $(id){ return document.getElementById(id); }
  function money(v){ return "$" + Number(v || 0).toFixed(2); }
  function num2(v){ return Number(v || 0).toFixed(2); }
  function pct2(v){ return Number(v || 0).toFixed(2) + "%"; }

  function tableFromPairs(pairs, keyHeader){
    if (!pairs || !pairs.length) return "";
    var rows = pairs.map(function (r){
      return "<tr><td>" + r[0] + "</td><td class='num'>" + money(r[1]) + "</td></tr>";
    }).join("");
    return "<table><thead><tr><th>" + keyHeader + "</th><th class='num'>Earnings ($)</th></tr></thead><tbody>" + rows + "</tbody></table>";
  }

  window.renderOverview = function (data) {
    try {
      // accept: {totals:{...}, breakdowns:{...}} OR flat
      var totals = (data && (data.totals || data.total || data)) || {};
      var b = data && (data.breakdowns || data.by || {}) || {};

      // totals with fallbacks based on your earlier screenshot
      var earnings = totals.earnings || totals.revenue || 0;
      var leads    = totals.leads || 0;
      var clicks   = totals.clicks || 0;
      var conv     = totals.convRate != null ? totals.convRate
                 : totals.convrate != null ? totals.convrate
                 : totals.conversionRate != null ? totals.conversionRate : 0;
      var epc      = totals.epc != null ? totals.epc : (totals.EPC || 0);
      var cpa      = totals.cpa != null ? totals.cpa : (totals.CPA || 0);
      var rpm      = totals.rpm != null ? totals.rpm : (totals.RPM || 0);

      $("ov-earnings").textContent = money(earnings);
      $("ov-leads").textContent    = num2(leads);
      $("ov-clicks").textContent   = num2(clicks);
      $("ov-convrate").textContent = pct2(conv);
      $("ov-epc").textContent      = money(epc);
      $("ov-cpa").textContent      = money(cpa);
      $("ov-rpm").textContent      = money(rpm);

      // breakdowns
      var byGeo    = data.byGeo || b.byGeo || b.geo || {};
      var byDevice = data.byDevice || b.byDevice || b.device || {};
      var byOffer  = data.byOfferType || b.byOfferType || b.byOffer || {};

      // normalize objects -> pairs
      var geoPairs    = Object.keys(byGeo).map(function(k){ return [k, byGeo[k]]; });
      var devicePairs = Object.keys(byDevice).map(function(k){ return [k, byDevice[k]]; });
      var offerPairs  = Object.keys(byOffer).map(function(k){ return [k, byOffer[k]]; });

      $("tbl-geo").innerHTML       = tableFromPairs(geoPairs,    "Country");
      $("tbl-device").innerHTML    = tableFromPairs(devicePairs, "Device");
      $("tbl-offerType").innerHTML = tableFromPairs(offerPairs,  "Offer");

      var byDay = data.byDay || b.byDay || [];
      if (Array.isArray(byDay) && byDay.length) {
        var rows = byDay.map(function(r){
          var d = r.date || r.day || "";
          var v = r.earnings != null ? r.earnings : (r.revenue || 0);
          return "<tr><td>" + d + "</td><td class='num'>" + money(v) + "</td></tr>";
        }).join("");
        $("tbl-byDay").innerHTML = "<table><thead><tr><th>Date</th><th class='num'>Earnings ($)</th></tr></thead><tbody>" + rows + "</tbody></table>";
      } else {
        $("tbl-byDay").innerHTML = "";
      }
    } catch (e) {
      console.error("renderOverview failed:", e, data);
      if (window.EMPIRE_API && window.EMPIRE_API.showStatus) {
        window.EMPIRE_API.showStatus("Render error (overview): " + e.message, true);
      }
    }
  };
})();