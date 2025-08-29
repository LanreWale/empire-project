/* ====================== CONFIG ====================== */
const BASE   = (window.EMPIRE_API || '/.netlify/functions').replace(/\/+$/,'');
const GAS    = (window.GAS_URL || '').replace(/\/+$/,'');
const INVITE = "https://superlative-pothos-ebf5f2.netlify.app/?ref=SUPREME_COMMANDER";

/* ====================== UTILS ======================= */
const $=id=>document.getElementById(id);
const q=(s,r=document)=>r.querySelector(s);
const qa=(s,r=document)=>Array.from(r.querySelectorAll(s));
const fmtUSD=n=> new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(+n||0);
const num=n=> (+n||0).toLocaleString();
const pct=n=> ((+n||0)*100).toFixed(1)+'%';
const esc=s=> String(s??'').replace(/[&<>"']/g,m=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m]));

/* Admin secret in localStorage */
const ADMIN_KEY = 'empire.admin.secret';
function getAdmin(){ try{return localStorage.getItem(ADMIN_KEY)||'';}catch{return '';} }
function setAdmin(v){ try{localStorage.setItem(ADMIN_KEY,v||'')}catch{}; paintAdmin(); }
function paintAdmin(){ const has = !!getAdmin(); const el=$('admStatus'); if(el){ el.textContent = has?'SET':'NOT SET'; el.className='badge '+(has?'ok':'warn'); }}

/* HTTP helpers */
function headers(json=true, includeAdmin=false){
  const h={};
  if(json) h['Content-Type']='application/json';
  const adm = includeAdmin && getAdmin();
  if(adm) h['X-Admin-Secret']=adm;
  return h;
}
async function fetchJSON(url, opts){ const r= await fetch(url, opts||{}); if(!r.ok) throw new Error(r.status+' '+url); return r.json(); }

/* Primary→Fallback loader */
async function loadMaybe(fnPath, gasParams){
  try{ return await fetchJSON(BASE + fnPath, {headers: headers(false)}); } catch(e){}
  if(!GAS) throw new Error('No GAS_URL set and primary failed: '+fnPath);
  const u=new URL(GAS);
  Object.entries(gasParams||{}).forEach(([k,v])=>u.searchParams.set(k,String(v)));
  return await fetchJSON(u.toString(), {headers: headers(false)});
}

/* ======================== TABS ====================== */
const views = {
  dashboard: $('view-dashboard'),
  cpa:       $('view-cpa'),
  users:     $('view-users'),
  analytics: $('view-analytics'),
  wallet:    $('view-wallet'),
  security:  $('view-security'),
  monitoring:$('view-monitoring')
};
qa('.nav button').forEach(b=>{
  b.addEventListener('click', ()=>{
    qa('.nav button').forEach(x=>x.classList.remove('active'));
    b.classList.add('active');
    const k=b.dataset.tab;
    Object.values(views).forEach(v=>v.classList.add('hidden'));
    (views[k]||views.dashboard).classList.remove('hidden');
    if(k==='dashboard') loadOverview().catch(console.warn);
    if(k==='cpa')       loadCpa().catch(console.warn);
    if(k==='users')     loadUsers().catch(console.warn);
    if(k==='analytics') loadAnalytics().catch(console.warn);
    if(k==='wallet')    loadWallet().catch(console.warn);
    if(k==='security')  loadSecurity().catch(console.warn);
    if(k==='monitoring')loadMonitoring().catch(console.warn);
  });
});

/* =================== OVERVIEW ======================= */
let chartMonthly1, chartGeo1;
async function loadOverview(){
  try{
    const s = await loadMaybe('/summary', {summary:1});
    $('kpi-earn').textContent     = fmtUSD(s.totalEarnings ?? s.earnings ?? 0);
    $('kpi-active').textContent   = num(s.activeUsers ?? 0);
    $('kpi-pending').textContent  = num(s.pending ?? 0);
    $('kpi-clicks').textContent   = num(s.clicks ?? 0);
    $('kpi-approval').textContent = s.approvalRate!=null ? (typeof s.approvalRate==='string'?s.approvalRate:pct(s.approvalRate)) : '—';
    $('kpi-cr').textContent       = s.conversionRate!=null ? (typeof s.conversionRate==='string'?s.conversionRate:pct(s.conversionRate)) : '—';

    const m = s.monthly || [];
    const g = s.geo || s.geographic || [];
    const live = s.live || [];

    chartMonthly1 && chartMonthly1.destroy();
    chartMonthly1 = new Chart($('#chartMonthly'), {
      type:'line',
      data:{ labels:m.map(x=>x.label||x.month),
             datasets:[{ label:'Monthly Earnings', data:m.map(x=>x.value||x.amount||0), borderWidth:2, tension:.35 }]},
      options:{plugins:{legend:{display:false}}, scales:{y:{beginAtZero:true}}}
    });

    chartGeo1 && chartGeo1.destroy();
    chartGeo1 = new Chart($('#chartGeo'), {
      type:'doughnut',
      data:{ labels:g.map(x=>x.label||x.country),
             datasets:[{ data:g.map(x=>x.value||x.amount||0)}]},
      options:{plugins:{legend:{position:'right'}}}
    });

    const tb = $('#tbl-live').querySelector('tbody'); tb.innerHTML='';
    live.forEach(r=>{
      const tr=document.createElement('tr');
      tr.innerHTML = `<td>${esc(r.time||'')}</td><td>${esc(r.country||'')}</td><td>${esc(r.offer||'')}</td>
                      <td>${esc(r.device||'')}</td><td>${num(r.clicks||0)}</td><td>${num(r.leads||0)}</td>
                      <td>${fmtUSD(r.earnings||0)}</td>`;
      tb.appendChild(tr);
    });
  }catch(e){
    console.warn('overview',e);
  }
}

/* =================== CPA ACCOUNTS =================== */
async function loadCpa(){
  const grid = $('cpaGrid'); grid.innerHTML='';
  try{
    const r = await loadMaybe('/cpa-list', {cpa:1});
    (r.items || r.accounts || []).forEach(acc=>{
      const card=document.createElement('div'); card.className='card';
      card.innerHTML = `
        <div class="muted" style="margin-bottom:6px">${esc(acc.name||acc.id||'CPA')}</div>
        <div style="display:flex;gap:10px;flex-wrap:wrap">
          <div><div class="muted">Active Offers</div><div class="kpi" style="font-size:22px">${num(acc.offers||acc.activeOffers||0)}</div></div>
          <div><div class="muted">Revenue</div><div class="kpi" style="font-size:22px">${fmtUSD(acc.revenue||0)}</div></div>
          <div><div class="muted">Clicks</div><div class="kpi" style="font-size:22px">${num(acc.clicks||0)}</div></div>
          <div><div class="muted">Conversion</div><div class="kpi" style="font-size:22px">${acc.conversionRate!=null?(typeof acc.conversionRate==='string'?acc.conversionRate:pct(acc.conversionRate)):'—'}</div></div>
        </div>`;
      grid.appendChild(card);
    });
    if(!grid.children.length) grid.innerHTML = `<div class="note err">Failed to load accounts or none found.</div>`;
  }catch(e){
    grid.innerHTML = `<div class="note err">Failed: ${esc(e.message)}</div>`;
  }
  $('#btnAddCpaOpen').