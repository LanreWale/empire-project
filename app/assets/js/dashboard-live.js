// app/assets/js/dashboard-live.js
// SINGLE unified live wiring for your Empire dashboard.
// Works with either classic IDs OR data-* hooks, so you don't have to change your HTML.

const API = {
  me: "/.netlify/functions/me",
  health: "/.netlify/functions/monitor-health",
  feed: "/.netlify/functions/monitor-feed",
  gsBridge: "/.netlify/functions/gs-bridge",
  paystackTransfer: "/.netlify/functions/paystack-transfer",
  // keep your working invite flow as-is (we don't touch it)
};

const $  = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));
const txt = (el, v) => el && (el.textContent = v ?? "—");
const money = n => (n==null||isNaN(n)) ? "—" : Number(n).toLocaleString();
async function j(url, opts){ const r = await fetch(url, opts); if(!r.ok) throw new Error(`${url}: ${r.status}`); return r.json(); }

// -------- selectors (IDs *or* data-* supported) ----------
const SEL = {
  // profile
  name:    "#name, [data-user='name']",
  contact: "#contact, [data-user='contact']",
  status:  "#status, [data-user='status']",
  scale:   "#scale, [data-user='scale']",
  note:    "#note",
  profile: "#profile",

  // monitoring (health + feed)
  healthRow:   "#healthRow, [data-health-list]", // if data-health-list exists, we'll auto-list
  feedBody:    "#feedTable tbody, [data-feed-body]",
  feedEmpty:   "#feedEmpty, [data-feed-empty]",
  refreshBtn:  "#refreshBtn, [data-refresh]",

  // KPIs
  kpiTotalEarnings:  "#kpiTotalEarnings, [data-kpi='totalEarnings']",
  kpiActiveUsers:    "#kpiActiveUsers, [data-kpi='activeUsers']",
  kpiAiApprovalRate: "#kpiAiApprovalRate, [data-kpi='aiApprovalRate']",
  kpiPendingReviews: "#kpiPendingReviews, [data-kpi='pendingReviews']",

  // users table (read-only)
  usersBody: "[data-users-body]",

  // payments
  wdRoot:   "[data-withdraw-root]",
  wdAmount: "[data-withdraw='amount']",
  wdRecip:  "[data-withdraw='recipient']",
  wdReason: "[data-withdraw='reason']",
  wdSubmit: "[data-withdraw-submit]",
};

// ---------- PROFILE ----------
async function loadProfile(){
  try{
    const out = await j(API.me);
    if(!out.ok) throw new Error(out.error||"me failed");
    const u = out.user || {};

    txt($(SEL.name), u.name);
    txt($(SEL.contact), [u.email,u.phone].filter(Boolean).join(" · "));
    const st = $(SEL.status);
    if (st){
      const v = u.status || "—";
      st.textContent = v;
      st.classList.toggle("ok", v.toUpperCase().includes("APPROVED"));
    }
    txt($(SEL.scale), u.scale);

    const note = $(SEL.note), prof = $(SEL.profile);
    if (note) note.style.display = "none";
    if (prof) prof.style.display = "block";
  }catch(e){ console.warn("profile:", e); }
}

// ---------- HEALTH ----------
function badgeClass(s=""){
  s = String(s).toUpperCase();
  if (/(ONLINE|ACTIVE|OPERATIONAL|CONNECTED|OK|HEALTHY)/.test(s)) return "ok";
  if (/(WARN|DEGRADED|PENDING)/.test(s)) return "warn";
  return "down";
}
function renderHealth(map = {}){
  const container = $(SEL.healthRow);
  if (!container) return;

  // If it's a free container (data-health-list), render badges
  if (container.hasAttribute && container.hasAttribute("data-health-list")){
    container.innerHTML = "";
    Object.entries(map).forEach(([k,v])=>{
      const span = document.createElement("span");
      span.className = `badge ${badgeClass(v)}`;
      span.textContent = `${k}: ${v}`;
      container.appendChild(span);
    });
  } else {
    // Otherwise try to map to individual data-health="key" elements (if you use them)
    Object.entries(map).forEach(([k,v])=>{
      $$(`[data-health='${k}']`).forEach(el=>{
        el.classList.remove("ok","warn","down");
        el.classList.add(badgeClass(v));
        el.textContent = v;
      });
    });
  }
}
async function loadHealth(){
  try{
    const h = await j(API.health);
    renderHealth(h.data || h);
  }catch(e){ console.warn("health:", e); }
}

// ---------- FEED + KPIs ----------
function renderFeed(items=[]){
  const body = $(SEL.feedBody);
  const empty = $(SEL.feedEmpty);
  if (!body) return;

  body.innerHTML = "";
  if (!items.length){ if (empty) empty.style.display = "block"; return; }
  if (empty) empty.style.display = "none";

  for (const it of items){
    const tr = document.createElement("tr");
    [
      new Date(it.ts || Date.now()).toLocaleString(),
      it.type || "—",
      it.message || "—",
      it.ref || "—",
      it.actor || "—",
    ].forEach(c => {
      const td = document.createElement("td");
      td.textContent = c;
      tr.appendChild(td);
    });
    body.appendChild(tr);
  }
}
function deriveKpis(items=[]){
  const now = Date.now(), dayAgo = now - 86400000;

  const active = new Set(
    items.filter(i => new Date(i.ts||now).getTime() >= dayAgo)
         .map(i => (i.actor||"").trim())
         .filter(Boolean)
  ).size;

  const pending  = items.filter(i => /REVIEW|PENDING/i.test((i.type||"")+" "+(i.message||""))).length;
  const approved = items.filter(i => /APPROVED/i.test((i.type||"")+" "+(i.message||""))).length;
  const rejected = items.filter(i => /REJECT/i.test((i.type||"")+" "+(i.message||""))).length;
  const aiRate   = approved+rejected ? (approved/(approved+rejected))*100 : null;

  return { active, pending, aiRate };
}
function renderKpis(k){
  txt($(SEL.kpiActiveUsers), k.active);
  txt($(SEL.kpiAiApprovalRate), k.aiRate==null ? "—" : `${k.aiRate.toFixed(1)}%`);
  txt($(SEL.kpiPendingReviews), k.pending);
  // If you later want to bind earnings derived from feed/sheets, add it here:
  // txt($(SEL.kpiTotalEarnings), money(k.totalEarnings));
}
async function loadFeedAndKpis(){
  try{
    const f = await j(API.feed);
    const items = f.items || f.data || [];
    renderFeed(items);
    renderKpis(deriveKpis(items));
  }catch(e){ console.warn("feed:", e); }
}

// ---------- USERS (read-only from Google Sheets via gs-bridge) ----------
async function loadUsers(){
  const tbody = $(SEL.usersBody);
  if (!tbody) return;
  try{
    const r = await j(API.gsBridge, {
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({ action:"list", sheet:"Users" })
    });
    const rows = r.data || r.rows || [];
    tbody.innerHTML = "";
    for (const row of rows){
      const tr = document.createElement("tr");
      const vals = [
        row.id || row.userId || "—",
        row.name || "—",
        row.email || "—",
        row.phone || "—",
        row.telegram || "—",
        row.status || "—",
        row.level || row.scale || "—",
      ];
      vals.forEach(v => { const td = document.createElement("td"); td.textContent = v; tr.appendChild(td); });
      tbody.appendChild(tr);
    }
  }catch(e){ console.warn("users:", e); }
}

// ---------- PAYMENTS (Paystack) ----------
function bindWithdraw(){
  const root = $(SEL.wdRoot);
  if (!root) return;
  const btn = $(SEL.wdSubmit, root);
  if (!btn) return;

  btn.addEventListener("click", async ()=>{
    const amount = Number($(SEL.wdAmount, root)?.value || 0);
    const recip  = $(SEL.wdRecip, root)?.value?.trim(); // Paystack recipient_code
    const reason = $(SEL.wdReason, root)?.value?.trim() || "Empire payout";
    if (!amount || !recip) { alert("Enter amount and recipient_code"); return; }

    btn.disabled = true;
    try{
      const r = await j(API.paystackTransfer, {
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({ amount, recipient_code: recip, reason })
      });
      alert(r.ok ? "Payout queued" : ("Failed: " + (r.error || "Unknown")));
    }catch(e){ alert("Withdraw error: " + e.message); }
    finally{ btn.disabled = false; }
  });
}

// ---------- INIT ----------
function init(intervalMs = 15000){
  // profile (if your page shows it)
  loadProfile();

  // monitoring
  loadHealth();
  loadFeedAndKpis();

  // users (tab)
  loadUsers();

  // payments (withdraw)
  bindWithdraw();

  // refresh button + auto-refresh for monitoring
  const refresh = $(SEL.refreshBtn);
  if (refresh) refresh.addEventListener("click", () => { loadHealth(); loadFeedAndKpis(); });

  setInterval(()=>{ loadHealth(); loadFeedAndKpis(); }, intervalMs);
}

document.addEventListener("DOMContentLoaded", () => init(15000));