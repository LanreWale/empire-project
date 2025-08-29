// netlify/functions/lib/http.js
"use strict";

// Minimal axios-like wrapper using global fetch (Node 18+)

function buildUrl(url, params) {
  if (!params) return url;
  const u = new URL(url);
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, String(v));
  return u.toString();
}

async function doFetch(method, url, { params, headers, timeout, body } = {}) {
  const controller = new AbortController();
  const id = timeout ? setTimeout(() => controller.abort(), timeout) : null;

  try {
    const res = await fetch(buildUrl(url, params), {
      method,
      headers,
      body,
      signal: controller.signal,
    });

    const text = await res.text();
    let data;
    try { data = text ? JSON.parse(text) : null; } catch { data = text; }

    if (!res.ok) {
      const err = new Error((data && (data.message || data.error)) || `${res.status} ${res.statusText}`);
      err.status = res.status;
      err.data = data;
      throw err;
    }
    return { status: res.status, data };
  } finally {
    if (id) clearTimeout(id);
  }
}

async function get(url, opts = {}) {
  return doFetch("GET", url, {
    params: opts.params,
    headers: opts.headers,
    timeout: opts.timeout,
  });
}

async function post(url, data, opts = {}) {
  const headers = Object.assign({ "Content-Type": "application/json" }, opts.headers || {});
  const body = headers["Content-Type"] === "application/json" ? JSON.stringify(data ?? {}) : data;
  return doFetch("POST", url, {
    params: opts.params,
    headers,
    timeout: opts.timeout,
    body,
  });
}

module.exports = { get, post };