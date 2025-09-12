// assets/js/settings.js
(function(){
  const $ = (id)=>document.getElementById(id);

  async function api(){
    const base = window.EMPIRE?.API_URL;
    const res  = await fetch(`${base}?view=settings`,{headers:{"Accept":"application/json"}});
    const txt  = await res.text();
    let data; try{ data = JSON.parse(txt); }catch(e){ throw new Error("Settings view returned non-JSON"); }
    if (!data || data.ok !== true) throw new Error(data?.error || "Settings view not implemented");
    return data;
  }

  window.loadSettings = async function(){
    const body = $("settingsBody");
    body.innerHTML = "";
    try{
      const { settings = [] } = await api();
      if (!settings.length){
        body.innerHTML = `<tr><td colspan="4" class="muted">No settings</td></tr>`;
        return;
      }
      body.innerHTML = settings.map(s=>{
        const dt = s.updated ? new Date(s.updated) : null;
        const when = dt && !isNaN(dt) ? dt.toLocaleString() : (s.updated||"");
        return `<tr><td>${s.key||""}</td><td>${s.value||""}</td><td>${s.desc||s.description||""}</td><td>${when}</td></tr>`;
      }).join("");
    }catch(err){
      console.error("[Settings] ", err);
      body.innerHTML = `<tr><td colspan="4" class="muted">No data (API view not implemented)</td></tr>`;
    }
  };
})();