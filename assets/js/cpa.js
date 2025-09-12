// assets/js/cpa.js
(function(){
  const $ = (sel)=>document.querySelector(sel);

  async function api(){
    const base = window.EMPIRE?.API_URL;
    const res  = await fetch(`${base}?view=cpa`,{headers:{"Accept":"application/json"}});
    const txt  = await res.text();
    let data; try{ data = JSON.parse(txt); }catch(e){ throw new Error("CPA view returned non-JSON"); }
    if (!data || data.ok !== true) throw new Error(data?.error || "CPA view not implemented");
    return data;
  }

  function card(a){
    return `
      <div class="card" style="margin:10px 0;">
        <h4 style="margin-top:0">${a.network || "Network"} — <span class="muted">${a.accountId || "AccountID"}</span></h4>
        <div class="muted">Active Offers: ${a.activeOffers ?? 0}</div>
        <div>Clicks: ${a.clicks ?? 0} • Leads: ${a.leads ?? 0} • Earnings: <b>$${Number(a.earnings||0).toLocaleString()}</b></div>
      </div>`;
  }

  window.loadCPAAccounts = async function(){
    const host = $("#cpa #cpaAccounts");
    host.innerHTML = "";
    try{
      const { accounts = [] } = await api();
      if (!accounts.length){
        host.innerHTML = `<div class="muted">No CPA accounts</div>`;
        return;
      }
      host.innerHTML = accounts.map(card).join("");
    }catch(err){
      console.error("[CPA] ", err);
      host.innerHTML = `<div class="muted">No data (API view not implemented)</div>`;
    }
  };
})();