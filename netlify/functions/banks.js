"use strict";

exports.handler = async () => {
  try {
    const key = (process.env.PAYSTACK_SECRET_KEY || "").trim();
    if (!key) return j(500, { ok:false, error:"PAYSTACK_SECRET_KEY not set" });

    const r = await fetch("https://api.paystack.co/bank?country=nigeria", {
      headers: { Authorization: `Bearer ${key}` },
    });
    if (!r.ok) return j(502, { ok:false, error:`Paystack ${r.status}` });

    const d = await r.json().catch(()=>({ status:false }));
    if (d.status !== true) return j(502, { ok:false, error:"Paystack error" });

    const banks = (d.data || []).map(b => ({ id:b.id, code:b.code, name:b.name }));
    return j(200, { ok:true, banks });
  } catch (e) {
    return j(500, { ok:false, error:String(e.message||e) });
  }
};

function j(code, body){
  return { statusCode:code, headers:{ "content-type":"application/json" }, body:JSON.stringify(body) };
}