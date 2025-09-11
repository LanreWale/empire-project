// asset/js/cpa.js
document.addEventListener("DOMContentLoaded", () => loadCPAAccounts());

async function loadCPAAccounts(){
  try{
    const url = `${window.EMPIRE_API.BASE_URL}?action=cpa_accounts`;
    const res = await fetch(url);
    const data = await res.json();
    if(!data.ok) throw new Error(data.error||"Bad payload");

    const wrap = document.querySelector("#cpaAccounts");
    if(!wrap) return;

    const rows = data.accounts||[];
    if(rows.length===0){
      wrap.innerHTML = `<div class="muted">No CPA Grip accounts found</div>`;
      return;
    }

    let html="";
    rows.forEach(acc=>{
      html += `
        <div class="card">
          <h4>${escapeHtml(acc.name||"CPA Account")}</h4>
          <p>Network: ${escapeHtml(acc.network||"CPA Grip")}</p>
          <p>Status: ${escapeHtml(acc.status||"ACTIVE")}</p>
          <p>Revenue: ${fmt(acc.revenue,"money")}</p>
          <p>Clicks: ${fmt(acc.clicks)}</p>
          <p>Conversion: ${fmt(acc.conversion,"pct")}</p>
          <p>Active Offers: ${fmt(acc.activeOffers)}</p>
        </div>`;
    });
    wrap.innerHTML = html;
  }catch(e){
    console.error(e);
  }
}