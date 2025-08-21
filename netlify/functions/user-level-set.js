// netlify/functions/user-level-set.js
"use strict";

const axios = require("axios");
const { telegram, whatsapp, email } = require("./lib/notify");

const json = (status, body) => ({
  statusCode: status,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});
const safeJSON = (s) => { try { return JSON.parse(s || "{}"); } catch { return {}; } };

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") return json(405, { ok:false, error:"Method not allowed" });

    // Optional auth via PIN
    const CMD_USER = process.env.CMD_USER || "";
    const headerUser = event.headers["x-cmd-user"] || event.headers["X-Cmd-User"] || "";
    if (CMD_USER && headerUser !== CMD_USER) {
      return json(401, { ok:false, error:"Unauthorized" });
    }

    const { email: userEmail = "", level = "", reason = "", phone = "" } = safeJSON(event.body);
    if (!userEmail) return json(400, { ok:false, error:"Missing email" });
    if (!level)     return json(400, { ok:false, error:"Missing level" });

    const siteOrigin = process.env.URL || process.env.DEPLOY_PRIME_URL || process.env.DEPLOY_URL || "";
    if (!siteOrigin) return json(500, { ok:false, error:"Missing site origin at runtime" });
    const gsBridge = `${siteOrigin.replace(/\/$/, "")}/.netlify/functions/gs-bridge`;

    // Append event log FIRST
    const now = new Date().toISOString();
    const logRow = [now, "Commander", `Level change for ${userEmail}`, `${level}${reason ? ` — ${reason}` : ""}`];
    const logResp = await axios.post(gsBridge, { action:"append", sheet:"Event_Log", values: logRow }, { timeout: 12000 })
      .then(r => r.data).catch(e => ({ ok:false, error: String(e?.response?.data || e.message || e) }));

    // Update New Associates Level column (upsert by email)
    const updateResp = await axios.post(gsBridge, {
      action: "upsert",
      sheet: "New Associates",
      keyCol: "Email",
      keyVal: userEmail,
      updates: { Level: level }
    }, { timeout: 12000 }).then(r => r.data).catch(e => ({ ok:false, error: String(e?.response?.data || e.message || e) }));

    // Notify best-effort
    const line = `🎚️ *Level Update*\nEmail: ${userEmail}\nLevel: ${level}${reason ? `\nReason: ${reason}` : ""}\nTime: ${now}`;
    const tg = await telegram(line).catch(() => ({ ok:false }));
    let wa = null;
    if (phone) wa = await whatsapp(phone, `Your Empire level is now: ${level}${reason ? ` — ${reason}` : ""}`).catch(() => ({ ok:false }));

    return json(200, { ok:true, eventLog: logResp, update: updateResp, telegram: tg, whatsapp: wa });
  } catch (err) {
    return json(200, { ok:false, error: err.message || String(err) });
  }
};