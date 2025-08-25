/* Empire Dashboard — Live wiring with auto-login
   - Finds EMPIRE_TOKEN or exchanges local CMD_USER PIN for a token
   - Supports ?token= and ?pin= in URL
   - Then loads profile/summary/health/feed/wallet
*/
const API = (p) => `/.netlify/functions/${p}`;

// ---------- tiny utils ----------
const qs = (s, r = document) => r.querySelector(s);
const qsa = (s, r = document) => [...r.querySelectorAll(s)];
const fmt = (n, c = "NGN") =>
  new Intl.NumberFormat("en-NG", { style: "currency", currency: c }).format(Number(n || 0));
const params = new URLSearchParams(location.search);
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// Storage keys (kept same as index.html)
const KEY_TOKEN = "EMPIRE_TOKEN";
const KEY_PIN   = "CMD_USER";

// ---------- auth / token bootstrap ----------
async function getToken() {
  // 1) URL overrides
  const urlToken = params.get("token");
  if (urlToken) {
    localStorage.setItem(KEY_TOKEN, urlToken);
    return urlToken;
  }
  const urlPin = params.get("pin");
  if (urlPin) {
    const t = await exchangePin(urlPin).catch(() => null);
    if (t) return t;
  }

  // 2) storage token
  const t = localStorage.getItem(KEY_TOKEN);
  if (t) return t;

  // 3) try exchange stored PIN → token
  const pin = (localStorage.getItem(KEY_PIN) || "").trim();
  if (pin) {
    const tok = await exchangePin(pin).catch(() => null);
    if (tok) return tok;
  }
  return null;
}

async function exchangePin(pin) {
  const res = await fetch(API("admin-login"), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ pin })
  });
  if (!res.ok) throw new Error("login failed");
  const data = await res.json();
  if (!data?.ok || !data?.token) throw new Error("bad response");
  localStorage.setItem(KEY_TOKEN, data.token);
  return data.token;
}

// Authorized fetch
async function api(path, init = {}) {
  const token = localStorage.getItem(KEY_TOKEN);
  const headers = Object.assign(
    { "content-type": "application/json", "authorization": `Bearer ${token || ""}` },
    init.headers || {}
  );
  const res = await fetch(API(path), Object.assign({ headers }, init));
  if (!res.ok) throw new Error(`${path}: ${res.status}`);
  return res.json();
}

// ---------- UI helpers ----------
function setText(sel, v) { const el = qs(sel); if (el) el.textContent = v; }
function show(el, on = true) { if (typeof el === "string") el = qs(el); if (el) el.style.display = on ? "" : "none"; }

function toast(msg, ok = true) {
  const bar = qs("#note");
  if (!bar) return;
  bar.textContent = msg;
  bar.style.color = ok ? "#b7f7c3" : "#ff9b9b";
  show(bar, true);
}

// ---------- renderers (match current HTML) ----------
async function loadProfile() {
  try {
    const me = await api("me");
    if (!me?.ok) throw new Error(me?.error || "profile");
    setText("#profName", me.name || "—");
    setText("#profStatus", me.status || "—");
    setText("#profScale", String(me.scale ?? "—"));
    show("#profileCard", true);
  } catch (e) {
    setText("#profileError", `Profile error: ${e.message || e}`);
  }
}

async function loadSummary() {
  try {
    const s = await api("summary");
    setText("#kpiEarnings", fmt(s.total_earnings || 0, s.currency || "NGN"));
    setText("#kpiUsers", s.active_users ?? 0);
    setText("#kpiRate", s.approval_rate != null ? `${s.approval_rate}%` : "—");
    setText("#kpiPending", s.pending_reviews ?? 0);
  } catch {
    // leave zeros
  }
}

async function loadHealth() {
  try {
    const h = await api("health");
    const row = qs("#healthRow");
    if (!row) return;
    row.innerHTML = "";
    const badge = (label, state) => {
      const span = document.createElement("span");
      span.className = `badge ${state === "ONLINE" || state === "OPERATIONAL" || state === "ACTIVE" ? "b-ok" : (state === "DEGRADED" ? "b-warn" : "b-down")}`;
      span.textContent = `${label}: ${state}`;
      return span;
    };
    row.append(badge("Server", h.server), badge("DB", h.db), badge("Sheets", h.sheets), badge("AI", h.ai));
  } catch {}
}

async function loadFeed() {
  try {
    const r = await api("events");
    const tbody = qs("#feedTable tbody");
    if (!tbody) return;
    tbody.innerHTML = "";
    const items = (r?.events?.items || []).slice(0, 50);
    if (!items.length) show("#feedEmpty", true);
    items.forEach(ev => {
      const tr = document.createElement("tr");
      tr.innerHTML = `<td>${new Date(ev.ts || ev.time || Date.now()).toLocaleString()}</td>
        <td>${ev.type || "—"}</td>
        <td>${ev.message || ev.msg || "—"}</td>
        <td>${ev.ref || "—"}</td>
        <td>${ev.actor || "—"}</td>`;
      tbody.appendChild(tr);
    });
  } catch {}
}

async function loadWallet() {
  try {
    // banks (Paystack proxy)
    const r = await api("banks");
    const sel = qs("#bankSelect");
    if (!sel) return;
    sel.innerHTML = `<option value="">Select bank</option>` +
      (r?.banks || []).map(b => `<option value="${b.code || b.id}">${b.name}</option>`).join("");
  } catch {}
}

// ---------- init ----------
async function init() {
  const noteEl = qs("#note");
  if (noteEl) show(noteEl, false);

  let token = localStorage.getItem(KEY_TOKEN);
  if (!token) {
    toast("No token, logging in…");
    token = await getToken();
  }

  if (!token) {
    toast("Login required. Open the home page and enter your PIN.", false);
    // show a back link if present
    const back = qs("#backLogin");
    if (back) show(back, true);
    return; // stop; UI stays with zeros
  }

  // token ready → load all panes
  show("#backLogin", false);
  show("#note", false);
  await Promise.allSettled([
    loadProfile(),
    loadSummary(),
    loadHealth(),
    loadFeed(),
    loadWallet()
  ]);
}

// button hooks
window.addEventListener("DOMContentLoaded", () => {
  const rf = qs("#refreshBtn");
  if (rf) rf.addEventListener("click", () => loadHealth());
  init().catch(() => {
    toast("Unexpected error while initializing", false);
  });
});