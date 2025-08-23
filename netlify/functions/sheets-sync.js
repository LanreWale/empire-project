// netlify/functions/sheets-sync.js  (axios-free)
exports.handler = async (event) => {
  try {
    const WEBAPP_URL = process.env.GOOGLE_SHEETS_WEBAPP_URL || "";
    const WEBAPP_KEY = process.env.GS_WEBAPP_KEY || "";
    if (!WEBAPP_URL) return resp(400, { ok:false, error:"WEBAPP_URL not set" });

    const method = (event.httpMethod || "GET").toUpperCase();

    if (method === "GET") {
      const r = await fetch(WEBAPP_URL, { method: "GET", headers: { "Accept":"application/json" } });
      const data = await r.json().catch(() => ({}));
      return resp(200, { ok:true, via:"apps_script", mode:"GET", data });
    }

    // POST branch
    let body = {};
    try { body = JSON.parse(event.body || "{}"); } catch {}

    // supports {values:[...]} or {record:{...}}
    let values = body.values;
    if (!values && body.record && typeof body.record === "object") {
      values = Object.values(body.record);
    }
    const sheet  = body.sheet || body.tab || "Log_Event";
    const action = body.action || "append";

    const payload = { key: WEBAPP_KEY, action, sheet, values };
    const r = await fetch(WEBAPP_URL, {
      method: "POST",
      headers: { "Content-Type":"application/json", "Accept":"application/json" },
      body: JSON.stringify(payload)
    });
    const result = await r.json().catch(() => ({}));

    return resp(200, { ok:true, via:"apps_script", mode:"POST", result });
  } catch (err) {
    return resp(500, { ok:false, error:String(err) });
  }
};

function resp(status, body) {
  return { statusCode: status, headers: { "Content-Type":"application/json" }, body: JSON.stringify(body) };
}