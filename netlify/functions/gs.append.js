// netlify/functions/gs-append.js
exports.handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") {
      return { statusCode: 405, body: "Use POST" };
    }

    const { sheet, values } = JSON.parse(event.body || "{}");
    if (!sheet || !Array.isArray(values)) {
      return { statusCode: 400, body: JSON.stringify({ ok: false, error: "sheet and values[] required" }) };
    }

    const EXEC = process.env.GOOGLE_SHEETS_WEBAPP_URL;   // e.g. https://script.google.com/macros/s/AKfy.../exec
    const KEY  = process.env.GS_WEBAPP_KEY;              // empireaffiliatemarketinghub@157_69

    if (!EXEC || !KEY) {
      return { statusCode: 500, body: JSON.stringify({ ok: false, error: "Missing EXEC URL or KEY env" }) };
    }

    // Build GET URL to Apps Script (works across the 302 redirect)
    const qs = new URLSearchParams({
      action: "append",
      key: KEY,
      sheet: sheet,
      values: JSON.stringify(values)
    });

    const url = `${EXEC}?${qs.toString()}`;
    const res = await fetch(url, { method: "GET" });
    const text = await res.text();

    // Try to parse JSON; if HTML arrives, return an error message
    try {
      const json = JSON.parse(text);
      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ok: true, upstream: json })
      };
    } catch {
      return {
        statusCode: 502,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ok: false, error: "Upstream not JSON", preview: text.slice(0, 200) })
      };
    }
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ ok: false, error: String(err) }) };
  }
};