// asset/js/config.js
// SINGLE SOURCE OF TRUTH FOR THE API
window.EMPIRE_API = {
  BASE_URL: "https://script.google.com/macros/s/AKfycbz-jj7Cr_KzqCku4SQPQ14MEIuCPdq5OEgiiqjo_O2A0FItBrHlmfkoJHViDxuX4P6z/exec"
};

// tiny helper you can reuse
async function apiGet(params) {
  const url = `${window.EMPIRE_API.BASE_URL}?${new URLSearchParams(params)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// optional loaders (call these from the dashboard)
window.loadOverview = () => apiGet({ action: "overview" }).then(d => renderOverview?.(d));
window.loadWallet   = () => apiGet({ action: "walletoverview" }).then(d => renderWallet?.(d));
window.loadUsers    = () => apiGet({ action: "users" }).then(d => renderUsers?.(d.users||[]));
window.loadSystemSettings = () => apiGet({ action: "systemsettings" }).then(d => renderSystemSettings?.(d.settings||{}));

window.loadDashboard = async () => {
  try {
    await Promise.all([loadOverview(), loadWallet(), loadUsers(), loadSystemSettings()]);
  } catch (e) {
    console.error(e);
    alert("Failed to load dashboard: " + (e.message || e));
  }
};