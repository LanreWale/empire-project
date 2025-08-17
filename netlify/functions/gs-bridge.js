const axios = require("axios");

exports.handler = async (event) => {
  try {
    const WEBAPP_URL = process.env.GOOGLE_SHEETS_WEBAPP_URL || "";
    const WEBAPP_KEY = process.env.GS_WEBAPP_KEY || "";
    if (!WEBAPP_URL) {
      return { statusCode: 400, body: JSON.stringify({ ok:false, error:"WEBAPP_URL not set" }) };
    }

    const isGet = (event.httpMethod || "GET").toUpperCase() === "GET";

    if (isGet) {
      const r = await axios.get(WEBAPP_URL, { timeout: 15000 });
      return {
        statusCode: 200,
        body: JSON.stringify({ ok:true, via:"apps_script", mode:"GET", data:r.data })
      };
    }

    let body = {};
    try { body = JSON.parse(event.body || "{}") } catch (_) {}

    // supports {values:[...]} or {record:{...}}
    let values = body.values;
    if (!values && body.record && typeof body.record === "object") {
      values = Object.values(body.record);
    }
    const sheet  = body.sheet || body.tab || "Log_Event";
    const action = body.action || "append";

    const payload = { key: WEBAPP_KEY, action, sheet, values };
    const r = await axios.post(WEBAPP_URL, payload, {
      headers: { "Content-Type": "application/json" },
      timeout: 15000
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ ok:true, via:"apps_script", mode:"POST", result:r.data })
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ ok:false, error:String(err) }) };
  }
};
