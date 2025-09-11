<script>
/* ---------- ONE-TIME CONFIG ---------- */
window.EMPIRE_API_URL =
  "https://script.google.com/macros/s/AKfycbz-jj7Cr_KzqCku4SQPQ14MEIuCPdq5OEgiiqjo_O2A0FItBrHlmfkoJHViDxuX4P6z/exec";

/* ---------- UTILITIES ---------- */
const $ = (id) => document.getElementById(id);
const money = (n) => "$" + Number(n ?? 0).toFixed(2);
const pct   = (n) => Number(n ?? 0).toFixed(2) + "%";

function tableFromObject(obj, headers) {
  if (!obj || !Object.keys(obj).length) return "<p class='muted'>No data</p>";
  let html = "<table><thead><tr>";
  headers.forEach(h => html += `<th>${h}</th>`);
  html += "</tr></thead><tbody>";
  Object.entries(obj).forEach(([k, v]) => {
    const val = typeof v === "number" ? money(v) : v;
    html += `<tr><td>${k}</td><td class="num">${val}</td></tr>`;
  });
  html += "</tbody></table>";
  return html;
}

/* ---------- RENDERERS ---------- */
function renderOverview() {
  if (!window.AppState || !AppState.totals) return;
  const t = AppState.totals;
  $("ov-earnings").textContent  = money(t.earnings);
  $("ov-leads").textContent     = Number(t.leads ?? 0).toFixed(0);
  $("ov-clicks").textContent    = Number(t.clicks ?? 0).toFixed(0);
  $("ov-convrate").textContent  = pct(t.conversionRate);
  $("ov-epc").textContent       = money(t.epc);
  $("ov-cpa").textContent       = money(t.cpa);
  $("ov-rpm").textContent       = money(t.rpm);

  $("tbl-geo").innerHTML        = tableFromObject(AppState.geo,       ["Country","Earnings ($)"]);
  $("tbl-device").innerHTML     = tableFromObject(AppState.devices,   ["Device","Earnings ($)"]);
  $("tbl-offerType").innerHTML  = tableFromObject(AppState.offerTypes,["Offer Type","Earnings ($)"]);
  $("tbl-byDay").innerHTML      = tableFromObject(AppState.byDay,     ["Date","Earnings ($)"]);
}

function renderAnalyticsTab() {
  // Use byDay as the detailed list in Analytics
  const body = document.getElementById("analyticsBody");
  if (!body || !AppState || !AppState.byDay) return;
  body.innerHTML = Object.entries(AppState.byDay)
    .map(([date, val]) =>
      `<tr><td>${date}</td><td class="num">—</td><td class="num">—</td><td class="num">${money(val)}</td></tr>`
    ).join("");
}

/* stubs so tabs won’t error if you click them */
function renderUsersTab(){}      // your existing Users code can go here later
function renderCPATab(){}        // your CPA Accounts code
function renderWalletTab(){}     // your Wallet code
function renderMonitoringTab(){} // your Monitoring code
function renderSettingsTab(){}   // your Settings code

/* ---------- SIMPLE TAB ROUTER ---------- */
(function initRouter(){
  const links = Array.from(document.querySelectorAll(".navlink"));
  const views = Array.from(document.querySelectorAll(".view"));
  const show = (id) => {
    links.forEach(a => a.classList.toggle("active", a.dataset.target === id));
    views.forEach(v => v.classList.toggle("active", v.id === id));
    // per-tab renders
    if (id === "overview")   renderOverview();
    if (id === "analytics")  renderAnalyticsTab();
    if (id === "users")      renderUsersTab();
    if (id === "cpa")        renderCPATab();
    if (id === "wallet")     renderWalletTab();
    if (id === "monitoring") renderMonitoringTab();
    if (id === "settings")   renderSettingsTab();
  };
  links.forEach(a => a.addEventListener("click", e => { e.preventDefault(); const id=a.dataset.target; history.replaceState(null,"","#"+id); show(id); }));
  const initial = (location.hash || "#overview").slice(1);
  window.__showTab = show; // expose for debug
  show(initial);
})();

/* ---------- BOOT: FETCH ONCE, SHARE EVERYWHERE ---------- */
async function boot() {
  try {
    const url = `${window.EMPIRE_API_URL}?_=${Date.now()}`; // cache-bust
    const res = await fetch(url, { headers: { "Accept":"application/json" } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    console.log("API data:", data);
    window.AppState = data;     // make global so all tabs can reuse
    renderOverview();           // Overview is the summary of other tabs
  } catch (err) {
    console.error("Boot error:", err);
    // small inline signal
    const el = document.getElementById("ov-earnings");
    if (el) el.textContent = "Error";
  }
}
document.addEventListener("DOMContentLoaded", boot);
</script>