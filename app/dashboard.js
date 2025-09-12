/* ======= Commander Tools → GAS wiring ======= */
/* Place this in app/dashboard.js (do NOT duplicate $ or escapeHTML) */

const GAS_URL = "https://script.google.com/macros/s/AKfycbz-jj7Cr_KzqCku4SQPQ14MEIuCPdq5OEgiiqjo_O2A0FItBrHlmfkoJHViDxuX4P6z/exec";
const KEY     = "GENERALISIMO@15769";

// Uses the same $ from your UTILS section
// Uses escapeHTML you added in UTILS (make sure it is defined once)

/* PIN storage used as x-cmd-user header */
const getPIN  = () => localStorage.getItem("empire_cmd_user") || "";
const setPIN  = (v) => localStorage.setItem("empire_cmd_user", v || "");
const headerAuth = () => (getPIN() ? { "x-cmd-user": getPIN() } : {});

/* Small helper to paint responses */
const setMsg = (el, ok, html) => {
  el.className = "msg " + (ok ? "ok" : "bad");
  el.innerHTML = html;
};

/* Wire PIN save/clear controls (if present on the page) */
function initPIN() {
  const save = $("savePin");
  const clr  = $("clearPin");
  const pin  = $("pin");
  const sts  = $("pinStatus");

  if (save) save.onclick = () => {
    setPIN(pin.value.trim());
    if (sts) sts.textContent = "PIN saved (used as x-cmd-user header).";
  };
  if (clr) clr.onclick = () => {
    setPIN("");
    if (pin) pin.value = "";
    if (sts) sts.textContent = "PIN cleared.";
  };
  if (pin && sts) {
    pin.value = getPIN();
    sts.textContent = getPIN() ? "PIN loaded." : "No PIN saved.";
  }
}

/* Generic POSTer to GAS ?action=...&key=... */
async function callGAS(action, body, msgEl){
  const url = `${GAS_URL}?action=${encodeURIComponent(action)}&key=${encodeURIComponent(KEY)}`;
  try{
    const headers = { "Content-Type": "application/json", ...headerAuth() };
    const r = await fetch(url, { method:"POST", headers, body: JSON.stringify(body || {}) });
    const data = await r.json();
    setMsg(msgEl, data.ok !== false, `<pre>${escapeHTML(JSON.stringify(data, null, 2))}</pre>`);
  }catch(e){
    setMsg(msgEl, false, escapeHTML(String(e)));
  }
}

/* Buttons that talk to GAS (only wires if elements exist) */
function initCommanderButtons() {
  const btnInvite  = $("btnInvite");
  const btnApprove = $("btnApprove");
  const btnLevel   = $("btnLevel");
  const btnPerf    = $("btnPerf");

  if (btnInvite) btnInvite.onclick = () => {
    const body = {
      name: $("inv_name").value.trim(),
      email: $("inv_email").value.trim(),
      phone: $("inv_phone").value.trim(),
      telegramHandle: $("inv_tg").value.trim()
    };
    callGAS("invite-create", body, $("inviteMsg"));
  };

  if (btnApprove) btnApprove.onclick = () => {
    const body = {
      name: $("appr_name").value.trim(),
      email: $("appr_email").value.trim(),
      phone: $("appr_phone").value.trim(),
      approve: $("appr_approve").value === "true"
    };
    callGAS("approve-user", body, $("apprMsg"));
  };

  if (btnLevel) btnLevel.onclick = () => {
    const body = {
      email: $("lvl_email").value.trim(),
      level: $("lvl_level").value.trim(),
      reason: $("lvl_reason").value.trim()
    };
    callGAS("user-level-set", body, $("lvlMsg"));
  };

  if (btnPerf) btnPerf.onclick = () => {
    const body = {
      email: $("perf_email").value.trim(),
      clicks: Number($("perf_clicks").value || 0),
      conversions: Number($("perf_conversions").value || 0),
      revenueUSD: Number($("perf_revenue").value || 0),
      level: $("perf_level").value.trim(),
      notes: $("perf_notes").value.trim(),
      phone: $("perf_phone").value.trim(),
      notify: $("perf_notify").value === "true"
    };
    callGAS("log-performance", body, $("perfMsg"));
  };
}

/* Bootstrap the commander tools */
window.addEventListener("DOMContentLoaded", () => {
  initPIN();
  initCommanderButtons();
});