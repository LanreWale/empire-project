const $$ = s => document.querySelector(s);
const fmt = n => n?.toLocaleString?.() ?? String(n);

async function get(path){
  const r = await fetch(path, {headers:{'accept':'application/json'}});
  return r.ok ? r.json() : { ok:false, error:r.statusText };
}

function setText(id, val){ const el = $$(id); if (el) el.textContent = val; }

async function loadOverview(){
  const s = await get('/.netlify/functions/summary');
  if (s && s.ok){
    setText('#ov-earn', `$${(s.totalEarnings||0).toLocaleString(undefined,{maximumFractionDigits:2})}`);
    setText('#ov-users', fmt(s.activeUsers||0));
    setText('#ov-cr', (s.approvalRate||0) + '%');
    // demo placeholders
    setText('#ov-clicks','12,480');
    setText('#ov-daily','$' + (Math.round((s.totalEarnings||0)/120) || 0).toLocaleString());
    setText('#ov-sources','Search • Social • Email');
  }
}

async function loadCPA(){
  // Stub from offers/users until dedicated function exists
  const tbody = $('#cpa-rows');
  const rows = [
    {name:'CPA Grip A', id:'GRIP-001', offers:8, revenue:8601.26, clicks:5631, conv:1280},
    {name:'CPA Grip B', id:'GRIP-002', offers:6, revenue:4065.21, clicks:2395, conv:480},
    {name:'CPA Grip C', id:'GRIP-003', offers:5, revenue:10355.79, clicks:5040, conv:1653},
    {name:'CPA Grip D', id:'GRIP-004', offers:7, revenue:18671.20, clicks:1606, conv:405},
    {name:'CPA Grip E', id:'GRIP-005', offers:4, revenue:8801.20, clicks:1230, conv:260}
  ];
  tbody.innerHTML = rows.map(r=>`
    <tr>
      <td>${r.name}</td><td>${r.id}</td><td>${r.offers}</td>
      <td>$${r.revenue.toLocaleString()}</td><td>${fmt(r.clicks)}</td><td>${fmt(r.conv)}</td>
      <td><a class="emp-btn tiny ghost" href="/cpa/${encodeURIComponent(r.id)}">View</a></td>
    </tr>`).join('');
}

async function loadUsers(){
  const all = await get('/.netlify/functions/users');
  const act = $$('#active-users'), pend = $$('#pending-users');

  const listify = (arr, target) => {
    if (!Array.isArray(arr) || !arr.length){ target.innerHTML = '<li class="muted">None</li>'; return; }
    target.innerHTML = arr.map(u=>`<li>${u.name||u.email||'User'} <span class="tag">${u.role||''}</span></li>`).join('');
  };

  listify(all.users || [], act);

  // using summary-like endpoints as placeholders for pending
  const p = await get('/.netlify/functions/users-pending');
  listify(p.users || [], pend);

  const link = location.origin + '/signup?via=empire';
  setText('#invite-link', link);
  const whats = `https://wa.me/?text=${encodeURIComponent('Join THE EMPIRE: '+link)}`;
  const wa = $$('#btn-whatsapp'); if (wa) wa.href = whats;

  const copy = $$('#btn-copy'); if (copy) copy.onclick = () => navigator.clipboard.writeText(link);
}

async function loadAnalytics(){
  // Bar monthly – demo data
  const ctxB = document.getElementById('bar-monthly');
  new Chart(ctxB, {
    type:'bar',
    data:{ labels:['Jan','Feb','Mar','Apr','May','Jun','Jul'],
      datasets:[{ label:'Earnings ($)',
        data:[12000,15000,19000,14000,17500,23000,26000] }]},
    options:{ responsive:true, plugins:{legend:{display:false}} }
  });

  // Pie geo – demo slices per offer
  const ctxP = document.getElementById('pie-geo');
  new Chart(ctxP, {
    type:'pie',
    data:{ labels:['USA','UK','Nigeria','Canada','Australia'],
      datasets:[{ data:[42,18,22,9,9] }]},
    options:{ responsive:true, plugins:{legend:{position:'right'}} }
  });

  // Live table from monitor-feed (events)
  const mon = await get('/.netlify/functions/monitor-feed');
  const tb = $$('#live-rows');
  if (mon && mon.ok && Array.isArray(mon.events)){
    tb.innerHTML = mon.events.slice(0,10).map(e=>`
      <tr><td>${e.timestamp||''}</td><td>${e.country||''}</td>
      <td>${e.offerType||e.action||''}</td><td>${e.device||''}</td>
      <td>${e.clicks||''}</td><td>${e.leads||''}</td><td>${e.earnings||''}</td></tr>`).join('');
  } else {
    tb.innerHTML = '<tr><td colspan="7" class="muted">No live rows.</td></tr>';
  }
}

async function loadPayments(){
  // tx history placeholder
  const rows = $$('#tx-rows');
  rows.innerHTML = [
    {d:'2025-08-10', a:200, m:'Opay Digital Bank', s:'Pending'},
    {d:'2025-08-01', a:450, m:'USDT (TRC20)', s:'Completed'}
  ].map(t=>`<tr><td>${t.d}</td><td>$${t.a.toLocaleString()}</td><td>${t.m}</td><td>${t.s}</td></tr>`).join('');

  const form = $$('#withdraw-form');
  form.addEventListener('submit', async (ev)=>{
    ev.preventDefault();
    const data = Object.fromEntries(new FormData(form).entries());
    $$('#withdraw-msg').textContent = 'Submitting…';
    // send into your Netlify function if desired:
    // await fetch('/.netlify/functions/wallet-withdraw',{method:'POST',body:JSON.stringify(data)});
    setTimeout(()=> $$('#withdraw-msg').textContent = 'Request received. Processing…', 600);
  });
}

async function loadMonitoring(){
  const mon = await get('/.netlify/functions/monitor-feed');

  const fill = (id, arr, key='action')=>{
    const el = $$(id);
    if (Array.isArray(arr) && arr.length){
      el.innerHTML = arr.slice(0,6).map(a=>`<li>${a[key]||a.message||JSON.stringify(a)}</li>`).join('');
    } else el.innerHTML='<li class="muted">None</li>';
  };

  if (mon && mon.ok){
    fill('#feed', mon.events||[], 'action');
    fill('#alerts', mon.alerts||[]);
    fill('#health', mon.health||[]);
    fill('#security', mon.security||[]);
    $$('#predict').textContent = mon.predictive || 'Stable';
  } else {
    ['#feed','#alerts','#health','#security'].forEach(s=>{ const n=$$(s); if(n) n.innerHTML='<li class="muted">Unavailable</li>'; });
  }
}

document.addEventListener('DOMContentLoaded', async ()=>{
  await Promise.all([
    loadOverview(),
    loadCPA(),
    loadUsers(),
    loadAnalytics(),
    loadPayments(),
    loadMonitoring()
  ]);
});
