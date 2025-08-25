/* app/assets/js/dashboard-live.js
   Glue only: binds your styled dashboard to Netlify Functions.
   No layout/CSS changes. Safe to include on every dashboard page.
*/
(() => {
  const PIN_KEY = "CMD_USER";                     // Commander PIN storage
  const ADMIN = () => (localStorage.getItem(PIN_KEY) || "").trim();
  const BASE  = "";                               // same origin

  // --- tiny helpers --------------------------------------------------------
  const $  = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));
  const setText = (sel, v) => { const el = $(sel); if (el) el.textContent = v; };
  const setHTML = (sel, v) => { const el = $(sel); if (el) el.innerHTML = v; };
  const fmt = {
    money(n){ try{ return (Number(n)||0).toLocaleString(undefined,{style:"currency",currency:"USD"}); }catch{ return `$${n}`; } },
    pct(n){ const x = Number(n); return Number.isFinite(x) ? `${x.toFixed(1)}%` : "—"; }
  };
  const h = async (path, {method="GET", body=null, headers={}}={}) => {
    const res = await fetch(`${BASE}/.netlify/functions${path}`, {
      method,
      headers: { "Content-Type":"application/json", "x-admin-secret": ADMIN(), ...headers },
      body: body ? JSON.stringify(body) : null
    });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    return res.json().catch(()=> ({}));
  };

  // --- RENDERERS (only write into placeholders if they exist) --------------
  async function loadSummary(){
    // your backend should aggregate fast stats; if not, this composes them
    const [me, health, feed] = await Promise.allSettled([
      h("/me").catch(()=>({})),
      h("/monitor-health").catch(()=>({})),
      h("/monitor-feed").catch(()=>({items:[]})),
    ]);

    // Stats tiles
    const total   = me.value?.earnings ?? me.value?.totalEarnings ?? 0;
    const users   = me.value?.activeUsers ?? 0;
    const appr    = me.value?.aiApprovalRate ?? 0;
    const pending = me.value?.pendingReviews ?? 0;

    setText("#stat-earnings", fmt.money(total));
    setText("#stat-users", String(users));
    setText("#stat-approvalRate", fmt.pct(appr));
    setText("#stat-pending", String(pending));

    // Health badges
    const row = $("#health-badges");
    if (row && health.value){
      const items = [
        ["Server",     health.value.server || "ONLINE"],
        ["Database",   health.value.db || "CONNECTED"],
        ["Sheets API", health.value.sheets || "OPERATIONAL"],
        ["AI",         health.value.ai || "ACTIVE"],
        ["Sync",       health.value.sync || "15 SECONDS"]
      ];
      row.innerHTML = items.map(([k,v]) => `
        <span class="badge ${/OK|ON|ACTIVE|CONNECT/i.test(v) ? "b-ok" : /WARN|DEGRADED/i.test(v) ? "b-warn" : "b-down"}">
          <strong>${k}:</strong> ${v}
        </span>
      `).join("");
    }

    // Activity feed
    const tbody = $("#feed-body");
    if (tbody && feed.value?.items?.length){
      tbody.innerHTML = feed.value.items.map(it => `
        <tr>
          <td>${it.time || it.ts || ""}</td>
          <td>${it.type || ""}</td>
          <td>${(it.message||it.msg||"").replace(/</g,"&lt;")}</td>
          <td>${it.ref || ""}</td>
          <td>${it.actor || ""}</td>
        </tr>
      `).join("");
      const empty = $("#feed-empty"); if (empty) empty.style.display = "none";
    }
  }

  async function loadCPA(){
    const list = $("#cpa-list");
    if (!list) return;
    const data = await h("/cpa-accounts").catch(()=>({items:[]}));
    list.innerHTML = (data.items||[]).map(acc => `
      <div class="cpa-card">
        <div class="cpa-title">${acc.name || `CPA #${acc.id||""}`}</div>
        <div class="cpa-sub">${acc.domain || ""}</div>
        <div class="cpa-row"><span>Active Offers:</span> <b>${acc.offers ?? "—"}</b></div>
        <div class="cpa-row"><span>Revenue:</span> <b>${fmt.money(acc.revenue || 0)}</b></div>
        <div class="cpa-row"><span>Clicks:</span> <b>${(acc.clicks||0).toLocaleString()}</b></div>
        <div class="cpa-row"><span>Conversion:</span> <b>${fmt.pct(acc.conv || 0)}</b></div>
        <button class="btn view" data-id="${acc.id||""}">View Details</button>
      </div>
    `).join("");
  }

  async function loadUsers(){
    const body = $("#users-tbody");
    if (!body) return;
    const data = await h("/users-list").catch(()=>({items:[]}));
    body.innerHTML = (data.items||[]).map(u => `
      <tr>
        <td>${u.username || ""}</td>
        <td>${u.authority || u.level || ""}</td>
        <td>${fmt.money(u.earnings || 0)}</td>
        <td>${u.status || "ACTIVE"}</td>
        <td><a href="#" data-user="${u.id||""}" class="user-view">View</a></td>
      </tr>
    `).join("");
  }

  async function wireApprovals(){
    // “Sync Google Sheets” and “Run AI Analysis” buttons (IDs must exist in your HTML)
    const btnSync = $("#btn-sync-sheets");
    if (btnSync) btnSync.onclick = async () => {
      btnSync.disabled = true;
      try { await h("/admin-pending?reload=1"); toast("Google Sheets synced successfully!"); }
      catch(e){ toast("Failed to sync Google Sheets","err"); }
      finally { btnSync.disabled = false; refreshPending(); }
    };

    const btnAI = $("#btn-run-ai");
    if (btnAI) btnAI.onclick = async () => {
      btnAI.disabled = true;
      try { await h("/ai-run-approvals", {method:"POST"}); toast("AI analysis complete!"); }
      catch(e){ toast("AI analysis failed","err"); }
      finally { btnAI.disabled = false; refreshPending(); }
    };

    async function refreshPending(){
      const box = $("#pending-list");
      if (!box) return;
      const data = await h("/admin-pending").catch(()=>({items:[]}));
      box.innerHTML = (data.items||[]).map(p => `
        <div class="pending-row">
          <div class="name">${p.name||""}</div>
          <div class="meta">${p.email||""} • ${p.phone||""} • ${p.telegram||""}</div>
          <div class="actions">
            <button class="approve" data-id="${p.id}">Approve</button>
            <button class="dismiss" data-id="${p.id}">Dismiss</button>
          </div>
        </div>
      `).join("");

      box.querySelectorAll("button.approve").forEach(b => b.onclick = () => mark(b.dataset.id,"approved"));
      box.querySelectorAll("button.dismiss").forEach(b => b.onclick = () => mark(b.dataset.id,"dismissed"));
    }

    async function mark(id, status){
      try {
        await h("/admin-pending", {method:"POST", body:{action:"mark", id, status}});
        toast(`Marked ${status}`);
        await refreshPending();
      } catch {
        toast("Action failed","err");
      }
    }

    await refreshPending();
  }

  // simple toast (non-blocking)
  function toast(msg, kind="ok"){
    let el = $("#emp-toast");
    if (!el) {
      el = document.createElement("div");
      el.id = "emp-toast";
      el.style.cssText = "position:fixed;right:12px;top:12px;z-index:9999;max-width:340px;padding:10px 12px;border-radius:10px;border:1px solid #2f3b58;background:#0f1a2f;color:#cfe0ff;box-shadow:0 10px 20px rgba(0,0,0,.3)";
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.style.borderColor = kind==="err" ? "#991b1b" : "#166534";
    el.style.background  = kind==="err" ? "#2a0f0f" : "#0f2a18";
    clearTimeout(el._t); el._t = setTimeout(()=> el.remove(), 2600);
  }

  // refresh button (optional)
  const refreshBtn = $("#refreshBtn");
  if (refreshBtn) refreshBtn.onclick = () => { init(true); };

  // master init
  async function init(burst=false){
    try {
      await Promise.allSettled([
        loadSummary(),
        loadCPA(),
        loadUsers(),
        wireApprovals()
      ]);
      if (burst) toast("Refreshed");
    } catch(e) {
      // keep UI quiet; show subtle error only if needed
      // console.warn(e);
    }
  }

  // run
  document.addEventListener("DOMContentLoaded", init);
})();