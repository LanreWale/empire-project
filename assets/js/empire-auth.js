/* assets/js/empire-auth.js — FINAL */

(function (w) {
  const EMPIRE_GAS_URL =
    "https://script.google.com/macros/s/AKfycbyKk68KWt9-tlhsKjX5N5sv7Tk0Y2gsAgEFmIaalBlPoDsibnNNy5puQeulRrwL5tb9/exec";

  const EMPIRE_API_KEY = "Lanreismail157@empireaffiliatemarketinghub_69";

  function qs(o = {}) {
    const u = new URL(EMPIRE_GAS_URL);
    Object.entries(o).forEach(([k, v]) => u.searchParams.set(k, v));
    if (!u.searchParams.get("key")) u.searchParams.set("key", EMPIRE_API_KEY);
    return u.toString();
  }

  async function get(action, extra = {}) {
    const url = qs({ action, ...extra });
    const res = await fetch(url, { method: "GET", credentials: "omit" });
    return res.json();
  }

  const EmpireAPI = {
    url: EMPIRE_GAS_URL,
    key: EMPIRE_API_KEY,
    ping: () => get("ping"),
    kpis: () => get("kpis"),
    listAssociates: (limit = 10) => get("listassociates", { limit }),
    listWallet: (limit = 20) => get("listwallet", { limit }),
  };

  w.EmpireAPI = EmpireAPI;
})(window);