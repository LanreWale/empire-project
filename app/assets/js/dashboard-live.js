/* app/assets/js/dashboard-live.js
   Empire Dashboard – production-ready client (robust parsing)
   - Uses stored token (EMPIRE_TOKEN or CMD_USER)
   - Talks directly to Netlify functions (no /api remap)
   - Tolerant to different backend payload shapes
   - Populates Profile, KPIs, Health, Feed, Banks, Payout
   - Debug dump with ?debug=1
*/

/* ============= 0) Utilities & constants ============= */
const STORAGE_KEYS = { user: "EMPIRE_TOKEN", cmd: "CMD_USER" };
const API = {
  me:               "/.netlify/functions/me",
  health:           "/.netlify/functions/monitor-health",
  feed:             "/.netlify/functions/monitor-feed",
  summary:          "/.netlify/functions/gs-bridge?action=summary",
  banks:            "/.netlify/functions/paystack-banks",
  payoutQuote:      "/.netlify/functions/paystack-transfer?dryrun=1",
  payoutRequest:    "/.netlify/functions/paystack-transfer",
  sheetsPing:       "/.netlify/functions/gs-bridge?action=ping",
  sheetsAppend:     "/.netlify/functions/gs-bridge",
};

function getAuthToken() {
  let t = "";
  try {
    t = localStorage.getItem(STORAGE_KEYS.user) || localStorage.getItem(STORAGE_KEYS.cmd) || "";
  } catch {}
  return (t || "").trim();
}

async function fetchJson(url, opts = {}) {
  const token = getAuthToken();
  const headers = Object.assign(
    { "Content-Type": "application/json" },
    opts.headers || {},
    token ? { "x-empire-token": token } : {}
  );
  const res = await fetch(url, { ...opts, headers, cache: "no-store" });
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = { ok: res.ok, raw: text }; }
  if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
  return data;
}

function $(id){ return document.getElementById(id); }
function show(el){ if (el) el.style.display = ""; }
function hide(el){ if (el) el.style.display = "none"; }
function setText(id, val){ const el=$(id); if (el) el.textContent = (val ?? "—"); }
function fmtMoney(n, curr="NGN"){
  const v = Number(n || 0);
  try { return new Intl.NumberFormat("en-NG", { style:"currency", currency: curr }).format(v); }
  catch { return `${curr} ${v.toFixed(2)}`; }
}
function ts(x){ try { return new Date(x).toLocaleString(); } catch { return x || "—"; } }
function qp(k){ return new URL(location.href).searchParams.get(k); }
function el(tag, attrs={}, ...children){
  const e=document.createElement(tag);
  Object.entries(attrs).forEach(([k,v])=>{ if(k==="class") e.className=v; else e.setAttribute(k,v); });
  children.forEach(c=>e.append(c));
  return e;
}

/* ============= 1) Profile (/me) ============= */
async function loadMe() {
  const note = $("note");
  const profile = $("profile");
  const token = getAuthToken();

  if (!token) {
    if (note) { show(note); note.textContent = "No session token. Go to Login."; }
    if (profile) hide(profile);
    return { ok:false, error:"No token" };
  }

  try {
    const me = await fetchJson(API.me);
    // Accept either { ok,true, user:{...} } or flattened fields
    const u = me.user || me || {};
    const status = u.status || (u.approved ? "APPROVED" : "PENDING");

    // Populate
    setText("name", u.name || u.fullName || "—");
    setText("contact", [u.email, u.phone].filter(Boolean).join(" • "));
    setText("status", status);
    setText("scale",  (u.scale != null ? String(u.scale) : "—"));

    if (note) hide(note);
    if (profile) show(profile);
    return { ok:true, user:u };
  } catch (e) {
    if (note) { note.textContent = `Profile error: ${e.message}`; show(note); }
    if (profile) hide(profile);
    return { ok:false, error:String(e.message||e) };
  }
}

/* ============= 2) Health (/monitor-health) ============= */
function badge(text, cls="badge-sm"){ return el("span", { class: cls }, text); }
function stateBadge(s){
  const v = String(s || "UNKNOWN").toUpperCase();
  if (["ONLINE","CONNECTED","OPERATIONAL","ACTIVE","OK"].includes(v)) return badge(v,"badge-sm ok");
  if (["WARN","DEGRADED","LAGGING"].includes(v)) return badge(v,"badge-sm warn");
  return badge(v,"badge-sm down");
}

async function loadHealth() {
  const row = $("healthRow");
  if (!row) return { ok:false, error:"no healthRow" };
  row.innerHTML = "";
  try {
    const h = await fetchJson(API.health);
    // Accept either top-level fields or nested
    const d = h.data || h || {};
    row.append(
      stateBadge(d.server),
      stateBadge(d.db || d.database),
      stateBadge(d.sheets),
      stateBadge(d.ai || d.model || "AI"),
      badge(`Sync: ${d.sync ?? d.sheetSync ?? "—"}`, "badge-sm")
    );
    return { ok:true, ...d };
  } catch (e) {
    row.append(badge("Health error","badge-sm down"));
    return { ok:false, error:String(e.message||e) };
  }
}

/* ============= 3) Event feed (/monitor-feed) ============= */
async function loadFeed() {
  const tb = $("feedTable")?.querySelector("tbody");
  const empty = $("feedEmpty");
  if (!tb) return { ok:false, error:"no feedTable" };
  tb.innerHTML = "";
  try {
    const data = await fetchJson(API.feed);
    // Accept: { events: [...] } or { events:{ items:[] } } or { items:[] }
    const events =
      (Array.isArray(data.events) ? data.events : null) ||
      (Array.isArray(data.items) ? data.items : null) ||
      (Array.isArray(data?.events?.items) ? data.events.items : null) ||
      [];

    if (!events.length) { if (empty) show(empty); return { ok:true, count:0 }; }
    if (empty) hide(empty);

    events.slice(0,100).forEach(ev=>{
      const tr = el("tr");
      tr.append(
        el("td",{}, ts(ev.ts || ev.time || ev.date)),
        el("td",{}, ev.type || ev.kind || "—"),
        el("td",{}, ev.message || ev.msg || ev.note || "—"),
        el("td",{}, ev.ref || ev.id || "—"),
        el("td",{}, ev.actor || ev.user || ev.by || "—")
      );
      tb.append(tr);
    });
    return { ok:true, count: events.length };
  } catch (e) {
    tb.append(el("tr",{}, el("td",{colspan:"5"}, `Feed error: ${e.message}`)));
    return { ok:false, error:String(e.message||e) };
  }
}

/* ============= 4) KPIs (/gs-bridge?action=summary) ============= */
async function loadSummary() {
  try {
    const s = await fetchJson(API.summary);
    const d = s.data || s || {};
    // Accept multiple field names
    const total   = d.totalEarnings ?? d.total ?? d.earnings ?? 0;
    const users   = d.activeUsers   ?? d.users ?? d.members ?? 0;
    const rate    = d.approvalRate  ?? d.rate  ?? null; // expect number or string
    const pending = d.pendingReviews ?? d.pending ?? 0;
    const curr    = d.currency || "NGN";

    setText("kpi_total",  fmtMoney(total, curr));
    setText("kpi_users",  users);
    setText("kpi_rate",   (rate != null && rate !== "") ? `${String(rate).replace(/%$/,"")}%` : "—");
    setText("kpi_pending", pending);
    return { ok:true, total, users, rate, pending, currency: curr };
  } catch (e) {
    // Don’t block page on KPI error
    return { ok:false, error:String(e.message||e) };
  }
}

/* ============= 5) Banks & payout ============= */
async function loadBanks() {
  const sel = $("bankSelect");
  if (!sel) return { ok:false, error:"no bankSelect" };
  sel.innerHTML = `<option value="">Select bank</option>`;
  try {
    const data = await fetchJson(API.banks);
    // Accept: { banks:[...] } or Paystack-style { status:true, data:[...] }
    const arr = (Array.isArray(data.banks) ? data.banks :
                Array.isArray(data.data) ? data.data : []);
    arr.forEach(b=>{
      const code = b.code || b.slug || b.id;
      const name = b.name || b.slug || `#${b.id}`;
      if (!code) return;
      sel.append(el("option", { value: code }, name));
    });
    return { ok:true, count: arr.length };
  } catch (e) {
    return { ok:false, error:String(e.message||e) };
  }
}

async function requestPayout() {
  const provider = $("providerSelect")?.value || "Paystack";
  const bankCode = $("bankSelect")?.value || "";
  const acct = $("acctInput")?.value || "";
  const name = $("acctName")?.value || "";
  const amt = parseFloat(($("amountInput")?.value || "").trim()) || 0;

  if (!amt || !bankCode || !acct) { alert("Enter amount, select bank, and account number."); return; }

  try {
    // optional dry run / quote
    await fetchJson(API.payoutQuote, {
      method: "POST",
      body: JSON.stringify({ provider, bankCode, accountNumber: acct, accountName: name, amount: amt }),
    });

    const r = await fetchJson(API.payoutRequest, {
      method: "POST",
      body: JSON.stringify({ provider, bankCode, accountNumber: acct, accountName: name, amount: amt }),
    });

    if (r?.ok === false) throw new Error(r?.error || "Payout failed");
    alert("Payout submitted.");
  } catch (e) {
    alert(`Payout error: ${e.message || e}`);
  }
}

/* ============= 6) Sheets ops (Users tab) ============= */
async function sheetsPing() {
  try {
    const r = await fetchJson(API.sheetsPing);
    alert(r?.ok ? "Sheets ping OK" : (r?.error || "Ping failed"));
  } catch (e) {
    alert(`Ping error: ${e.message || e}`);
  }
}
async function sheetsAppendSample() {
  try {
    const r = await fetchJson(API.sheetsAppend, {
      method: "POST",
      body: JSON.stringify({ action:"append", sheet:"Event_Log", values: [Date.now(),"dashboard_test","Manual append from dashboard"] }),
    });
    alert(r?.ok ? "Event appended." : (r?.error || "Append failed"));
  } catch (e) {
    alert(`Append error: ${e.message || e}`);
  }
}

/* ============= 7) Debug panel ============= */
function updateDebug(payload) {
  if (qp("debug") !== "1") return;
  const box = $("debug"), raw=$("raw");
  if (!box || !raw) return;
  show(raw);
  try { box.textContent = JSON.stringify(payload, null, 2); }
  catch { box.textContent = String(payload); }
}

/* ============= 8) Init ============= */
async function init() {
  // Wire buttons if present
  const refreshBtn = $("refreshBtn");
  if (refreshBtn) refreshBtn.addEventListener("click", loadHealth);
  const payoutBtn = $("payoutBtn");
  if (payoutBtn) payoutBtn.addEventListener("click", requestPayout);
  const pingBtn = $("sheetsPingBtn");
  if (pingBtn) pingBtn.addEventListener("click", sheetsPing);
  const appendBtn = $("sheetsAppendBtn");
  if (appendBtn) appendBtn.addEventListener("click", sheetsAppendSample);

  // Load all data
  const me      = await loadMe();
  const [health, feed, summary] = await Promise.all([loadHealth(), loadFeed(), loadSummary()]);
  await loadBanks();

  updateDebug({ me, health, feed, summary });
}

document.addEventListener("DOMContentLoaded", init);