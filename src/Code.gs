/************************************************************
 * THE EMPIRE — Unified Google Apps Script API (FINAL, CI ROUTER)
 * - Case-insensitive router (commandermetrics == commanderMetrics)
 * - Commander pass (no email): GENERALISIMO@2025
 * - Optional API key via Script Property API_KEY (query key=…/header X-API-Key)
 * - Endpoints aligned to your dashboard; sheet-driven (no mock data)
 *
 * SHEETS (tab names):
 *   Onboarding
 *   New Associates
 *   Wallet_Report
 *   Log_Event
 *   CPA_Accounts
 *   Analytics              (optional; falls back to Wallet_Report)
 ************************************************************/
const VERSION = 'empire-2025-09-07';
const PASS    = 'GENERALISIMO@2025';

/* ========================= Case-insensitive Router ========================= */
function doGet(e) {
  const p = e && e.parameter ? e.parameter : {};
  const rawAction = p.action || 'help';
  const a = String(rawAction).toLowerCase();

  // Public ping
  if (a === 'ping') return _json({ ok:true, time:new Date().toISOString(), version: VERSION, route:'ping' });

  // Guarded endpoints
  const protectedActions = new Set([
    'summary','walletmetrics','listassociates','listonboarding','listwallet',
    'commandermetrics','listcpaaccounts','analyticsoverview','usersoverview',
    'walletoverview','securityoverview','monitoringfeed'
  ]);
  if (protectedActions.has(a) && !_authOK_(e)) {
    return _json({ ok:false, error:'unauthorized', action:rawAction, hint:'include pass=GENERALISIMO@2025' });
  }

  // Case-insensitive routes → functions
  const routes = {
    // info/legacy
    'help': help, 'ping': ping,
    'summary': summary, 'walletmetrics': walletmetrics,
    'listassociates': listassociates, 'listonboarding': listonboarding, 'listwallet': listwallet,

    // dashboard
    'commandermetrics': commanderMetrics,
    'listcpaaccounts':  listCPAAccounts,
    'analyticsoverview': analyticsOverview,
    'usersoverview':     usersOverview,
    'walletoverview':    walletOverview,
    'securityoverview':  securityOverview,
    'monitoringfeed':    monitoringFeed
  };

  try {
    const fn = routes[a];
    if (!fn) return _json({ ok:false, error:'unknown_action', action:rawAction, version:VERSION, expect:Object.keys(routes).sort() });
    return _json(fn(p));
  } catch (err) {
    _log('Empire System','error', String(err));
    return _json({ ok:false, error:String(err), where:a, version:VERSION });
  }
}

/* ========================= Info ========================= */
function help() {
  return {
    ok:true, version:VERSION,
    endpoints: [
      '?action=ping',
      '?action=summary',
      '?action=walletmetrics',
      '?action=listassociates&limit=50',
      '?action=listonboarding&limit=50',
      '?action=listwallet&limit=50',
      '?action=commanderMetrics',
      '?action=listCPAAccounts',
      '?action=analyticsOverview',
      '?action=usersOverview',
      '?action=walletOverview',
      '?action=securityOverview',
      '?action=monitoringFeed'
    ]
  };
}
function ping(){ return { ok:true, time:new Date().toISOString(), version:VERSION }; }

/* ========================= Legacy (sheet-driven) ========================= */
function summary() {
  const onboard = _readTable('Onboarding').rows;
  const assoc   = _readTable('New Associates').rows;
  const wallet  = _readTable('Wallet_Report').rows;

  const pendingOnboarding = onboard.filter(r => _lc(r['Status']).includes('pending')).length;
  const activeAssociates  = assoc.filter(r => {
    const s=_lc(r['Status']); return !s || s==='active'||s==='approved'||s==='confirmed';
  }).length;

  const startISO = new Date().toISOString().slice(0,10);
  const approvalsToday = assoc.filter(r => String(r['Last_Action_At']||'').slice(0,10)===startISO).length;

  const since = Date.now()-24*3600*1000;
  const inflow24 = wallet.reduce((sum,w)=>{
    const t=new Date(String(w['Time']||'')).getTime();
    const st=_lc(w['Status']), dir=_lc(w['Direction']), amt=_num(w['Amount']);
    if (isFinite(t)&&t>=since && st==='success' && dir==='in') sum+=amt;
    return sum;
  },0);

  _log('Empire System','summary','','','');
  return { ok:true, pendingOnboarding, activeAssociates, approvalsToday, walletInflow24:_r2(inflow24), updatedAt:_isoNow() };
}

function walletmetrics() {
  const wallet = _readTable('Wallet_Report').rows;
  const byStatus = wallet.reduce((m,w)=>{ const s=_lc(w['Status']); m[s]=(m[s]||0)+_num(w['Amount']); return m; },{});
  const today = new Date().toISOString().slice(0,10);
  const todayIn = wallet.filter(w => String(w['Time']||'').slice(0,10)===today && _lc(w['Direction'])==='in' && _lc(w['Status'])==='success')
                        .reduce((s,w)=> s+_num(w['Amount']), 0);
  return { ok:true, byStatus, todayIn:_r2(todayIn), updatedAt:_isoNow() };
}

function listassociates(p){ const limit=_limit(p.limit,50,500); const rows=_readTable('New Associates').rows; return { ok:true, total:rows.length, items:rows.slice(-limit) }; }
function listonboarding(p){ const limit=_limit(p.limit,50,500); const rows=_readTable('Onboarding').rows;    return { ok:true, total:rows.length, items:rows.slice(-limit) }; }
function listwallet(p){     const limit=_limit(p.limit,50,500); const rows=_readTable('Wallet_Report').rows;   return { ok:true, total:rows.length, items:rows.slice(-limit) }; }

/* ========================= Dashboard Endpoints ========================= */
function commanderMetrics(){
  const onboard=_readTable('Onboarding').rows;
  const assoc  =_readTable('New Associates').rows;
  const logs   =_readTable('Log_Event').rows;
  const wallet =_readTable('Wallet_Report').rows;

  const pendingOnboarding = onboard.filter(r => _lc(r['Status']).includes('pending')).length;
  const activeAssociates  = assoc.filter(r => { const s=_lc(r['Status']); return !s||s==='active'||s==='approved'||s==='confirmed'; }).length;

  const start=_todayStart_().getTime();
  const approvalsToday = logs.filter(l=>{
    const t=new Date(String(l['Timestamp']||l['Time']||'')).getTime();
    const a=_lc(l['Action']); return isFinite(t)&&t>=start && a.indexOf('approve')>-1;
  }).length;

  const since=Date.now()-24*3600*1000;
  const walletInflow24 = wallet.reduce((sum,w)=>{
    const ts=new Date(String(w['Time']||'')).getTime();
    const st=_lc(w['Status']), dir=_lc(w['Direction']), amt=_num(w['Amount']);
    if(isFinite(ts)&&ts>=since && st==='success' && dir==='in') sum+=amt;
    return sum;
  },0);

  // optional extras from Analytics
  const A=_readTable('Analytics').rows;
  const weekAgo=Date.now()-7*24*3600*1000;
  const earningsWeek=A.filter(r=> new Date(String(r['Date & Time']||'')).getTime()>=weekAgo)
                      .reduce((s,r)=> s+_num(r['Earnings ($)']),0);
  const clicksWeek =A.filter(r=> new Date(String(r['Date & Time']||'')).getTime()>=weekAgo)
                      .reduce((s,r)=> s+_num(r['Clicks']),0);
  const leadsWeek  =A.filter(r=> new Date(String(r['Date & Time']||'')).getTime()>=weekAgo)
                      .reduce((s,r)=> s+_num(r['Leads']),0);
  const conv = clicksWeek ? (leadsWeek/clicksWeek)*100 : 0;

  return { ok:true,
    pendingOnboarding,
    activeAssociates,
    approvalsToday,
    walletInflow24:_r2(walletInflow24),
    earningsWeek:_r2(earningsWeek),
    conversionRate:_r2(conv),
    totalClicksWeek:clicksWeek,
    updatedAt:_isoNow()
  };
}

function listCPAAccounts(){
  const rows=_readTable('CPA_Accounts').rows;
  const items=rows.map(r=>({
    accountName:r['Account Name'],
    network:r['Network'],
    accountId:r['Account ID'],
    revenue:_num(r['Revenue']),
    clicks:_num(r['Clicks']),
    conversion:_num(r['Conversion']),
    activeOffers:_num(r['Active Offers']),
    status:r['Status']||'ACTIVE'
  }));
  return { ok:true, total:items.length, items };
}

function analyticsOverview(){
  const A=_readTable('Analytics').rows;
  if (A.length>0){
    const byMonth={}; const geo={};
    A.forEach(r=>{
      const d=new Date(String(r['Date & Time']||'')); if(isNaN(d)) return;
      const k=d.getFullYear()+'-'+('0'+(d.getMonth()+1)).slice(-2);
      byMonth[k]=(byMonth[k]||0)+_num(r['Earnings ($)']);
      const c=String(r['Country']||'Unknown'); geo[c]=(geo[c]||0)+_num(r['Earnings ($)']);
    });
    const latest=A.slice(-20).reverse();
    return { ok:true, monthly:byMonth, geo, latest, updatedAt:_isoNow() };
  }
  // fallback from wallet inflow
  const W=_readTable('Wallet_Report').rows;
  const byMonthW={};
  W.forEach(w=>{
    const d=new Date(String(w['Time']||'')); if(isNaN(d)) return;
    if(_lc(w['Status'])!=='success'||_lc(w['Direction'])!=='in') return;
    const k=d.getFullYear()+'-'+('0'+(d.getMonth()+1)).slice(-2);
    byMonthW[k]=(byMonthW[k]||0)+_num(w['Amount']);
  });
  const latestW=W.slice(-20).reverse();
  return { ok:true, monthly:byMonthW, geo:{}, latest:latestW, updatedAt:_isoNow() };
}

function usersOverview(){
  const rows=_readTable('New Associates').rows;
  const total=rows.length;
  const active=rows.filter(r=>{ const s=_lc(r['Status']); return !s||s==='active'||s==='approved'||s==='confirmed'; }).length;
  const byLevel=rows.reduce((m,r)=>{ const L=String(r['Level']||'').trim()||''; m[L]=(m[L]||0)+1; return m; },{});
  const w=walletOverview(); const totalEarnings=(w&&typeof w.net==='number')?w.net:0;
  const items=rows.slice(-50).reverse();
  return { ok:true, total, active, byLevel, totalEarnings, items, updatedAt:_isoNow() };
}

function walletOverview(){
  const rows=_readTable('Wallet_Report').rows;
  const inflow=rows.filter(r=> _lc(r['Status'])==='success' && _lc(r['Direction'])==='in')
                   .reduce((s,r)=> s+_num(r['Amount']),0);
  const outflow=rows.filter(r=> _lc(r['Status'])==='success' && _lc(r['Direction'])==='out')
                    .reduce((s,r)=> s+_num(r['Amount']),0);
  const recent=rows.slice(-30).reverse();
  return { ok:true, inflow:_r2(inflow), outflow:_r2(outflow), net:_r2(inflow-outflow), recent, updatedAt:_isoNow() };
}

function securityOverview(){
  const logs=_readTable('Log_Event').rows;
  const errors=logs.filter(r=> _lc(r['Action'])==='error').length;
  const recent=logs.slice(-40).reverse();
  return { ok:true, errorCount:errors, recent, updatedAt:_isoNow() };
}

function monitoringFeed(){
  const feed=[];
  const newUsers=_readTable('New Associates').rows.slice(-3);
  newUsers.forEach(r=> feed.push({ t:_isoNow(), type:'user', msg:`Associate: ${r['Name']||r['Email']||r['Phone No']||'N/A'}` }));
  const wallet=_readTable('Wallet_Report').rows.slice(-8);
  wallet.forEach(w=>{
    const dir=_lc(w['Direction']), s=_lc(w['Status']), amt=_num(w['Amount']);
    if (!dir||!s) return;
    feed.push({ t:String(w['Time']||_isoNow()), type: dir==='out'?'withdrawal':'payment', msg:`${_cap(s)}: ${w['Method']||''} ${dir} $${amt}` });
  });
  const cpas=_readTable('CPA_Accounts').rows.slice(-3);
  cpas.forEach(r=> feed.push({ t:_isoNow(), type:'cpa', msg:`${r['Account Name']||'CPA'} – ${r['Status']||'ACTIVE'}` }));
  return { ok:true, items: feed.sort((a,b)=> String(b.t).localeCompare(String(a.t))).slice(0,20) };
}

/* ========================= Utilities ========================= */
function _authOK_(e){
  const p  = e && e.parameter ? e.parameter : {};
  const hdr= e && e.requestHeaders ? e.requestHeaders : {};
  const apiKey = p.key || hdr['x-api-key'] || hdr['X-API-Key'] || '';
  const pass   = p.pass || hdr['x-cmd-pass'] || hdr['X-Cmd-Pass'] || '';
  const REQ_KEY = PropertiesService.getScriptProperties().getProperty('API_KEY') || '';
  if (pass && pass === PASS) return true;  // commander override
  if (!REQ_KEY) return true;               // open if no key set
  return apiKey === REQ_KEY;               // key match
}

function _readTable(name){
  const sh = SpreadsheetApp.getActive().getSheetByName(name);
  if (!sh) return { headers:[], rows:[] };
  const v = sh.getDataRange().getValues();
  if (!v || v.length === 0) return { headers:[], rows:[] };
  const headers = (v.shift()||[]).map(h=>String(h||'').trim());
  const rows = v
    .filter(r => r.some(c => c!=='' && c!==null))
    .map(r => Object.fromEntries(headers.map((h,i)=>[h, r[i]])));
  return { headers, rows };
}

function _json(obj){
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function _num(x){ const n = (typeof x==='number') ? x : parseFloat(String(x).replace(/[, ]/g,'')); return isFinite(n)?n:0; }
function _r2(x){ return Math.round(_num(x)*100)/100; }
function _isoNow(){ return Utilities.formatDate(new Date(), Session.getScriptTimeZone()||'UTC', "yyyy-MM-dd'T'HH:mm:ss'Z'"); }
function _lc(s){ return String(s||'').toLowerCase(); }
function _cap(s){ s=String(s||''); return s.slice(0,1).toUpperCase()+s.slice(1); }
function _todayStart_(){ const d=new Date(); d.setHours(0,0,0,0); return d; }

function _log(user, action, c1, c2, c3) {
  const ss = SpreadsheetApp.getActive();
  const sh = ss.getSheetByName('Log_Event') || ss.insertSheet('Log_Event');
  if (sh.getLastRow() === 0) sh.appendRow(["Timestamp","User","Action","Email","Phone Number","Status"]);
  sh.appendRow([_isoNow(), user||'', action||'', c1||'', c2||'', c3||'']);
}

function _limit(x,def,minmax){ const n=Number(x||def); return Math.max(1, Math.min(minmax||500, n)); }
