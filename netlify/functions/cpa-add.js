"use strict";
const axios = require("./lib/http");
const json = (s, b) => ({ statusCode: s, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" }, body: JSON.stringify(b) });

exports.handler = async (event) => {
  if ((event.httpMethod || "GET").toUpperCase() !== "POST") return json(405, { ok: false, error: "Method not allowed" });
  try {
    // ✅ only env reads, no literals
    const CPA_API_URL = (process.env.CPA_API_URL || "").trim();
    const CPA_API_KEY = (process.env.CPA_API_KEY || "").trim();
    if (!CPA_API_URL || !CPA_API_KEY) return json(500, { ok: false, error: "CPA configuration missing" });

    const b = JSON.parse(event.body || "{}");
    const payload = {
      name: String(b.name || ""),
      domain: String(b.domain || ""),
      user: String(b.user || ""),
      apiKey: String(b.apiKey || ""),
      startingRevenue: Number(b.startingRevenue || 0) || 0,
    };

    const r = await axios.post(CPA_API_URL.replace(/\/+$/, "") + "/accounts", payload, {
      headers: { Authorization: `Bearer ${CPA_API_KEY}`, "Content-Type": "application/json" },
      timeout: 20000,
    });
    return json(200, { ok: true, result: r.data || null });
  } catch (e) {
    return json(500, { ok: false, error: e.message || String(e) });
  }
};