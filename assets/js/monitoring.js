// assets/js/monitoring.js
(function(){
  const $ = (id)=>document.getElementById(id);

  async function api(){
    const base = window.EMPIRE?.API_URL;
    const res  = await fetch(`${base}?view=monitoring`,{headers:{"Accept":"application/json"}});
    const txt  = await res.text();
    let data; try{ data = JSON.parse(txt); }catch(e){ throw new Error("Monitoring view returned non-JSON"); }
    if (!data || data.ok !== true) throw new Error(data?.error || "Monitoring view not implemented");
    return data;
  }

  window.loadMonitoring = async function(){
    const health = $("mon-health");
    const feedUl = $("mon-feed");
    health.textContent = "0.00%";
    feedUl.innerHTML = "";
    try{
      const { health:score = 0, feed = [] } = await api();
      health.textContent = Number(score||0).toLocaleString(undefined,{minimumFractionDigits:2, maximumFractionDigits:2}) + "%";
      feedUl.innerHTML = feed.length ? feed.map(item=>`<li>${item}</li>`).join("") : `<li class="muted">No recent events</li>`;
    }catch(err){
      console.error("[Monitoring] ", err);
      feedUl.innerHTML = `<li class="muted">No data (API view not implemented)</li>`;
    }
  };
})();