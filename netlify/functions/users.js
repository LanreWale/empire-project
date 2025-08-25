// netlify/functions/users.js
"use strict";

exports.handler = async () => {
  try {
    const base = process.env.EMPIRE_APPS_SCRIPT_BASE || "";
    if (!base) {
      return {
        statusCode: 500,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ok:false, error:"EMPIRE_APPS_SCRIPT_BASE not set" })
      };
    }

    const url = `${base}?action=users&limit=200`;
    const r = await fetch(url, {
      method: "GET",
      headers: { "Accept": "application/json" }
    });
    const text = await r.text();

    // Try JSON parse, otherwise wrap raw
    let out;
    try { out = JSON.parse(text); } 
    catch { out = { ok:false, raw:text }; }

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(out)
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ok:false, error:String(err) })
    };
  }
};