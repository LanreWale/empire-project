const axios = require("axios");

exports.handler = async () => {
  const health = {
    server: "ONLINE",
    db: "CONNECTED", // adjust if you wire a real db ping
    sheets: "DOWN",
    ai: "ACTIVE",
    sync: "15s",
    lastPing: new Date().toISOString(),
  };

  try {
    const WEBAPP_URL = process.env.GOOGLE_SHEETS_WEBAPP_URL || "";
    const WEBAPP_KEY = process.env.GS_WEBAPP_KEY || "";
    if (!WEBAPP_URL) {
      return resp(200, { ...health, sheets: "MISCONFIGURED" });
    }

    // lightweight GET to verify availability
    const r = await axios.get(WEBAPP_URL, {
      params: { key: WEBAPP_KEY, action: "ping" },
      timeout: 8000,
    });

    if (r.status === 200) {
      health.sheets = "OPERATIONAL";
      if (r.data?.lastSync) health.lastSync = r.data.lastSync;
    } else {
      health.sheets = "DEGRADED";
    }
  } catch {
    health.sheets = "DOWN";
  }

  return resp(200, health);
};

function resp(status, body) {
  return { statusCode: status, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) };
}