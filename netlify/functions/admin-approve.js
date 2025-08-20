// netlify/functions/admin-approve.js
"use strict";

// No secrets hard-coded. Everything read from env at runtime.
exports.handler = async (event) => {
  const secret = process.env.ADMIN_SECRET || "changeme";

  // Only our page JS should call POST with the header
  if (event.httpMethod === "POST") {
    if (event.headers["x-admin-secret"] !== secret) {
      return { statusCode: 401, body: "Unauthorized" };
    }
    try {
      const body = JSON.parse(event.body || "{}");
      const res = await fetch(`${process.env.URL}/.netlify/functions/approve-user`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      };
    } catch (e) {
      return { statusCode: 500, body: JSON.stringify({ ok:false, error: e.message }) };
    }
  }

  // GET -> serve the minimal mobile admin UI
  return {
    statusCode: 200,
    headers: { "Content-Type": "text/html; charset=utf-8" },
    body: `<!doctype html>
<html lang="en">
<head>
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Empire — Approvals</title>
  <style>
    :root { --bg:#0b1220; --card:#0f172a; --muted:#94a3b8; --text:#e5e7eb; --accent:#2563eb; }
    body { margin:0; font-family: system-ui, -apple-system, Segoe UI, Roboto; background:var(--bg); color:var(--text); }
    .wrap { padding:16px; max-width:760px; margin:0 auto; }
    .h1 { font-size:22px; font-weight:700; margin:8px 0 16px; }
    .card { background:var(--card); border-radius:14px; padding:14px; box-shadow: 0 8px 24px #0004; margin-bottom:16px; }
    .row { display:grid; gap:8px; grid-template-columns:1fr; }
    label { font-size:12px; color:var(--muted); display:block; margin:4px 0; }
    input { width:100%; background:#0b1220; border:1px solid #1e293b; color:var(--text); border-radius:10px; padding:12px; font-size:16px; }
    .btn { display:inline-block; width:100%; background:var(--accent); color:white; border:0; border-radius:12px; padding:12px 14px; font-weight:600; }
    .muted { color:var(--muted); font-size:13px; }
    .list { display:flex; flex-direction:column; gap:10px; }
    .pill { background:#0b1220; border:1px solid #1e293b; padding:10px; border-radius:12px; }
    .pill h4 { margin:0 0 6px; font-size:15px; }
    .actions { display:flex; gap:8px; }
    .sm { padding:10px 12px; font-size:14px; border-radius:10px; }
    .ok { background:#059669; }
    .warn { background:#334155; }
    pre { white-space:pre-wrap; word-break:break-word; background:#020617; border:1px solid #1e293b; border-radius:10px; padding:10px; font-size:12px; }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="h1">✅ Empire — Quick Approvals</div>

    <!-- Quick manual approve -->
    <div class="card">
      <div class="muted" style="margin-bottom:8px">One-tap approval from your phone.</div>
      <form id="approveForm" class="row">
        <div>
          <label>Full name</label>
          <input name="name" placeholder="Jane Doe" required />
        </div>
        <div>
          <label>Email</label>
          <input name="email" type="email" placeholder="jane@example.com" required />
        </div>
        <div>
          <label>Phone (WhatsApp)</label>
          <input name="phone" placeholder="+234..." required />
        </div>
        <button class="btn">Send Approval</button>
      </form>
      <div class="muted" style="margin-top:8px">This triggers WhatsApp + Telegram instantly.</div>
      <pre id="out1"></pre>
    </div>

    <!-- Pending list from Google Sheet -->
    <div class="card">
      <div class="h1" style="font-size:18px;margin-top:0;">📝 Pending Submissions</div>
      <div class="actions" style="margin-bottom:10px;">
        <button id="btnReload" class="btn sm warn" type="button">Reload</button>
        <button id="btnSync" class="btn sm warn" type="button">Sync Sheet</button>
      </div>
      <div id="pending" class="list"></div>
      <pre id="out2"></pre>
    </div>
  </div>

  <script>
    const SECRET = ${JSON.stringify(secret)};

    const out1 = document.getElementById('out1');
    const out2 = document.getElementById('out2');
    const pendingEl = document.getElementById('pending');

    // Manual approve submit
    document.getElementById('approveForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const body = Object.fromEntries(fd.entries());
      body.approve = true;
      out1.textContent = 'Sending…';
      const res = await fetch('', {
        method:'POST',
        headers: { 'content-type':'application/json', 'x-admin-secret': SECRET },
        body: JSON.stringify(body)
      });
      out1.textContent = await res.text();
    });

    // Load pending rows from our server function
    async function loadPending() {
      pendingEl.innerHTML = '<div class="muted">Loading…</div>';
      const res = await fetch('/.netlify/functions/admin-pending', {
        headers: { 'x-admin-secret': SECRET }
      });
      let data;
      try { data = await res.json(); } catch { data = { ok:false, error:'Bad JSON'} }
      out2.textContent = '';
      if (!data.ok) {
        pendingEl.innerHTML = '<div class="muted">No data / Error</div>';
        out2.textContent = JSON.stringify(data, null, 2);
        return;
      }
      if (!data.items?.length) {
        pendingEl.innerHTML = '<div class="muted">No pending sign-ups 🎉</div>';
        return;
      }
      pendingEl.innerHTML = '';
      for (const r of data.items) {
        const div = document.createElement('div');
        div.className = 'pill';
        div.innerHTML = \`
          <h4>\${r.name || '(no name)'} — <span class="muted">\${r.email || ''}</span></h4>
          <div class="muted">\${r.phone || ''} \${r.telegram ? ' · ' + r.telegram : ''}</div>
          <div class="actions" style="margin-top:8px;">
            <button class="btn sm ok">Approve</button>
            <button class="btn sm warn">Dismiss</button>
          </div>\`;
        const [btnApprove, btnDismiss] = div.querySelectorAll('button');
        btnApprove.onclick = async () => {
          btnApprove.disabled = true;
          btnApprove.textContent = 'Approving…';
          const res = await fetch('', {
            method:'POST',
            headers: { 'content-type':'application/json', 'x-admin-secret': SECRET },
            body: JSON.stringify({ name:r.name, email:r.email, phone:r.phone, approve:true })
          });
          const txt = await res.text();
          out2.textContent = txt;
          // Mark in sheet
          await fetch('/.netlify/functions/admin-pending', {
            method:'POST',
            headers: { 'content-type':'application/json', 'x-admin-secret': SECRET },
            body: JSON.stringify({ action:'mark', id:r.id, status:'approved' })
          }).catch(()=>{});
          await loadPending();
        };
        btnDismiss.onclick = async () => {
          btnDismiss.disabled = true;
          btnDismiss.textContent = 'Updating…';
          await fetch('/.netlify/functions/admin-pending', {
            method:'POST',
            headers: { 'content-type':'application/json', 'x-admin-secret': SECRET },
            body: JSON.stringify({ action:'mark', id:r.id, status:'dismissed' })
          }).catch(()=>{});
          await loadPending();
        };
        pendingEl.appendChild(div);
      }
    }

    // Reload + Sync
    document.getElementById('btnReload').onclick = loadPending;
    document.getElementById('btnSync').onclick = async () => {
      out2.textContent = 'Syncing…';
      await fetch('/.netlify/functions/sheets-sync').catch(()=>{});
      await loadPending();
    };

    loadPending();
  </script>
</body>
</html>`
  };
};