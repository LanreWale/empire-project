/* THE EMPIRE — Admin bootstrap (zero deps)
 * - Persists admin secret locally
 * - Loads all metrics (overview, accounts, users, analytics, wallet, health)
 * - Pending approvals: list + approve/reject (WhatsApp notify on approve)
 * - Add Approved User (manual)
 *
 * Endpoints used:
 *  /.netlify/functions/summary?action=overview|accounts|users|analytics
 *  /.netlify/functions/wallet?limit=50
 *  /.netlify/functions/health
 *  /.netlify/functions/admin-pending  (GET list, POST {action:'mark', id, status})
 */

(() => {
  const STATE = {
    admin: localStorage.getItem("empire:admin") || "",
  };

  // ---------- DOM helpers
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];
  const fmt$ = (n) =>
    (Number(n) || 0).toLocaleString(undefined, { style: "currency", currency: "USD" });

  const setText = (sel, v) => {
    const el = $(sel);
    if (el) el.textContent = v ?? "";
  };

  const on = (el, ev, fn) => el && el.addEventListener(ev, fn);

  // ---------- HTTP
  async function getJSON(url, opts = {}) {
    const r = await fetch(url, {
      method: "GET",
      cache: "no-store",
      headers: Object.assign(
        { "X-Admin-Secret": STATE.admin || "" },
        opts.headers || {}
      ),
    });
    let data = {};
    try {
      data = await r.json();
    } catch {}
    if (!r.ok) throw Object.assign(new Error(data?.error || r.statusText), { data, status: r.status });
    return data;
  }

  async function postJSON(url, body) {
    const r = await fetch(url, {
      method: "POST",
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        "X-Admin-Secret": STATE.admin || "",
      },
      body: JSON.stringify(body || {}),
    });
    let data = {};
    try {
      data = await r.json();
    } catch {}
    if (!r.ok) throw Object.assign(new Error(data?.error || r.statusText), { data, status: r.status });
    return data;
  }

  // ---------- Admin secret UI (optional fields)
  function initAdminSecretUI() {
    const input = $("#adminSecretInput");     // optional: <input id="adminSecretInput">
    const saveBtn = $("#adminSecretSave");    // optional: <button id="adminSecretSave">
    const loadBtn = $("#pendingLoadBtn");     // optional: <button id="pendingLoadBtn">

    if (input) input.value = STATE.admin;

    on(saveBtn, "click", () => {
      const v = (input?.value || "").trim();
      if (!v) return toast("Enter a secret first.");
      STATE.admin = v;
      localStorage.setItem("empire:admin", v);
      toast("Admin key saved.");
    });

    // convenience: “Load pending” on the same row if present
    on(loadBtn, "click", () => loadPending().catch(errToast));
  }

  // ---------- Toasts (tiny)
  function toast(msg) {
    let el = $("#__toast");
    if (!el) {
      el = document.createElement("div");
      el.id = "__toast";
      el.style.cssText =
        "position:fixed;right:16px;bottom:16px;background:#0f182a;color:#fff;border:1px solid #1f2b44;border-radius:12px;padding:10px 14px;z-index:9999;box-shadow:0 10px 30px rgba(0,0,0,.25)";
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.style.opacity = "1";
    setTimeout(() => (el.style.opacity = "0"), 2000);
  }
  const errToast = (e) => toast(e?.message || "Error");

  // ---------- OVERVIEW
  async function loadOverview() {
    const data = await getJSON("/.netlify/functions/summary?action=overview");
    if (data?.ok === false) throw new Error(data.error || "overview not ok");

    setText("#totalEarnings", fmt$(data.totalEarnings));
    setText("#pendingReviews", data.pendingReviews ?? 0);

    // sparkline
    const c = $("#trend");
    if (!c) return;
    const ctx = c.getContext("2d");
    const vals = data.trend?.values || [];
    c.width = c.clientWidth * 2;
    c.height = 140 * 2;
    ctx.scale(2, 2);
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.lineWidth = 3;
    ctx.strokeStyle = "#ffb11a";
    ctx.beginPath();
    const W = c.clientWidth - 20,
      H = 120,
      L = Math.max(1, vals.length - 1);
    const max = Math.max(...vals, 1),
      min = Math.min(...vals, 0);
    vals.forEach((v, i) => {
      const x = 10 + (i / L) * W;
      const y = 10 + (1 - (v - min) / (max - min || 1)) * H;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
  }

  // ---------- ACCOUNTS
  async function loadAccounts() {
    const data = await getJSON("/.netlify/functions/summary?action=accounts");
    const box = $("#accountsList");
    if (!box) return;
    box.innerHTML = "";
    (data.accounts || []).forEach((a) => {
      const el = document.createElement("div");
      el.className = "card";
      el.innerHTML = `
        <div class="card-title">${a.name} • <span class="chip">${a.status || "ACTIVE"}</span></div>
        <div class="grid cols-2">
          <div><div class="muted">Revenue</div><div class="big">${fmt$(a.revenue)}</div></div>
          <div><div class="muted">Clicks</div><div class="big">${(a.clicks || 0).toLocaleString()}</div></div>
          <div><div class="muted">Active Offers</div><div class="big">${a.offers || 0}</div></div>
          <div><div class="muted">Conversion</div><div class="big">${a.conversion || 0}%</div></div>
        </div>`;
      box.appendChild(el);
    });
  }

  // ---------- USERS (active list)
  async function loadUsers() {
    const data = await getJSON("/.netlify/functions/summary?action=users");
    const tbody = $("#usersTbody");
    if (!tbody) return;
    tbody.innerHTML = "";
    (data.users || []).forEach((u) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `<td>${u.name || ""}</td><td>${u.email || ""}</td><td>${u.whatsapp || ""}</td><td>${u.bank || ""}</td><td>${u.status || "ACTIVE"}</td>`;
      tbody.appendChild(tr);
    });
  }

  // ---------- ANALYTICS (bar + pie)
  async function loadAnalytics() {
    const data = await getJSON("/.netlify/functions/summary?action=analytics");

    // Bars
    const c = $("#bars");
    if (c) {
      const ctx = c.getContext("2d");
      const vals = data.months?.values || [];
      c.width = c.clientWidth * 2;
      c.height = 180 * 2;
      ctx.scale(2, 2);
      ctx.clearRect(0, 0, c.width, c.height);
      const W = c.clientWidth - 20,
        H = 150,
        n = vals.length;
      const max = Math.max(...vals, 1);
      const bw = W / (n || 1) - 8;
      vals.forEach((v, i) => {
        const x = 10 + i * (bw + 8);
        const h = (v / max) * H;
        ctx.fillStyle = "#ffb11a";
        ctx.fillRect(x, 10 + H - h, bw, h);
      });
    }

    // Pie
    const pie = $("#pie");
    if (pie) {
      const pctx = pie.getContext("2d");
      const gvals = data.geo?.values || [];
      pie.width = pie.clientWidth * 2;
      pie.height = 180 * 2;
      pctx.scale(2, 2);
      const sum = gvals.reduce((a, b) => a + b, 0) || 1;
      let a0 = -Math.PI / 2;
      gvals.forEach((v, i) => {
        const a1 = a0 + (v / sum) * Math.PI * 2;
        pctx.beginPath();
        pctx.moveTo(100, 90);
        pctx.arc(100, 90, 80, a0, a1);
        pctx.closePath();
        pctx.fillStyle = i % 2 ? "#ffd24d" : "#ffb11a";
        pctx.fill();
        a0 = a1;
      });
    }
  }

  // ---------- WALLET
  async function loadWallet() {
    const data = await getJSON("/.netlify/functions/wallet?limit=50");
    setText("#inflow", fmt$(data.inflow));
    setText("#outflow", fmt$(data.outflow));
    setText("#net", fmt$(data.net));

    const tbody = $("#walletTbody");
    if (!tbody) return;
    tbody.innerHTML = "";
    (data.items || []).forEach((i) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `<td>${i.ts || ""}</td><td>${fmt$(i.amount)}</td><td>${i.method || ""}</td>`;
      tbody.appendChild(tr);
    });
  }

  // ---------- HEALTH
  async function loadHealth() {
    const data = await getJSON("/.netlify/functions/health");
    const box = $("#healthJson");
    if (box) box.textContent = JSON.stringify(data, null, 2);
  }

  // ---------- PENDING APPROVALS
  async function loadPending() {
    const data = await getJSON("/.netlify/functions/admin-pending");
    const tbody = $("#pendingTbody");
    if (!tbody) return;
    tbody.innerHTML = "";

    const items = data.items || data.pending || [];
    if (!items.length) {
      const tr = document.createElement("tr");
      tr.innerHTML = `<td colspan="6" class="muted">No pending approvals.</td>`;
      tbody.appendChild(tr);
      return;
    }

    items.forEach((u) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${u.id || ""}</td>
        <td>${u.name || ""}</td>
        <td>${u.email || ""}</td>
        <td>${u.phone || ""}</td>
        <td>${u.telegram || ""}</td>
        <td>
          <button class="tab" data-act="approve" data-id="${u.id}">Approve</button>
          <button class="tab" data-act="reject"  data-id="${u.id}">Reject</button>
        </td>`;
      tbody.appendChild(tr);
    });
  }

  async function markPending(id, status) {
    const body = { action: "mark", id, status };
    const out = await postJSON("/.netlify/functions/admin-pending", body);
    if (out?.ok) {
      toast(
        status === "approved"
          ? "User approved and notified on WhatsApp."
          : "User rejected."
      );
      await loadPending();
      await loadOverview(); // pending count might change
    }
  }

  function initPendingActions() {
    const tbody = $("#pendingTbody");
    if (!tbody) return;
    on(tbody, "click", (e) => {
      const btn = e.target.closest("button[data-act]");
      if (!btn) return;
      const id = btn.getAttribute("data-id");
      const act = btn.getAttribute("data-act");
      if (!id) return;
      if (act === "approve") markPending(id, "approved").catch(errToast);
      if (act === "reject") markPending(id, "rejected").catch(errToast);
    });

    const reload = $("#pendingReload");
    on(reload, "click", () => loadPending().catch(errToast));
  }

  // ---------- ADD APPROVED USER (manual)
  function initAddUserForm() {
    const form = $("#addUserForm");
    if (!form) return;

    on(form, "submit", async (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      const payload = Object.fromEntries(fd.entries());

      // You can post to your GAS “addUser” if supported; for now we reuse /summary?action=users (optional)
      try {
        const res = await postJSON("/.netlify/functions/summary", {
          action: "addUser",
          user: payload,
        });
        if (res?.ok) {
          toast("User added.");
          form.reset();
          await loadUsers();
        } else {
          throw new Error(res?.error || "Failed to add user");
        }
      } catch (e2) {
        errToast(e2);
      }
    });
  }

  // ---------- Tab bootstrapping
  function bootTabs() {
    // Call targeted loaders when a tab container becomes visible.
    // If you’re already switching with hashes (#overview etc.), these hooks can be no-ops.
    const map = {
      overview: () => {
        loadOverview().catch(errToast);
        loadHealth().catch(errToast);
      },
      accounts: () => loadAccounts().catch(errToast),
      users: () => {
        loadPending().catch(errToast);
        loadUsers().catch(errToast);
      },
      analytics: () => loadAnalytics().catch(errToast),
      wallet: () => loadWallet().catch(errToast),
      security: () => loadHealth().catch(errToast),
    };

    function runForHash() {
      const key = (location.hash || "#overview").replace("#", "");
      (map[key] || map.overview)();
    }
    window.addEventListener("hashchange", runForHash);
    runForHash();
  }

  // ---------- Init
  document.addEventListener("DOMContentLoaded", () => {
    initAdminSecretUI();
    initPendingActions();
    initAddUserForm();

    // First-load everything once (safe; individual tabs re-run on hash)
    loadOverview().catch(errToast);
    loadAccounts().catch(errToast);
    loadUsers().catch(errToast);
    loadAnalytics().catch(errToast);
    loadWallet().catch(errToast);
    loadHealth().catch(errToast);

    bootTabs();
  });
})();