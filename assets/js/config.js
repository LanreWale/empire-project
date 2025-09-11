// SINGLE SOURCE OF TRUTH FOR THE API
window.EMPIRE_API = {
  // <-- use the working "exec" URL for your deployed Web App
  BASE_URL: "https://script.google.com/macros/s/AKfycbz-jj7Cr_KzqCku4SQPQ14MEIuCPdq5OEgiiqjo_O2A0FItBrHlmfkoJHViDxuX4P6z/exec"
};

// tiny helper
async function apiGet(params) {
  const url = `${window.EMPIRE_API.BASE_URL}?${new URLSearchParams(params)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

/* ---- per-tab loaders (names must match index.html router) ---- */
window.loadOverview    = () => apiGet({ action: "overview" }).then(d => renderOverview?.(d)).catch(console.error);
window.loadCPAAccounts = () => apiGet({ action: "cpaaccounts" }).then(d => renderCPAAccounts?.(d)).catch(console.error);
window.loadUsers       = () => apiGet({ action: "users" }).then(d => renderUsers?.(d.users||[])).catch(console.error);
window.loadAnalytics   = () => apiGet({ action: "analytics" }).then(d => renderAnalytics?.(d.rows||[])).catch(console.error);
window.loadWallet      = () => apiGet({ action: "walletoverview" }).then(d => renderWallet?.(d)).catch(console.error);
window.loadMonitoring  = () => apiGet({ action: "monitoring" }).then(d => renderMonitoring?.(d)).catch(console.error);
window.loadSettings    = () => apiGet({ action: "systemsettings" }).then(d => renderSettings?.(d.settings||[])).catch(console.error);