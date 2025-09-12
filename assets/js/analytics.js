// assets/js/analytics.js
(function(){
  const $ = (id)=>document.getElementById(id);

  async function api(){
    const base = window.EMPIRE?.API_URL;
    const res  = await fetch(`${base}?view=analytics`,{headers:{"Accept":"application/json"}});
    const txt  = await res.text();
    let data; try{ data = JSON.parse(txt); }catch(e){ throw new Error("Analytics view returned non-JSON"); }
    if (!data || data.ok !== true) throw new Error(data?.error || "Analytics view not implemented");
    return data;
  }

  window.loadAnalytics = async function(){
    const body = $("analyticsBody");
    body.innerHTML = "";
    try{
      const { rows = [] } = await api();
      if (!rows.length){
        body.innerHTML = `<tr><td colspan="4" class="muted">No analytics</td></tr>`;
        return;
      }
      body.innerHTML = rows.map(r=>{
        const d = new Date(r.date || r.Date || "");
        const ds = isNaN(d) ? (r.date || r.Date || "") : d.toLocaleString();
        return `<tr><td>${ds}</td><td>${r.clicks || r.Clicks || 0}</td><td>${r.leads || r.Leads || 0}</td><td>$${Number(r.earnings || r.Earnings || 0).toLocaleString()}</td></tr>`;
      }).join("");
    }catch(err){
      console.error("[Analytics] ", err);
      body.innerHTML = `<tr><td colspan="4" class="muted">No data (API view not implemented)</td></tr>`;
    }
  };
})();