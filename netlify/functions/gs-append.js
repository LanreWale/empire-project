// netlify/functions/gs-append.js
const fetch = global.fetch;

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") {
      return { statusCode: 405, body: JSON.stringify({ ok: false, error: "Use POST" }) };
    }

    const { sheet, values } = JSON.parse(event.body || "{}");
    if (!sheet || !Array.isArray(values)) {
      return { statusCode: 400, body: JSON.stringify({ ok: false, error: "sheet and values[] required" }) };
    }

    const WEBAPP = process.env.GOOGLE_SHEETS_WEBAPP_URL;  // https://script.google.com/macros/s/.../exec
    const KEY    = process.env.GS_WEBAPP_KEY;             // empireaffiliatemarketinghub@157_69

    if (!WEBAPP || !KEY) {
      return { statusCode: 500, body: JSON.stringify({ ok: false, error: "WEBAPP URL or KEY not set" }) };
    }

    // Call Apps Script via GET to avoid POST body drop on redirect
    const url = new URL(WEBAPP);
    url.searchParams.set("action", "append");
    url.searchParams.set("key", KEY);
    url.searchParams.set("sheet", sheet);
    url.searchParams.set("values", JSON.stringify(values));

    const res = await fetch(url.toString(), { method: "GET" });
    const text = await res.text();

    try {
      const json = JSON.parse(text);
      return { statusCode: 200, body: JSON.stringify({ ok: true, upstream: json }) };
    } catch {
      return { statusCode: 502, body: JSON.stringify({ ok: false, error: `Upstream non-JSON (${res.status})`, body: text.slice(0, 500) }) };
    }
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ ok: false, error: String(err) }) };
  }
};