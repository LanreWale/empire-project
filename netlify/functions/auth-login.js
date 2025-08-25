// netlify/functions/auth-login.js
"use strict";

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") {
      return { statusCode: 405, body: JSON.stringify({ ok:false, error:"Method not allowed" }) };
    }
    const { pin } = JSON.parse(event.body || "{}");
    const correct = (process.env.CMD_PASS || "").trim();
    if (!correct) {
      return { statusCode: 500, body: JSON.stringify({ ok:false, error:"Server misconfig: CMD_PASS not set" }) };
    }
    if (!pin || pin !== correct) {
      return { statusCode: 401, body: JSON.stringify({ ok:false, error:"Invalid PIN" }) };
    }

    // Issue a short token (for demo we echo a signed-like string; replace with JWT if you prefer)
    const token = `emp_${Buffer.from(`${Date.now()}:${Math.random()}`).toString("base64url")}`;
    return { statusCode: 200, body: JSON.stringify({ ok:true, token }) };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ ok:false, error:String(e.message||e) }) };
  }
};