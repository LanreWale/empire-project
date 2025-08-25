// app/assets/js/dashboard-live.js
// One file. Profile + System Health + Event Feed + Debug + optional KPIs.
// No layout/CSS changes required. Safe even if some elements don’t exist.

(() => {
  // --- CONFIG --------------------------------------------------------------
  const ENDPOINTS = {
    me:      '/.netlify/functions/me',
    health:  '/.netlify/functions/monitor-health',
    feed:    '/.netlify/functions/monitor-feed',
    summary: '/.netlify/functions/gs-bridge?action=summary', // optional
  };
  const POLL_MS = 15000; // 15s periodic refresh

  // --- DOM HELPERS ---------------------------------------------------------
  const el = (id) => document.getElementById(id);
  const qs = (k) => new URL(location.href).searchParams.get(k);
  const $  = (sel) => document.querySelector(sel);

  function setText(node, v) { if (node) node.textContent = v; }
  function pill(node, text, ok) {
    if (!node) return;
    node.textContent = text || '—';
    node.className = 'pill' + (ok ? ' ok' : '');
  }
  function badge(node, text, state) {
    if (!node) return;
    node.textContent = text || '—';
    node.className = 'badge ' + (state==='ok'?'b-ok':state==='warn'?'b-warn':'b-down');
  }
  const fmt = {
    money(n){ try{ return (Number(n)||0).toLocaleString(undefined,{style:'currency',currency:'USD'}); }catch{ return `$${n}`; } },
    pct(n){ const x = Number(n); return Number.isFinite(x) ? `${x.toFixed(1)}%` : '—'; }
  };

  // Basic JSON fetch (same-origin, include cookies if any)
  async function j(url) {
    const r = await fetch(url, { credentials: 'include' });
    // tolerate non-JSON
    try { return await r.json(); } catch { return { ok:false, error:`Non-JSON from ${url}`, status:r.status }; }
  }

  // --- PROFILE -------------------------------------------------------------
  async function loadProfile() {
    const note = el('note');
    const prof = el('profile');

    try {
      const out = await j(ENDPOINTS.me);
      if (!out || !out.ok) throw new Error(out?.error || 'Failed to load profile');

      // Hide "Loading…", show profile card
      if (note) note.style.display = 'none';
      if (prof) prof.style.display = 'block';

      const u = out.user || {};
      setText(el('name'),    u.name || '—');
      setText(el('contact'), [u.email,u.phone].filter(Boolean).join(' · ') || '—');

      const isApproved = String(u.status||'').toUpperCase().includes('APPROVED');
      pill(el('status'), u.status || '—', isApproved);

      setText(el('scale'), (u.scale ?? '—'));

    } catch (e) {
      if (note) note.textContent = 'Could not load your dashboard: ' + e.message;
      // keep profile hidden on error
    }
  }

  // --- SYSTEM HEALTH -------------------------------------------------------
  async function loadHealth() {
    const row = el('healthRow');
    if (!row) return; // page may not have this section
    row.innerHTML = '';

    try {
      const out = await j(ENDPOINTS.health);

      // Support both shapes: {ok:true, checks:[{label,status,note}]}
      // or legacy {ok:true, items:[{name,status}]}
      const items = Array.isArray(out?.checks) ? out.checks
                   : Array.isArray(out?.items)  ? out.items
                   : [];

      if (!items.length) return;

      for (const c of items) {
        const span = document.createElement('span');
        // Normalize fields
        const label  = c.label || c.name || c.id || '—';
        const status = (c.status || '').toLowerCase();
        badge(span, label + (c.value ? `: ${c.value}` : ''), status || 'warn');
        if (c.note) span.title = c.note;
        row.appendChild(span);
      }
    } catch {
      // leave row empty on error
    }
  }

  // --- EVENT FEED ----------------------------------------------------------
  async function loadFeed() {
    const tbody = $('#feedTable tbody');
    const empty = el('feedEmpty');
    if (!tbody) return;

    tbody.innerHTML = '';
    try {
      const out = await j(ENDPOINTS.feed);
      const items = (out && out.ok && Array.isArray(out.items)) ? out.items : [];

      if (!items.length) {
        if (empty) empty.style.display = 'block';
        return;
      }
      if (empty) empty.style.display = 'none';

      for (const ev of items) {
        const tr = document.createElement('tr');
        // tolerate different field names (ts/time, msg/message)
        const ts = ev.ts || ev.time || '';
        const date = ts ? new Date(ts) : null;
        const when = (date && !isNaN(+date)) ? date.toLocaleString() : (typeof ts === 'string' ? ts : '—');

        const type = ev.type || '—';
        const msg  = (ev.msg || ev.message || '—').toString().replace(/</g,'&lt;');
        const ref  = ev.ref || ev.reference || '—';
        const who  = ev.actor || ev.user || '—';

        tr.innerHTML = `<td>${when}</td><td>${type}</td><td>${msg}</td><td>${ref}</td><td>${who}</td>`;
        tbody.appendChild(tr);
      }
    } catch {
      if (empty) empty.style.display = 'block';
    }
  }

  // --- OPTIONAL KPI TILES --------------------------------------------------
  async function loadSummaryTiles() {
    // Only runs if elements exist. If your function is not implemented, it silently skips.
    const needAny =
      el('kpi_total_earnings') || el('kpi_active_users') || el('kpi_approval_rate');
    if (!needAny) return;

    try {
      const out = await j(ENDPOINTS.summary);
      if (!out || !out.ok) return;

      if (el('kpi_total_earnings')) setText(el('kpi_total_earnings'), fmt.money(out.totalEarnings ?? 0));
      if (el('kpi_active_users'))   setText(el('kpi_active_users'),   String(out.activeUsers ?? 0));
      if (el('kpi_approval_rate'))  setText(el('kpi_approval_rate'),  out.approvalRate != null ? fmt.pct(out.approvalRate) : '—');
    } catch {
      // silent
    }
  }

  // --- DEBUG PANEL (?debug=1) ----------------------------------------------
  async function loadDebug() {
    if (qs('debug') !== '1') return;
    const raw = el('raw');
    const dbg = el('debug');
    if (!raw || !dbg) return;

    try {
      const [me, health, feed, summary] = await Promise.all([
        j(ENDPOINTS.me).catch(e=>({ok:false,error:String(e)})),
        j(ENDPOINTS.health).catch(e=>({ok:false,error:String(e)})),
        j(ENDPOINTS.feed).catch(e=>({ok:false,error:String(e)})),
        j(ENDPOINTS.summary).catch(e=>({ok:false,error:String(e)})),
      ]);
      raw.style.display = 'block';
      dbg.textContent = JSON.stringify({ me, health, feed, summary }, null, 2);
    } catch (e) {
      raw.style.display = 'block';
      dbg.textContent = JSON.stringify({ error: String(e) }, null, 2);
    }
  }

  // --- MASTER LOAD + POLLING -----------------------------------------------
  async function loadAll() {
    await Promise.allSettled([
      loadProfile(),
      loadHealth(),
      loadFeed(),
      loadSummaryTiles(),
      loadDebug(),
    ]);
  }

  // Manual refresh button (if present)
  el('refreshBtn')?.addEventListener('click', loadAll);

  // Kick off + periodic refresh
  document.addEventListener('DOMContentLoaded', () => {
    loadAll();
    setInterval(loadAll, POLL_MS);
  });
})();