/* assets/js/empire-auth.js — FINAL */

(() => {
  const GAS = {
    // Your Web App URL
    URL: "https://script.google.com/macros/s/AKfycbyKk68KWt9-tlhsKjX5N5sv7Tk0Y2gsAgEFmIaalBlPoDsibnNNy5puQeulRrwL5tb9/exec"
  };

  function store(obj) {
    localStorage.setItem("EmpireAuth", JSON.stringify(obj||{}));
  }
  function load() {
    try { return JSON.parse(localStorage.getItem("EmpireAuth")||"{}"); }
    catch { return {}; }
  }

  async function call(params) {
    const u = new URL(GAS.URL);
    Object.entries(params||{}).forEach(([k,v]) => u.searchParams.set(k,String(v)));
    const res = await fetch(u.toString(), { method:"GET" });
    return await res.json();
  }

  const API = {
    async login(identifier) {
      if (!identifier) throw new Error("missing-identifier");
      const j = await call({ action:"login", identifier });
      if (!j.ok) throw new Error(j.error || "unauthorized");
      // save small profile
      store({ ts: Date.now(), id: identifier, role: j.role||"Guest", clearance: j.clearance||"", level: j.level||"" });
      return j;
    },

    async stats() {
      return await call({ action:"stats" });
    },

    me() { return load(); },

    logout() { localStorage.removeItem("EmpireAuth"); }
  };

  window.EmpireAuth = API;
})();