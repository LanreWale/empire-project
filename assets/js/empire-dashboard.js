/* assets/js/empire-dashboard.js
   Empire Dashboard data wiring (GAS-backed via EmpireAuth.fetch)
   Requires: assets/js/empire-auth.js loaded first
*/
(function () {
  // ---- Guards -------------------------------------------------------------
  if (!window.EmpireAuth) {
    console.error("EmpireAuth missing. Include assets/js/empire-auth.js first.");
    return;
  }
  document.addEventListener("DOMContentLoaded", init);

  // ---- Utils --------------------------------------------------------------
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const el = (tag, cls, html) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  };
  const fmtCur = (n) =>
    (n || n === 0) ? (Number(n).toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 2 })) : "-";
  const fmtInt = (n) => (n || n === 0) ? Number(n).toLocaleString() : "-";
  const fmtPct = (n) => (n || n === 0) ? `${Number(n).toFixed(1)}%` : "-";
  const timeAgo = (iso) => {
    if (!iso) return "";
    const d = new Date(iso);
    const s = Math.floor((Date.now() - d.getTime()) / 1000);
    if (s < 60) return `${s}s ago`;
    const m = Math.floor(s / 60);
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    const d2 = Math.floor(h / 24);
    return `${d2}d ago`;
  };

  // ---- Boot ---------------------------------------------------------------
  async function init() {
    // Gate
    if (!EmpireAuth.has()) {
      location.replace("/login.html");
      return;
    }

    // Tab change hook (from your dashboard.html nav)
    window.addEventListener("empire:tabchange", (ev) => {
      const tab = ev?.detail?.tab || "dashboard";
      hydrateTab(tab).catch(console.error);
    });

    // Initial hydrate (current hash already clicked by dashboard.html)
    const hash = (location.hash || "").replace(/^#/, "") || "dashboard";
    await hydrateTab(hash);
  }

  async function hydrateTab(tab) {
    switch (tab) {
      case "dashboard":  await loadOverview(); await loadHealth(); await loadMonitoringFeed(); break;
      case "cpa":        await loadCPA(); break;
      case "users":      await loadUsers(); break;
      case "wallet":     await loadWallet(); break;
      case "analytics":  await loadAnalytics(); break;
      case "security":   await loadHealth(); await loadAlerts(); break;
      case "monitoring": await loadMonitoringFeed(); await loadSchedules(); break;
      default: break;
    }
  }

  // ---- Overview (KPIs) ----------------------------------------------------
  async function loadOverview() {
    const host = $("#view-dashboard"); if (!host) return;

    // Ensure KPI container
    let kpi = host.querySelector(".emp-kpis");
    if (!kpi) {
      kpi = el("div", "emp-kpis");
      kpi.style.display = "grid";
      kpi.style.gridTemplateColumns = "repeat(auto-fit, minmax(200px, 1fr))";
      kpi.style.gap = "12px";
      host.appendChild(kpi);
    }

    // Fetch overview data
    const res = await EmpireAuth.fetch({ action: "analyticsoverview" });
    const t = res?.totals || {};

    kpi.innerHTML = `
      <div class="kpi-card"><h6>Total Earnings (Month)</h6><div class="val">${fmtCur(t.revenueMonth)}</div></div>
      <div class="kpi-card"><h6>Active Users</h6><div class="val">${fmtInt(t.activeUsers)}</div></div>
      <div class="kpi-card"><h6>Clicks (Today)</h6><div class="val">${fmtInt(t.clicks)}</div></div>
      <div class="kpi-card"><h6>Conv. Rate</h6><div class="val">${fmtPct(t.convRate)}</div></div>
      <div class="kpi-card"><h6>Earnings (Today)</h6><div class="val">${fmtCur(t.earningsToday)}</div></div>
    `;
  }

  // ---- CPA Accounts -------------------------------------------------------
  async function loadCPA() {
    const host = $("#view-cpa"); if (!host) return;
    host.innerHTML = `<h2>CPA Accounts</h2><div id="cpaGrid" class="emp-grid"></div>`;
    const grid = $("#cpaGrid", host);
    grid.style.display = "grid";
    grid.style.gridTemplateColumns = "repeat(auto-fit, minmax(260px, 1fr))";
    grid.style.gap = "12px";

    const j = await EmpireAuth.fetch({ action: "cpalist", limit: 50 });
    const rows = j?.rows || [];

    if (!rows.length) {
      grid.innerHTML = `<div class="emp-card">No CPA accounts yet.</div>`;
      return;
    }

    grid.innerHTML = rows.map(r => {
      const status = (r.Status || r.status || "ACTIVE").toString();
      const badge = status === "ACTIVE" ? "background:#13381f;color:#5bff9a" : "background:#3a2a19;color:#ffc86b";
      const rev = r.Revenue || r.revenue || 0;
      const clk = r.Clicks || r.clicks || 0;
      const conv = r.Conversion || r.conversion || 0;
      return `
        <div class="emp-card">
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <h3 style="margin:0">${r.Account_Name || r.name || "CPA"}</h3>
            <span class="badge" style="padding:2px 8px;border-radius:10px;${badge}">${status}</span>
          </div>
          <div class="emp-muted" style="margin:.25rem 0;">${r.Network || ""} • ID: ${r.Account_ID || ""}</div>
          <div class="kpi" style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:8px;">
            <div><small>Revenue</small><div><b>${fmtCur(rev)}</b></div></div>
            <div><small>Clicks</small><div><b>${fmtInt(clk)}</b></div></div>
            <div><small>Conv</small><div><b>${fmtPct(conv)}</b></div></div>
          </div>
          <div class="emp-muted" style="margin-top:6px;">Updated: ${r.Last_Updated ? timeAgo(r.Last_Updated) : "-"}</div>
        </div>`;
    }).join("");
  }

  // ---- Users --------------------------------------------------------------
  async function loadUsers() {
    const host = $("#view-users"); if (!host) return;
    host.innerHTML = `
      <h2>Users</h2>
      <div class="emp-row" style="margin:8px 0 12px 0;">
        <input id="uSearch" class="emp-input" placeholder="Search email/phone/name"/>
      </div>
      <div class="emp-view" style="padding:0">
        <table class="emp-table" id="usersTable" style="width:100%">
          <thead><tr>
            <th>Name</th><th>Email</th><th>Phone</th><th>Status</th><th>Level</th><th>Last Action</th>
          </tr></thead>
          <tbody></tbody>
        </table>
      </div>
    `;
    const tbody = $("#usersTable tbody", host);

    const j = await EmpireAuth.fetch({ action: "listassociates", limit: 500 });
    let rows = j?.rows || [];

    const render = () => {
      const q = ($("#uSearch").value || "").toLowerCase();
      const view = q ? rows.filter(r =>
        JSON.stringify(r).toLowerCase().includes(q)) : rows;

      tbody.innerHTML = view.map(r => `
        <tr>
          <td>${esc(r.name)}</td>
          <td>${esc(r.email)}</td>
          <td>${esc(r.phone)}</td>
          <td>${esc(r.status)}</td>
          <td>${esc(r.level)}</td>
          <td>${esc(r.Last_Action_At || r.ts || "")}</td>
        </tr>
      `).join("");
    };

    $("#uSearch").addEventListener("input", render);
    render();
  }

  // ---- Wallet -------------------------------------------------------------
  async function loadWallet() {
    const host = $("#view-wallet"); if (!host) return;
    host.innerHTML = `
      <h2>Wallet</h2>
      <div class="emp-view" style="padding:0">
        <table class="emp-table" id="walletTable" style="width:100%">
          <thead><tr>
            <th>Time</th><th>Direction</th><th>Status</th><th>Amount</th><th>Method</th><th>Email</th><th>Phone</th><th>Ref</th>
          </tr></thead>
          <tbody></tbody>
        </table>
      </div>
    `;
    const tbody = $("#walletTable tbody", host);

    const j = await EmpireAuth.fetch({ action: "listwallet", limit: 200 });
    const rows = (j?.rows || []).sort((a,b)=> String(b.ts||"").localeCompare(String(a.ts||"")));

    tbody.innerHTML = rows.slice(0, 50).map(r => `
      <tr>
        <td>${esc(r.ts)}</td>
        <td>${esc(r.dir)}</td>
        <td>${esc(r.status)}</td>
        <td>${fmtCur(r.amount)}</td>
        <td>${esc(r.Method || r.method || "")}</td>
        <td>${esc(r.email)}</td>
        <td>${esc(r.phone)}</td>
        <td>${esc(r.txid || r.Ref || "")}</td>
      </tr>
    `).join("");
  }

  // ---- Analytics ----------------------------------------------------------
  async function loadAnalytics() {
    const host = $("#view-analytics"); if (!host) return;
    host.innerHTML = `
      <h2>Analytics</h2>
      <div class="emp-grid">
        <div class="emp-card" id="anDaily"><h3>Daily Earnings</h3><div id="dailyBody" class="emp-muted">Loading…</div></div>
        <div class="emp-card" id="anGeo"><h3>Geo Earnings</h3><div id="geoBody" class="emp-muted">Loading…</div></div>
      </div>
    `;
    // Daily
    const daily = await EmpireAuth.fetch({ action: "analyticsdaily", limit: 14 });
    const drows = daily?.rows || [];
    $("#dailyBody").innerHTML = `
      <table class="emp-table"><thead><tr><th>Date</th><th>Earnings</th><th>Clicks</th><th>Conv</th></tr></thead>
      <tbody>${drows.map(r=>`<tr><td>${esc(r.Date || r.ts || "")}</td><td>${fmtCur(r.Earnings)}</td><td>${fmtInt(r.Clicks)}</td><td>${fmtPct(r.Conversion)}</td></tr>`).join("")}</tbody></table>
    `;

    // Geo
    const geo = await EmpireAuth.fetch({ action: "analyticsgeo", limit: 50 });
    const grows = geo?.rows || [];
    $("#geoBody").innerHTML = `
      <table class="emp-table"><thead><tr><th>Month</th><th>Country</th><th>Earnings</th><th>Clicks</th></tr></thead>
      <tbody>${grows.map(r=>`<tr><td>${esc(r.Month)}</td><td>${esc(r.Country)}</td><td>${fmtCur(r.Earnings)}</td><td>${fmtInt(r.Clicks)}</td></tr>`).join("")}</tbody></table>
    `;
  }

  // ---- Monitoring & Security ---------------------------------------------
  async function loadMonitoringFeed() {
    const host = $("#view-monitoring") || $("#view-dashboard"); if (!host) return;
    let panel = $("#monPanel", host);
    if (!panel) {
      panel = el("div", "emp-card");
      panel.id = "monPanel";
      panel.innerHTML = `<h3>Live Activity Feed</h3><div id="monList" class="emp-muted">Loading…</div>`;
      host.appendChild(panel);
    }
    const j = await EmpireAuth.fetch({ action: "monitoringfeed", limit: 50 });
    const rows = j?.rows || [];
    $("#monList").innerHTML = rows.length
      ? rows.map(r => `<div class="mon-item">
            <b>${esc(r.Type || "")}</b> — ${esc(r.Title || "")}
            <span class="emp-muted" style="float:right;">${timeAgo(r.ts)}</span>
            <div class="emp-muted">${esc(r.Ref || "")}</div>
         </div>`).join("")
      : "No recent events.";
  }

  async function loadHealth() {
    const host = $("#view-security") || $("#view-dashboard"); if (!host) return;
    let panel = $("#healthPanel", host);
    if (!panel) {
      panel = el("div", "emp-card");
      panel.id = "healthPanel";
      panel.innerHTML = `<h3>System Health</h3><div id="healthGrid" class="emp-grid"></div>`;
      host.appendChild(panel);
    }
    const j = await EmpireAuth.fetch({ action: "gethealth" });
    const vals = j?.values || {};
    const grid = $("#healthGrid", panel);
    grid.style.display = "grid";
    grid.style.gridTemplateColumns = "repeat(auto-fit, minmax(180px, 1fr))";
    grid.style.gap = "10px";
    grid.innerHTML = Object.keys(vals).map(k => `
      <div class="emp-card" style="padding:10px">
        <div class="emp-muted">${esc(k)}</div>
        <div><b>${esc(vals[k])}</b></div>
      </div>`).join("");
  }

  async function loadAlerts() {
    const host = $("#view-security"); if (!host) return;
    let panel = $("#alertPanel", host);
    if (!panel) {
      panel = el("div", "emp-card");
      panel.id = "alertPanel";
      panel.innerHTML = `<h3>Alerts</h3><div id="alertList" class="emp-muted">Loading…</div>`;
      host.appendChild(panel);
    }
    const j = await EmpireAuth.fetch({ action: "listalerts", limit: 200 });
    const rows = j?.rows || [];
    $("#alertList").innerHTML = rows.length
      ? rows.map(r => `<div class="alert-item" style="padding:6px 0;border-bottom:1px dashed rgba(255,255,255,.08);">
            <span class="badge" style="padding:2px 8px;border-radius:10px;background:${badgeColor(r.Level)}">${esc(r.Level)}</span>
            <b style="margin-left:6px">${esc(r.Title)}</b>
            <span class="emp-muted" style="float:right;">${timeAgo(r.ts)}</span>
            <div class="emp-muted">${esc(r.Detail||"")}</div>
         </div>`).join("")
      : "No alerts.";
  }

  async function loadSchedules() {
    const host = $("#view-monitoring"); if (!host) return;
    let panel = $("#schedPanel", host);
    if (!panel) {
      panel = el("div", "emp-card");
      panel.id = "schedPanel";
      panel.innerHTML = `<h3>Predictive Maintenance</h3><div id="schedBody" class="emp-muted">Loading…</div>`;
      host.appendChild(panel);
    }
    const j = await EmpireAuth.fetch({ action: "listschedules" });
    const rows = j?.rows || [];
    $("#schedBody").innerHTML = rows.length
      ? `<table class="emp-table"><thead><tr><th>Task</th><th>Cron</th><th>Next Run</th><th>Owner</th><th>Status</th></tr></thead>
         <tbody>${rows.map(r=>`<tr><td>${esc(r.Task)}</td><td>${esc(r.Schedule_CRON)}</td><td>${esc(r.Next_Run)}</td><td>${esc(r.Owner)}</td><td>${esc(r.Status)}</td></tr>`).join("")}</tbody></table>`
      : "No scheduled tasks.";
  }

  // ---- Helpers ------------------------------------------------------------
  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function badgeColor(level) {
    const L = String(level||"").toUpperCase();
    if (L === "SUCCESS") return "#11391f;color:#7BFFB2";
    if (L === "INFO")    return "#14253a;color:#6bd0ff";
    if (L === "WARN" || L === "WARNING") return "#3a2a19;color:#ffc86b";
    if (L === "ERROR")   return "#3a1616;color:#ff8b8b";
    return "#1e2433;color:#cbd5e1";
  }
})();