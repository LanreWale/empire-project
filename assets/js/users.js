// asset/js/users.js
document.addEventListener("DOMContentLoaded", () => loadUsers());

async function loadUsers(){
  try{
    const url = `${window.EMPIRE_API.BASE_URL}?action=users`;
    const res = await fetch(url);
    const data = await res.json();
    if(!data.ok) throw new Error(data.error||"Bad payload");

    const tbody = document.querySelector("#usersBody");
    if(!tbody) return;
    tbody.innerHTML="";

    (data.rows||[]).forEach(u=>{
      const tr=document.createElement("tr");
      tr.innerHTML=`<td>${escapeHtml(u.name||"")}</td>
                    <td>${escapeHtml(u.email||"")}</td>
                    <td>${escapeHtml(u.phone||"")}</td>`;
      tbody.appendChild(tr);
    });

    // invite link
    initInvite();
  }catch(e){
    console.error(e);
  }
}

async function initInvite(){
  try{
    const url=`${window.EMPIRE_API.BASE_URL}?action=get_invite`;
    const r=await fetch(url).then(r=>r.json());
    if(!r.ok) return;
    document.querySelector("#inviteLink").value=r.url||"";
    document.querySelector("#inviteRef").value=r.ref||"";
  }catch(e){console.error(e);}
}