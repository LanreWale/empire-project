// assets/js/overview.js
(function(){
  const $ = (id)=>document.getElementById(id);
  const money = n => "$" + Number(n||0).toLocaleString(undefined,{minimumFractionDigits:2, maximumFractionDigits:2});
  const pct   = n => Number(n||0).toLocaleString(undefined,{minimumFractionDigits:2, maximumFractionDigits:2}) + "%";
  const fillTable = (tbodyId, rows)=> {
    const tb = $(tbodyId);
    tb.innerHTML = rows?.length
      ? rows.map(([k,v])=>`<tr><td>${k}</td><td class="num">${money(v)}</td></tr>`).join("")
      : `<tr><td colspan="2" class="muted">—</td></tr>`;
  };

  async function api(view){
    const base = window.EMPIRE?.API_URL;
    if (!base) throw new Error("API_URL missing");
    const url = base + (view ? `?view=${encodeURIComponent(view)}` : "");
    const res  = await fetch(url,{headers:{"Accept":"application/json"}});
    const txt  = await res.text();
    let data;
    try { data = JSON.parse(txt); } catch(e){ console.error("Non-JSON:", txt); throw new Error("API returned non-JSON"); }
    if (!data || data.ok !== true) throw new Error(data?.error || "API returned ok=false");
    return data;
  }

  window.loadOverview = async function(){
    try{
      // Uses base (no view) – matches your working payload
      const { totals, breakdowns } = await api("");

      const t = {
        earnings:  totals?.earnings ?? totals?.Earnings ?? 0,
        leads:     totals?.leads ?? totals?.Leads ?? 0,
        clicks:    totals?.clicks ?? totals?.Clicks ?? 0,
        convRate:  totals?.convRate ?? totals?.conversionRate ?? totals?.ConversionRate ?? 0,
        epc:       totals?.epc ?? totals?.EPC ?? 0,
        cpa:       totals?.cpa ?? totals?.CPA ?? 0,
        rpm:       totals?.rpm ?? totals?.RPM ?? 0,
      };
      if (!t.epc && t.clicks) t.epc = t.earnings / t.clicks;
      if (!t.cpa && t.leads)  t.cpa = t.earnings / t.leads;
      if (!t.rpm)             t.rpm = t.earnings * 1000 / (t.clicks || 1000);

      $("ov-earnings").textContent  = money(t.earnings);
      $("ov-leads").textContent     = Number(t.leads).toLocaleString();
      $("ov-clicks").textContent    = Number(t.clicks).toLocaleString();
      $("ov-convrate").textContent  = pct(t.convRate);
      $("ov-epc").textContent       = money(t.epc);
      $("ov-cpa").textContent       = money(t.cpa);
      $("ov-rpm").textContent       = money(t.rpm);

      fillTable("tbl-geo",       Object.entries(breakdowns?.byGeo || {}));
      fillTable("tbl-device",    Object.entries(breakdowns?.byDevice || {}));
      fillTable("tbl-offerType", Object.entries(breakdowns?.byOfferType || {}));

      const byDayPairs = Object.entries(breakdowns?.byDay || {});
      const byDay = byDayPairs.map(([k,v])=>{
        const d = new Date(k); const label = isNaN(d)? k : d.toDateString();
        return [label, v];
      });
      const tb = $("tbl-byDay");
      tb.innerHTML = byDay.length
        ? byDay.map(([d,val])=>`<tr><td>${d}</td><td class="num">${money(val)}</td></tr>`).join("")
        : `<tr><td colspan="2" class="muted">—</td></tr>`;
    }catch(err){
      console.error("[Overview] ", err);
      const host = document.querySelector("#overview");
      const msg = document.createElement("div");
      msg.style.color = "#ff6b6b"; msg.style.marginBottom = "8px";
      msg.textContent = "Failed to load data: " + err.message;
      host.prepend(msg);
    }
  };
})();