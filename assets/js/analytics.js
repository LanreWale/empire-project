// asset/js/analytics.js
document.addEventListener("DOMContentLoaded", () => loadAnalytics());

async function loadAnalytics(){
  try{
    const url=`${window.EMPIRE_API.BASE_URL}?action=analytics`;
    const res=await fetch(url);
    const data=await res.json();
    if(!data.ok) throw new Error(data.error||"Bad analytics payload");

    // Example: Performance_Report table
    const tbody=document.querySelector("#analyticsBody");
    if(!tbody) return;
    tbody.innerHTML="";
    (data.rows||[]).forEach(r=>{
      const tr=document.createElement("tr");
      tr.innerHTML=`<td>${escapeHtml(r.date||"")}</td>
                    <td>${fmt(r.clicks)}</td>
                    <td>${fmt(r.leads)}</td>
                    <td>${fmt(r.earnings,"money")}</td>`;
      tbody.appendChild(tr);
    });
  }catch(e){
    console.error(e);
  }
}