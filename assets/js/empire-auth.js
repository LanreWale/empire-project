/* THE EMPIRE — minimal client for GAS endpoints (case-insensitive) */
(function (g) {
  const BASE = "https://script.google.com/macros/s/AKfycbysJmVXlrOE1_J3uw5wMqs9cnKtj-uuoxj0Mmj8JWTj7eZMvp9XJYXrs-0leocNXI6w/exec";
  const PASS = "GENERALISIMO@2025";

  const store = {
    set(k,v){ try{ localStorage.setItem(k, JSON.stringify(v)); }catch{} },
    get(k){ try{ return JSON.parse(localStorage.getItem(k)||"null"); }catch{ return null; } },
    del(k){ try{ localStorage.removeItem(k); }catch{} }
  };

  async function call(action, params={}) {
    const usp = new URLSearchParams({ action, pass: PASS, ...(params||{}) });
    const url = `${BASE}?${usp.toString()}`;
    const res = await fetch(url, { headers: { "Cache-Control":"no-cache" }});
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const j = await res.json();
    if (j && j.ok === false) throw new Error(j.error || "api_error");
    return j;
  }

  const api = {
    base(){ return BASE; },
    has(){ return true; },                 // passphrase-only mode
    logout(){ /* noop for commander */ },

    // system
    ping(){ return call("ping"); },
    summary(){ return call("summary"); },
    walletmetrics(){ return call("walletmetrics"); },

    // lists (legacy)
    listOnboarding(limit=50){ return call("listonboarding", { limit }); },
    listAssociates(limit=50){ return call("listassociates", { limit }); },
    listWallet(limit=50){ return call("listwallet", { limit }); },

    // dashboard (camelCase; router accepts any case)
    commanderMetrics(){ return call("commanderMetrics"); },
    listCPAAccounts(){ return call("listCPAAccounts"); },
    analyticsOverview(){ return call("analyticsOverview"); },
    usersOverview(){ return call("usersOverview"); },
    walletOverview(){ return call("walletOverview"); },
    securityOverview(){ return call("securityOverview"); },
    monitoringFeed(){ return call("monitoringFeed"); },
  };

  g.EmpireAuth = api;
})(window);