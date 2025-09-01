/**
 * Tiny helpers (no external deps)
 */
const okHeaders = {
  'Content-Type': 'application/json; charset=utf-8',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
};

export function preflight(event) {
  return {
    statusCode: 200,
    headers: okHeaders,
    body: '',
  };
}

export function json(data, code = 200) {
  return {
    statusCode: code,
    headers: okHeaders,
    body: JSON.stringify(data),
  };
}

export function fail(message, code = 500, extra = {}) {
  return json({ ok: false, error: message, ...extra }, code);
}

export function env() {
  return {
    base: process.env.SHEETS_BASE_URL || '',
    key: process.env.GS_WEBAPP_KEY || '',
  };
}

export async function fetchJson(url) {
  const res = await fetch(url, { method: 'GET' });
  const ct = res.headers.get('content-type') || '';
  if (!ct.includes('application/json')) {
    const text = await res.text();
    throw new Error(`Non-JSON from ${url} (${ct}): ${text.slice(0, 180)}`);
  }
  return await res.json();
}

export function buildUrl(route) {
  const { base, key } = env();
  if (!base) throw new Error('SHEETS_BASE_URL not set');
  const u = new URL(base);
  if (route) u.searchParams.set('route', route);
  if (key) u.searchParams.set('key', key);
  return u.toString();
}
