// netlify/functions/lib/http.js

// ---------- Existing helpers (keep) ----------
function json(statusCode, obj) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(obj),
  };
}

function requireEnv(keys = []) {
  const missing = keys.filter(k => !process.env[k] || String(process.env[k]).trim() === "");
  if (missing.length) {
    const msg = `Missing required env: ${missing.join(", ")}`;
    return { ok: false, error: msg };
  }
  return { ok: true };
}

function baseUrl() {
  return process.env.URL || process.env.DEPLOY_URL || process.env.SITE_URL || "";
}

// ---------- New: lightweight axios-like HTTP wrapper using native fetch ----------
const qs = (obj = {}) =>
  Object.entries(obj).map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join("&");

function withTimeout(ms) {
  const c = new AbortController();
  const t = ms ? setTimeout(() => c.abort(), ms) : null;
  return { signal: c.signal, clear: () => t && clearTimeout(t) };
}

async function doFetch(url, { method = "GET", headers = {}, params, data, timeout, maxRedirects, ...rest } = {}) {
  let u = new URL(url);
  if (params && typeof params === "object" && Object.keys(params).length) {
    u = new URL(u.toString());
    u.search = u.search ? `${u.search}&${qs(params)}` : `?${qs(params)}`;
  }

  const { signal, clear } = withTimeout(timeout);
  const init = {
    method,
    headers: { ...(headers || {}) },
    signal,
    redirect: "follow",
    ...rest,
  };

  if (data !== undefined) {
    if (!init.headers["Content-Type"] && !(data instanceof FormData)) {
      init.headers["Content-Type"] = "application/json";
    }
    init.body =
      init.headers["Content-Type"] === "application/json" && !(data instanceof FormData)
        ? JSON.stringify(data)
        : data;
  }

  try {
    const res = await fetch(u.toString(), init);
    const ct = res.headers.get("content-type") || "";
    const parsed = ct.includes("application/json") ? await res.json().catch(() => ({})) : await res.text();
    if (!res.ok) {
      const err = new Error(res.statusText || `HTTP ${res.status}`);
      err.response = { status: res.status, data: parsed };
      throw err;
    }
    return { status: res.status, data: parsed, headers: res.headers };
  } finally {
    clear();
  }
}

async function get(url, opts = {})         { return doFetch(url, { ...opts, method: "GET" }); }
async function post(url, data, opts = {})  { return doFetch(url, { ...opts, method: "POST", data }); }
async function put(url, data, opts = {})   { return doFetch(url, { ...opts, method: "PUT", data }); }
async function del(url, opts = {})         { return doFetch(url, { ...opts, method: "DELETE" }); }

// CommonJS exports (keep old + add new)
module.exports = {
  json,
  requireEnv,
  baseUrl,
  get,
  post,
  put,
  delete: del,
};