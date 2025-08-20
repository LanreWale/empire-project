// netlify/functions/offers-feed.js
"use strict";
const { requireAuth, json } = require("./lib/auth");

// Example static offers; in production pull from Sheets or KV
const OFFERS = [
  { id: "A1", title: "Starter Offer", min_scale: 1, weight_base: 10, base_rate: 1.2 },
  { id: "B2", title: "Growth Offer",  min_scale: 3, weight_base: 7,  base_rate: 2.0 },
  { id: "C3", title: "Elite Offer",   min_scale: 5, weight_base: 5,  base_rate: 3.5 },
];

exports.handler = async (event) => {
  try {
    const me = await requireAuth(event, { minRole: "user" });
    const scale = Number(me.scale || 1);

    const eligible = OFFERS
      .filter(o => scale >= o.min_scale)
      .map(o => ({
        ...o,
        weight: o.weight_base * scale,
        payout: Number((o.base_rate * scale).toFixed(2)),
      }));

    return json(200, { ok: true, offers: eligible, scale });
  } catch (e) {
    return json(e.code || 401, { ok: false, error: e.message });
  }
};