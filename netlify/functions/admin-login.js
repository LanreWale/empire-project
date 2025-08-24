"use strict";

function json(status, obj) {
  return { statusCode: status, headers: { "Content-Type": "application/json" }, body: JSON.stringify(obj) };
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { ok: false, error: "Method not allowed" });

  let body = {};
  try { body = JSON.parse(event.body || "{}"); } catch {}

  const pin = String(body.pin || "");
  const correct = String(process.env.CMD_PASS || "");

  if (!correct) return json(500, { ok: false, error: "Server misconfigured" });
  if (pin && pin === correct) {
    const token = Buffer.from(`ok:${Date.now()}`).toString("base64"); // light client gate
    return json(200, { ok: true, token });
  }
  return json(200, { ok: false, error: "Invalid PIN" });
};