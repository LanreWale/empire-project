const { URL } = require('url');

const APPSCRIPT_URL = process.env.GOOGLE_SHEETS_WEBAPP_URL || '';
const GS_KEY = process.env.GS_WEBAPP_KEY || ''; // optional – used if caller doesn't pass ?key=
const MIN_GAP_MS = Number(process.env.RATE_LIMIT_MIN_MS || 400); // soft gap between upstream calls

let lastCallAt = 0; // soft limiter within the same warm Lambda instance

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function looksLikeGoogleHtmlError(txt) {
  if (!txt) return false;
  const t = txt.toLowerCase();
  return (
    t.includes('<html') &&
    (t.includes('too many requests') ||
      t.includes('page not found') ||
      t.includes('sorry, unable to open') ||
      t.includes('moved temporarily') ||
      t.includes('google drive') ||
      t.includes('error'))
  );
}

async function requestWithRetry({ url, method, body, headers }, attempts = 5) {
  // Soft rate limit
  const delta = Date.now() - lastCallAt;
  if (delta < MIN_GAP_MS) await sleep(MIN_GAP_MS - delta);

  let backoff = 300; // ms
  let lastErr;

  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });

      lastCallAt = Date.now();

      const text = await res.text();

      // If HTML from Google error pages, treat as retriable
      if (!res.ok || looksLikeGoogleHtmlError(text)) {
        // Retry on common status
        if ([429, 500, 502, 503, 504].includes(res.status) || looksLikeGoogleHtmlError(text)) {
          await sleep(backoff + Math.floor(Math.random() * 200));
          backoff = Math.min(backoff * 2, 4000);
          continue;
        }
        // Non-retriable: return structured error
        return { ok: false, status: res.status, error: `Upstream non-JSON (${res.status}): ${text.slice(0, 180)}` };
      }

      // Try JSON parse
      try {
        const json = JSON.parse(text);
        return json;
      } catch {
        // If it wasn't JSON (Apps Script sometimes returns plain text), wrap it
        return { ok: true, raw: text };
      }
    } catch (err) {
      lastErr = err;
      await sleep(backoff + Math.floor(Math.random() * 200));
      backoff = Math.min(backoff * 2, 4000);
    }
  }

  return { ok: false, error: `Upstream request failed after retries: ${String(lastErr || 'unknown')}` };
}

function buildUrl(base, params) {
  const u = new URL(base);
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null) u.searchParams.set(k, typeof v === 'string' ? v : JSON.stringify(v));
  });
  return u.toString();
}

exports.handler = async (event) => {
  const isGet = event.httpMethod === 'GET';
  const isPost = event.httpMethod === 'POST';

  // CORS (optional – allows browser calls to this function)
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      },
      body: '',
    };
  }

  const bad = (msg, code = 400) => ({
    statusCode: code,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    body: JSON.stringify({ ok: false, error: msg }),
  });

  if (!APPSCRIPT_URL) return bad('GOOGLE_SHEETS_WEBAPP_URL not set on Netlify', 500);

  // Parse input
  let q = {};
  try {
    q = isGet ? (event.queryStringParameters || {}) : JSON.parse(event.body || '{}');
  } catch {
    return bad('Invalid JSON body');
  }

  const action = (q.action || '').toLowerCase() || 'ping';
  const key = q.key || GS_KEY; // if caller doesn’t pass, use server value
  const sheet = q.sheet;
  const values = q.values; // single row (array)
  const rows = q.rows; // batch rows (array of arrays)

  // health
  if (action === 'ping') {
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
      body: JSON.stringify({ ok: true, via: 'netlify', ts: new Date().toISOString() }),
    };
  }

  // Build upstream params common to both GET and POST
  const baseParams = { key, action };
  if (sheet) baseParams.sheet = sheet;

  // Prefer POST to Apps Script (more reliable for complex payload), with fallback to GET.
  let upstream = await requestWithRetry(
    {
      url: APPSCRIPT_URL,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: { ...baseParams, values, rows },
    },
    5
  );

  // If Apps Script rejects POST with 405 (or returned HTML) → try GET style
  if (!upstream.ok && String(upstream.error || '').includes('405')) {
    const url = buildUrl(APPSCRIPT_URL, { ...baseParams, values, rows });
    upstream = await requestWithRetry({ url, method: 'GET', headers: {} }, 5);
  }

  // Normalize success
  const body =
    upstream && upstream.ok !== undefined
      ? upstream
      : { ok: false, error: 'Unknown upstream response', upstream };

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    body: JSON.stringify(body),
  };
};