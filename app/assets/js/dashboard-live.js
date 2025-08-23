// app/assets/js/dashboard-live.js
// Wires your EXISTING Empire layout to live Netlify functions (no redesign).

const API = {
  me: "/.netlify/functions/me",
  health: "/.netlify/functions/monitor-health",
  feed: "/.netlify/functions/monitor-feed",
};

// ---------- helpers ----------
const $ = (s) => document.querySelector(s);
async function j(url, opts) {
  const r = await fetch(url, opts);
  if (!r.ok) throw new Error(`${url} -> ${r.status}`);
  return r.json();
}
const txt = (el, v) => el && (el.textContent = v ?? "—");
const money = (n, cur = "") =>
  n == null || isNaN(n) ? "—" : (cur ? cur + " " : "") + Number(n).toLocaleString();
const badgeClass = (s = "") => {
  s = s.toUpperCase();
  if (/(ONLINE|ACTIVE|OPERATIONAL|CONNECTED|OK)/.test(s)) return "b-ok";
  if (/(WARN|DEGRADED|PENDING)/.test(s)) return "b-warn";
  return "b-down";
};
const extractAmount = (msg = "") => {
  const m = msg.replace(/,/g, "").match(/\b(\d{3,}(\.\d+)?)\b/);
  return m ? Number(m[1]) || 0 : 0;
};

// ---------- PROFILE ----------
async function loadProfile() {
  try {
    const res = await j(API.me);
    if (!res.ok) throw new Error(res.error || "me failed");
    const u = res.user || {};

    txt($("#name"), u.name);
    txt($("#contact"), [u.email, u.phone].filter(Boolean).join(" · "));
    const st = $("#status");
    if (st) {
      st.textContent = u.status || "—";
      st.className = "pill " + ((u.status || "").toUpperCase().includes("APPROVED") ? "ok" : "");
    }
    txt($("#scale"), u.scale);

    // Optional: top-bar username chip
    txt(document.querySelector("[data-username]"), u.name);

    // If your basic page hides profile while loading
    const note = $("#note");
    const prof = $("#profile");
    if (note) note.style.display = "none";
    if (prof) prof.style.display = "block";
  } catch (e) {
    console.warn("profile:", e);
  }
}

// ---------- HEALTH ----------
function renderHealth(h = {}) {
  const row = $("#healthRow");
  if (!row) return;
  row.innerHTML = "";
  for (const [label, state] of Object.entries(h)) {
    const el = document.createElement("div");
    el.className = `badge ${badgeClass(state)}`;
    el.textContent = `${label}: ${state}`;
    row.appendChild(el);
  }

  // Optional navbar chip
  const chip = document.querySelector("[data-system-chip]");
  if (chip) {
    chip.textContent = String(h.server || "—");
    chip.className = `chip ${badgeClass(h.server)}`;
  }
}

async function loadHealth() {
  try {
    const h = await j(API.health);
    renderHealth(h.data || h);
  } catch (e) {
    console.warn("health:", e);
  }
}

// ---------- FEED + KPIs ----------
function renderFeed(items = []) {
  const tbody = $("#feedTable tbody");
  const empty = $("#feedEmpty");
  if (!tbody) return;

  tbody.innerHTML = "";
  if (!items.length) {
    if (empty) empty.style.display = "block";
    return;
  }
  if (empty) empty.style.display = "none";

  for (const it of items) {
    const tr = document.createElement("tr");
    const cells = [
      new Date(it.ts || Date.now()).toLocaleString(),
      it.type || "—",
      it.message || "—",
      it.ref || "—",
      it.actor || "—",
    ];
    for (const c of cells) {
      const td = document.createElement("td");
      td.textContent = c;
      tr.appendChild(td);
    }
    tbody.appendChild(tr);
  }
}

function deriveKpis(items = []) {
  const now = Date.now();
  const dayAgo = now - 24 * 60 * 60 * 1000;

  const active = new Set(
    items
      .filter(i => new Date(i.ts || now).getTime() >= dayAgo)
      .map(i => (i.actor || "").trim())
      .filter(Boolean)
  ).size;

  const pending = items.filter(i => /REVIEW|PENDING/i.test((i.type || "") + " " + (i.message || ""))).length;

  const approved = items.filter(i => /APPROVED/i.test((i.type || "") + " " + (i.message || ""))).length;
  const rejected = items.filter(i => /REJECT/i.test((i.type || "") + " " + (i.message || ""))).length;
  const aiRate = approved + rejected ? (approved / (approved + rejected)) * 100 : null;

  const totalEarnings = items
    .filter(i => /EARN|PAYOUT|WITHDRAW|BALANCE|REVENUE/i.test((i.message || "") + " " + (i.type || "")))
    .reduce((sum, it) => sum + extractAmount(it.message), 0);

  return { active, pending, aiRate, totalEarnings };
}

function renderKpis(k) {
  // Map these to your tile element IDs; change selectors if your IDs differ.
  txt($("#kpiTotalEarnings"), money(k.totalEarnings));
  txt($("#kpiActiveUsers"), k.active);
  txt($("#kpiAiApprovalRate"), k.aiRate != null ? `${k.aiRate.toFixed(1)}%` : "—");
  txt($("#kpiPendingReviews"), k.pending);
}

async function loadFeedAndKpis() {
  try {
    const f = await j(API.feed);
    const items = f.items || f.data || [];
    renderFeed(items);
    renderKpis(deriveKpis(items));
  } catch (e) {
    console.warn("feed:", e);
  }
}

// ---------- init / auto-refresh ----------
function init(ms = 15000) {
  const btn = document.querySelector("#refreshBtn");
  if (btn) btn.addEventListener("click", () => {
    loadHealth();
    loadFeedAndKpis();
  });

  // first load
  loadProfile();
  loadHealth();
  loadFeedAndKpis();

  // periodic refresh
  setInterval(() => {
    loadHealth();
    loadFeedAndKpis();
  }, ms);
}

init(15000);