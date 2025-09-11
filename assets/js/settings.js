// asset/js/settings.js
document.addEventListener("DOMContentLoaded", () => loadSettings());

async function loadSettings(){
  try{
    const url=`${window.EMPIRE_API.BASE_URL}?action=settings_all`;
    const res=await fetch(url);
    const data=await res.json();
    if(!data.ok) throw new Error(data.error||"Bad settings payload");

    const tbody=document.querySelector("#settingsBody");
    if(!tbody) return;
    tbody.innerHTML="";
    (data.rows||[]).forEach(r=>{
      const tr=document.createElement("tr");
      tr.innerHTML=`<td>${escapeHtml(r.key)}</td>
                    <td>${escapeHtml(r.value)}</td>
                    <td>${escapeHtml(r.description||"")}</td>
                    <td>${escapeHtml(r.updatedAt||"")}</td>`;
      tbody.appendChild(tr);
    });
  }catch(e){ console.error(e); }
}