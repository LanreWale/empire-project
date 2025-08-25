// app/assets/js/dashboard-live.js
// ONE file to drive Profile + Health + Feed + KPIs + Payout + Telegram + Sheets.
// Calls only your Netlify Functions. No secrets in HTML. Tolerant to missing DOM.

(() => {
  // --- CONFIG --------------------------------------------------------------
// ---- TOKEN HELPERS (add this) ----
const STORAGE_KEYS = { user: 'EMPIRE_TOKEN', cmd: 'CMD_USER' };

function getAuthToken() {
  // Prefer user session token; fall back to Commander PIN
  let t = null;
  try {
    t = localStorage.getItem(STORAGE_KEYS.user);
    if (!t) t = localStorage.getItem(STORAGE_KEYS.cmd);
  } catch {}
  return (t || '').trim();
}  
const ENDPOINTS = {
    me:        '/.netlify/functions/me',
    health:    '/.netlify/functions/monitor-health',
    feed:      '/.netlify/functions/monitor-feed',
    summary:   '/.netlify/functions/gs-bridge?action=summary',
    banks:     '/.netlify/functions/paystack-banks',
    paystackX: '/.netlify/functions/paystack-transfer',
    flwX:      '/.netlify/functions/flw-transfer',
    telegram:  '/.netlify/functions/test-telegram',
    gsBridge:  '/.netlify/functions/gs-bridge'
  };
  const POLL_MS = 15000;

  // --- HELPERS -------------------------------------------------------------
  const el = (id) => document.getElementById(id);
  const qs = (k) => new URL(location.href).searchParams.get(k);
  const $  = (sel) => document.querySelector(sel);

  function setText(node, v){ if (node) node.textContent = v; }
  function pill(node, text, ok){ if (!node) return; node.textContent = text||'—'; node.className = 'pill' + (ok?' ok':''); }
  function badge(node, text, state){ if (!node) return; node.textContent = text||'—'; node.className = 'badge ' + (state==='ok'?'b-ok':state==='warn'?'b-warn':'b-down'); }
  const fmt = {
    money(n){ try{ return (Number(n)||0).toLocaleString(undefined,{style:'currency',currency:'NGN'}) }catch{ return `₦${n}`; } },
    pct(n){ const x=Number(n); return Number.isFinite(x)?`${x.toFixed(1)}%`:'—'; }
  };
  async function j(url, opts){ const r = await fetch(url, { credentials:'include', ...opts }); try { return await r.json(); } catch { return { ok:false, error:`Non-JSON from ${url}`, status:r.status }; } }

  // --- PROFILE -------------------------------------------------------------
  async function loadProfile(){
    const note = el('note'); const prof = el('profile');
    try {
      const out = await j(ENDPOINTS.me);
      if (!out?.ok) throw new Error(out?.error || 'Profile load failed');
      if (note) note.style.display='none'; if (prof) prof.style.display='block';
      const u = out.user || {};
      setText(el('name'), u.name||'—');
      setText(el('contact'), [u.email,u.phone].filter(Boolean).join(' · ') || '—');
      pill(el('status'), u.status||'—', String(u.status||'').toUpperCase().includes('APPROVED'));
      setText(el('scale'), (u.scale ?? '—'));
    } catch (e) { if (note) note.textContent = 'Could not load your dashboard: ' + e.message; }
  }

  // --- HEALTH --------------------------------------------------------------
  async function loadHealth(){
    const row = el('healthRow'); if (!row) return; row.innerHTML='';
    try {
      const out = await j(ENDPOINTS.health);
      const items = Array.isArray(out?.checks) ? out.checks : Array.isArray(out?.items) ? out.items : [];
      for (const c of items){
        const span = document.createElement('span');
        const label = c.label || c.name || c.id || '—';
        const status = (c.status||'warn').toLowerCase();
        badge(span, label + (c.value?`: ${c.value}`:''), status);
        if (c.note) span.title = c.note;
        row.appendChild(span);
      }
    } catch {}
  }

  // --- FEED ----------------------------------------------------------------
  async function loadFeed(){
    const tbody = $('#feedTable tbody'); const empty = el('feedEmpty'); if (!tbody) return;
    tbody.innerHTML='';
    try {
      const out = await j(ENDPOINTS.feed);
      const items = (out && out.ok && Array.isArray(out.items)) ? out.items : [];
      if (!items.length){ if (empty) empty.style.display='block'; return; }
      if (empty) empty.style.display='none';
      for (const ev of items){
        const tr = document.createElement('tr');
        const raw = ev.ts || ev.time || '';
        const date = raw ? new Date(raw) : null;
        const when = (date && !isNaN(+date)) ? date.toLocaleString() : (typeof raw==='string'?raw:'—');
        const type = ev.type || '—';
        const msg  = (ev.msg || ev.message || '—').toString().replace(/</g,'&lt;');
        const ref  = ev.ref || ev.reference || '—';
        const who  = ev.actor || ev.user || '—';
        tr.innerHTML = `<td>${when}</td><td>${type}</td><td>${msg}</td><td>${ref}</td><td>${who}</td>`;
        tbody.appendChild(tr);
      }
    } catch { if (empty) empty.style.display='block'; }
  }

  // --- KPIs (optional) -----------------------------------------------------
  async function loadKPIs(){
    const need = el('kpi_total_earnings') || el('kpi_active_users') || el('kpi_approval_rate') || el('kpi_pending');
    if (!need) return;
    try {
      const out = await j(ENDPOINTS.summary);
      if (!out?.ok) return;
      if (el('kpi_total_earnings')) setText(el('kpi_total_earnings'), fmt.money(out.totalEarnings ?? 0));
      if (el('kpi_active_users'))   setText(el('kpi_active_users'),   String(out.activeUsers ?? 0));
      if (el('kpi_approval_rate'))  setText(el('kpi_approval_rate'),  out.approvalRate!=null ? fmt.pct(out.approvalRate) : '—');
      if (el('kpi_pending'))        setText(el('kpi_pending'),        String(out.pendingReviews ?? 0));
    } catch {}
  }

  // --- PAYOUTS -------------------------------------------------------------
  async function loadBanks(){
    const sel = el('paystackBanks'); if (!sel) return;
    sel.innerHTML = `<option>Loading…</option>`;
    try {
      const out = await j(ENDPOINTS.banks);
      const banks = out?.data || out?.banks || [];
      sel.innerHTML = `<option value="">Select bank</option>` + banks.map(b => `<option value="${b.code || b.bank_code}">${b.name}</option>`).join('');
    } catch {
      sel.innerHTML = `<option value="">Bank list unavailable</option>`;
    }
  }

  async function sendPayout(){
    const note = el('payoutNote');
    const provider = (el('provider')?.value || 'paystack').toLowerCase();
    const bankCode = el('paystackBanks')?.value || '';
    const acct     = el('acct')?.value?.trim() || '';
    const acctName = el('acctName')?.value?.trim() || '';
    const amount   = Number(el('amt')?.value || 0);

    if (!acct || !acctName || !amount || !bankCode){ setText(note, 'Missing payout fields'); return; }
    setText(note, 'Submitting…');

    try {
      const url = provider === 'flutterwave' ? ENDPOINTS.flwX : ENDPOINTS.paystackX;
      const body = provider === 'flutterwave'
        ? { bank_code: bankCode, account_number: acct, account_name: acctName, amount }
        : { bank_code: bankCode, account_number: acct, account_name: acctName, amount };

      const out = await j(url, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) });
      if (out?.ok) {
        setText(note, `Payout queued: ${out.reference || out.id || 'success'}`);
      } else {
        setText(note, `Error: ${out?.error || 'failed'}`);
      }
    } catch (e) {
      setText(note, 'Network error');
    }
  }

  // --- MESSAGING (Telegram test) ------------------------------------------
  async function pingTelegram(){
    const note = el('msgNote'); setText(note, 'Sending…');
    try {
      const out = await j(ENDPOINTS.telegram, { method:'POST' });
      setText(note, out?.ok ? 'Telegram sent' : `Error: ${out?.error || 'failed'}`);
    } catch { setText(note, 'Network error'); }
  }

  // --- SHEETS QUICK ACTIONS -----------------------------------------------
  async function sheetPing(){
    const note = el('sheetNote'); setText(note, 'Pinging…');
    try {
      const out = await j(`${ENDPOINTS.gsBridge}?action=ping`);
      setText(note, out?.ok ? 'Sheets OK' : `Error: ${out?.error || 'failed'}`);
    } catch { setText(note, 'Network error'); }
  }
  async function sheetAppend(){
    const note = el('sheetNote'); setText(note, 'Appending…');
    try {
      const payload = { action:'append', sheet:'Event_Log', values:[Date.now(), 'Dashboard', 'Manual append', 'UI', 'system'] };
      const out = await j(ENDPOINTS.gsBridge, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) });
      setText(note, out?.ok ? 'Event appended' : `Error: ${out?.error || 'failed'}`);
    } catch { setText(note, 'Network error'); }
  }

  // --- DEBUG ---------------------------------------------------------------
  async function loadDebug(){
    if (qs('debug') !== '1') return;
    const raw = el('raw'); const dbg = el('debug'); if (!raw || !dbg) return;
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
      dbg.textContent = JSON.stringify({ error:String(e) }, null, 2);
    }
  }

  // --- MASTER --------------------------------------------------------------
  async function loadAll(){
    await Promise.allSettled([
      loadProfile(),
      loadHealth(),
      loadFeed(),
      loadKPIs(),
      loadDebug(),
      loadBanks(), // load banks once; harmless if called again
    ]);
  }

  // Wire buttons if present
  el('refreshBtn')?.addEventListener('click', loadAll);
  el('btnPayout')?.addEventListener('click', sendPayout);
  el('btnPingTG')?.addEventListener('click', pingTelegram);
  el('btnSheetPing')?.addEventListener('click', sheetPing);
  el('btnSheetAppend')?.addEventListener('click', sheetAppend);

  // Init & poll
  document.addEventListener('DOMContentLoaded', () => {
    loadAll();
    setInterval(loadAll, POLL_MS);
  });
})();