// netlify/functions/user-level-set.js
import fetch from "node-fetch";

// We’ll store levels in Google Sheet (Users tab) for persistence
// You already have GS_WEBAPP_KEY and GOOGLE_SHEETS_WEBAPP_URL available

export default async (req, res) => {
  try {
    if (req.method === "OPTIONS") {
      return res.setHeader("Access-Control-Allow-Origin", "*")
        .setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        .setHeader("Access-Control-Allow-Headers", "Content-Type")
        .status(200).send("");
    }

    const { phone, level } = req.body || {};
    const sheet = "Users";

    if (req.method === "GET") {
      // Query current level
      const url = `${process.env.GOOGLE_SHEETS_WEBAPP_URL}?key=${process.env.GS_WEBAPP_KEY}&action=find&sheet=${sheet}&phone=${encodeURIComponent(req.query.phone || "")}`;
      const r = await fetch(url);
      const j = await r.json();
      return res.json({ ok: true, level: j.level || 1 });
    }

    if (req.method === "POST") {
      if (!phone || !level) return res.status(400).json({ ok: false, error: "phone+level required" });

      // Push to Sheet
      const payload = {
        action: "update",
        sheet,
        phone,
        values: { level: level }
      };
      const r = await fetch(process.env.GOOGLE_SHEETS_WEBAPP_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const j = await r.json();
      return res.json({ ok: true, updated: j });
    }

    return res.status(405).json({ ok: false, error: "Method not allowed" });
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err) });
  }
};