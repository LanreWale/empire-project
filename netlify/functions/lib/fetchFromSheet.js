/**
 * Calls your Apps Script / Sheet webapps using global fetch (Node 18).
 * Builds URLs from either a direct endpoint or a base + standard path.
 */
const {
  SHEETS_BASE_URL,
  EMPIRE_APPS_SCRIPT_BASE,
  GS_WEBAPP_KEY,
  SHEETS_SUMMARY_URL,
  SHEETS_ANALYTICS_URL,
  SHEETS_EVENTS_URL,
  SHEETS_USERS_URL,
  SHEETS_PENDING_URL,
  SHEETS_WALLET_URL,
  SHEETS_OFFERS_URL,
} = process.env;

const PATH_MAP = { SUMMARY:'summary', ANALYTICS:'analytics', EVENTS:'events', USERS:'users', PENDING:'pending', WALLET:'wallet', OFFERS:'offers' };

function direct(kind){
  switch(kind){
    case 'SUMMARY':return SHEETS_SUMMARY_URL;
    case 'ANALYTICS':return SHEETS_ANALYTICS_URL;
    case 'EVENTS':return SHEETS_EVENTS_URL;
    case 'USERS':return SHEETS_USERS_URL;
    case 'PENDING':return SHEETS_PENDING_URL;
    case 'WALLET':return SHEETS_WALLET_URL;
    case 'OFFERS':return SHEETS_OFFERS_URL;
    default:return null;
  }
}
function baseRoot(){
  const b = SHEETS_BASE_URL || EMPIRE_APPS_SCRIPT_BASE;
  if(!b) throw new Error('No base URL (set SHEETS_BASE_URL or EMPIRE_APPS_SCRIPT_BASE).');
  return b.replace(/\/+$/,'');
}
function buildUrl(kind, params){
  const K = String(kind).toUpperCase();
  const d = direct(K);
  const urlStr = d ? d : `${baseRoot()}/${PATH_MAP[K]||''}`;
  const u = new URL(urlStr);
  if(GS_WEBAPP_KEY && !u.searchParams.has('key')) u.searchParams.set('key', GS_WEBAPP_KEY);
  if(params) for(const [k,v] of Object.entries(params)) u.searchParams.set(k, v);
  return u.toString();
}
async function getJSON(kind, params){
  const url = buildUrl(kind, params);
  const res = await fetch(url, { headers:{ accept:'application/json' } });
  const text = await res.text();
  let data;
  try { data = text ? JSON.parse(text) : {}; }
  catch(e){ throw new Error(`Non-JSON from ${url}: ${text.slice(0,200)}`); }
  if(!res.ok) throw new Error(`HTTP ${res.status} from ${url}: ${text.slice(0,120)}`);
  return data;
}

module.exports = { getJSON, buildUrl };
