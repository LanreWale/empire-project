// assets/js/users.js
(function(){
  const $ = (id)=>document.getElementById(id);

  async function api(){
    const base = window.EMPIRE?.API_URL;
    const res  = await fetch(`${base}?view=users`,{headers:{"Accept":"application/json"}});
    const txt  = await res.text();
    let data; try{ data = JSON.parse(txt); }catch(e){ throw new Error("Users view returned non-JSON"); }
    if (!data || data.ok !== true) throw new Error(data?.error || "Users view not implemented");
    return data;
  }

  window.loadUsers = async function(){
    const body = $("usersBody");
    body.innerHTML = "";
    try{
      const { users = [], inviteLink = "", inviteRef = "" } = await api();
      if (!users.length){
        body.innerHTML = `<tr><td colspan="3" class="muted">No users</td></tr>`;
      }else{
        body.innerHTML = users.map(u=>`<tr><td>${u.name||""}</td><td>${u.email||""}</td><td>${u.phone||""}</td></tr>`).join("");
      }
      $("inviteLink").value = inviteLink || "";
      $("inviteRef").value  = inviteRef  || "";
    }catch(err){
      console.error("[Users] ", err);
      body.innerHTML = `<tr><td colspan="3" class="muted">No data (API view not implemented)</td></tr>`;
      $("inviteLink").value = ""; $("inviteRef").value = "";
    }
  };
})();