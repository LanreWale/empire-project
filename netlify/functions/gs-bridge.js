export const handler = async (event) => {
  // Health check (GET)
  if (event.httpMethod === "GET") {
    try {
      const url = process.env.GOOGLE_SHEETS_WEBAPP_URL;
      const health = await fetch(`${url}?action=ping&key=${encodeURIComponent(process.env.GS_WEBAPP_KEY)}`, {
        method: "GET",
        redirect: "follow",
      });
      const json = await health.json().catch(() => null);
      return json
        ? jsonResponse(200, json)
        : jsonResponse(500, { ok: false, error: "Health check failed" });
    } catch (err) {
      return jsonResponse(500, { ok: false, error: String(err) });
    }
  }

  // Only POST beyond this point
  if (event.httpMethod !== "POST") {
    return jsonResponse(405, { ok: false, error: "Method not allowed" });
  }

  // ---- guard envs
  const APP_URL = process.env.GOOGLE_SHEETS_WEBAPP_URL || "";
  const GS_KEY  = process.env.GS_WEBAPP_KEY || "";
  const SSID    = process.env.GS_SHEET_ID || process.env.GOOGLE_SHEETS_ID || "";

  if (!APP_URL) return jsonResponse(500, { ok: false, error: "GOOGLE_SHEETS_WEBAPP_URL not set" });
  if (!GS_KEY)  return jsonResponse(500, { ok: false, error: "GS_WEBAPP_KEY not set" });
  if (!SSID)    return jsonResponse(500, { ok: false, error: "GS_SHEET_ID not set" });

  // ---- read body
  let body;
  try {
    body = event.body ? JSON.parse(event.body) : {};
  } catch (e) {
    return jsonResponse(400, { ok: false, error: "Invalid JSON body" });
  }

  // default the key if caller didn’t include it
  if (!body.key) body.key = GS_KEY;

  // ---- do POST with manual redirect, then re-POST to Location
  try {
    const upstream = await postWithRedirect(APP_URL, body);
    return jsonResponse(200, { ok: true, upstream });
  } catch (err) {
    return jsonResponse(502, { ok: false, error: String(err) });
  }
};

// ---- helpers

async function postWithRedirect(url, payload) {
  // First request: don't auto-follow so we can keep method/body
  const res1 = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    redirect: "manual",
  });

  // If Google replied 3xx, take Location and re-POST same body there
  if (res1.status >= 300 && res1.status < 400) {
    const loc = res1.headers.get("location");
    if (!loc) throw new Error(`Redirect (${res1.status}) without Location header`);
    const res2 = await fetch(loc, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      redirect: "follow",
    });
    return assertJSON(res2);
  }

  // No redirect; just parse body
  return assertJSON(res1);
}

async function assertJSON(res) {
  const txt = await res.text();
  try {
    const j = JSON.parse(txt);
    return j;
  } catch {
    throw new Error(`Upstream non-JSON (${res.status}): ${txt.slice(0, 300)}`);
  }
}

function jsonResponse(statusCode, obj) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-cache" },
    body: JSON.stringify(obj),
  };
}