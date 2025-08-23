// ===== EMPIRE CORE (single file) =====

// --- Endpoints (Netlify Functions)
const ENDPOINTS = {
  health: "/.netlify/functions/monitor-health",
  feed:   "/.netlify/functions/monitor-feed",
  sheets: "/.netlify/functions/sheets-sync",
  payout: "/.netlify/functions/wallet-transfer",
};

// --- Tiny fetch helpers
async function getJSON(url) {
  const r = await fetch(url, { headers: { "Accept": "application/json" } });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}
async function postJSON(url, body) {
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Accept": "application/json" },
    body: JSON.stringify(body || {})
  });
  const out = await r.json().catch(() => ({}));
  if (!r.ok || out.ok === false) throw new Error(out.error || r.statusText);
  return out;
}

// --- GLOBAL logger (use from ANY page)
async function logEvent({ type, message, ref = "", actor = "system", meta = {} }) {
  try {
    await postJSON(ENDPOINTS.feed, { type, message, ref, actor, meta });
  } catch (e) {
    console.warn("logEvent failed:", e.message || e);
  }
}

// --- Optional helpers you can call directly (one-liners)
async function requestPayout(amount, role = "COMMANDER", dest = {}) {
  const res = await postJSON(ENDPOINTS.payout, { amount, role, dest });
  // Log only on success; if blocked, throw to caller
  await logEvent({
    type: "PAYOUT_REQUESTED",
    message: `Requested $${amount}`,
    ref: "wallet:self",
    actor: role,
    meta: { amount, role }
  });
  return res;
}
async function inviteLogged({ whatsapp, actor = "Commander" }) {
  await logEvent({
    type: "INVITE_GENERATED",
    message: `Invite link created for ${whatsapp}`,
    ref: "users:invite",
    actor,
    meta: { whatsapp }
  });
}

// Expose globally (no imports needed anywhere)
window.Empire = Object.freeze({
  endpoints: ENDPOINTS,
  getJSON,
  postJSON,
  logEvent,
  requestPayout,
  inviteLogged,
});

// ===== Monitoring UI (auto-activates only if page has the elements) =====
const healthRow = document.getElementById("healthRow");
const refreshBtn = document.getElementById("refreshBtn");
const feedTable  = document.querySelector("#feedTable tbody");
const feedEmpty  = document.getElementById("feedEmpty");

if (healthRow && feedTable) {
  // we are on monitoring.html — wire the UI
  function badge(label, value) {
    const cls =
      value === "ONLINE" || value === "OPERATIONAL" || value === "CONNECTED" ? "ok" :
      value === "DEGRADED" ? "warn" : "down";
    return `<div class="card"><div style="display:flex;gap:8px;align-items:center">
      <span class="muted">${label}</span>
      <span class="badge ${cls}">${value}</span>
    </div></div>`;
  }

  async function render() {
    // Health
    try {
      const h = await getJSON(ENDPOINTS.health);
      healthRow.innerHTML = [
        badge("Server", h.server),
        badge("Database", h.db),
        badge("Sheets", h.sheets),
        badge("AI", h.ai),
        badge("Sync", h.sync)
      ].join("");
    } catch {
      healthRow.innerHTML = "<div class='card'>Health fetch failed</div>";
    }

    // Feed
    try {
      const f = await getJSON(ENDPOINTS.feed);
      const events = f.events || f || [];
      feedTable.innerHTML = "";
      if (!events.length) {
        feedEmpty.style.display = "block";
      } else {
        feedEmpty.style.display = "none";
        events.forEach(ev => {
          const ts    = ev.ts      ?? ev[0] ?? "";
          const type  = ev.type    ?? ev[1] ?? "";
          const msg   = ev.message ?? ev[2] ?? "";
          const ref   = ev.ref     ?? ev[3] ?? "";
          const actor = ev.actor   ?? ev[4] ?? "";
          feedTable.insertAdjacentHTML(
            "beforeend",
            `<tr><td>${ts}</td><td>${type}</td><td>${msg}</td><td>${ref}</td><td>${actor}</td></tr>`
          );
        });
      }
    } catch {
      feedTable.innerHTML = "<tr><td colspan='5' class='muted'>Feed fetch failed</td></tr>";
    }
  }

  if (refreshBtn) refreshBtn.addEventListener("click", render);
  render();
  setInterval(render, 15000);
}
// ===== END (single file) =====