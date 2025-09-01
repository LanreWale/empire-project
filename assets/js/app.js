/* ---------- SPA: path-based routing with left sidebar ---------- */
const panels = {
  welcome:   document.getElementById('panel-welcome'),
  login:     document.getElementById('panel-login'),
  dashboard: document.getElementById('panel-dashboard'),
};

const sidebar = document.querySelector('.emp-sidebar');

function showPanel(key) {
  Object.values(panels).forEach(p => p?.classList.remove('visible'));
  (panels[key] || panels.welcome)?.classList.add('visible');

  // highlight active tab
  sidebar?.querySelectorAll('.tab').forEach(b => {
    b.classList.toggle('active', b.dataset.target === key);
  });

  if (key === 'dashboard') loadDashboardOnce();
}

function toPath(key){ return key === 'welcome' ? '/welcome' : `/${key}`; }
function routeTo(key, push=true){ if(push) history.pushState({panel:key}, '', toPath(key)); showPanel(key); }

function currentPanelFromURL(){
  const seg = location.pathname.replace(/\/+$/,'').split('/').pop() || '';
  if (!seg || seg === 'index.html') return 'welcome';
  return ['welcome','login','dashboard'].includes(seg) ? seg : 'welcome';
}

/* init */
showPanel(currentPanelFromURL(), false);

/* back/forward */
window.addEventListener('popstate', () => showPanel(currentPanelFromURL(), false));

/* sidebar clicks */
sidebar?.addEventListener('click', (e)=>{
  const btn = e.target.closest('button[data-target]');
  if(!btn) return;
  routeTo(btn.dataset.target);
});

/* welcome CTAs */
document.querySelectorAll('a[href="#login"]').forEach(a=>a.addEventListener('click',e=>{e.preventDefault();routeTo('login');}));
document.querySelectorAll('a[href="#dashboard"]').forEach(a=>a.addEventListener('click',e=>{e.preventDefault();routeTo('dashboard');}));

/* ---------- Dashboard data ---------- */
let dashboardLoaded=false;
async function loadDashboardOnce(){
  if(dashboardLoaded) return; dashboardLoaded=true;
  const B='https://empireaffiliatemarketinghub.com/.netlify/functions';

  try{
    const sum=await fetch(`${B}/summary`).then(r=>r.json());
    const k = [
      ['Total Earnings', `$${(sum.totalEarnings ?? 0).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}`],
      ['Active Users', (sum.activeUsers ?? 0)],
      ['Conversion Rate', `${(sum.approvalRate ?? 0)}%`],
      ['Total Clicks', (sum.totalClicks ?? 12480).toLocaleString()],
      ['Daily Earnings', `$${(sum.dailyEarnings ?? 437).toLocaleString()}`],
      ['Traffic Sources', 'Search • Social • Email'],
    ];
    const row=document.getElementById('kpi-row');
    if(row) row.innerHTML = k.map(([t,v])=>`<div class="kpi"><h6>${t}</h6><div class="val">${v}</div></div>`).join('');
  }catch{}

  const cpaT=document.querySelector('#cpaTable tbody');
  if(cpaT) cpaT.innerHTML = `<tr><td>CPA Grip #1</td><td>12345</td><td>8</td><td>$18,671</td><td>5,631</td><td>1,260</td><td><button class="mini">View</button></td></tr>`;

  const AU=document.getElementById('activeUsers'), PU=document.getElementById('pendingUsers');
  if(AU) AU.innerHTML='<li>Commander</li>';
  if(PU) PU.innerHTML='<li>None</li>';

  const ctxB=document.getElementById('barMonthly');
  const ctxP=document.getElementById('pieOffers');
  if(window.Chart){
    new Chart(ctxB,{type:'bar',data:{labels:['Jan','Feb','Mar','Apr','May','Jun','Jul'],datasets:[{label:'Earnings ($)',data:[5000,8000,12000,9000,15000,22000,28000]}]}});
    new Chart(ctxP,{type:'pie',data:{labels:['USA','UK','Nigeria','France','Australia'],datasets:[{data:[45,18,22,9,6]}]}});
  }

  try{
    const ev=await fetch(`${B}/monitor-feed`).then(r=>r.json());
    const tb=document.querySelector('#liveTable tbody');
    if(tb) tb.innerHTML=(ev.events||[]).slice(0,10).map(e=>`
      <tr><td>${e.timestamp??''}</td><td>${e.country??''}</td><td>${e.action??''}</td>
      <td>${e.device??''}</td><td>${e.clicks??''}</td><td>${e.leads??''}</td><td>${e.earnings??''}</td></tr>
    `).join('') || '<tr><td colspan="7">No events.</td></tr>';
  }catch{}
}
