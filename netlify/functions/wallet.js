// netlify/functions/wallet.js
// Minimal wallet endpoint that returns JSON the dashboard expects.

exports.handler = async (event) => {
  try {
    // You can change/extend this list or later wire it to Sheets.
    const items = [
      { date: "2025-08-22T10:30:00Z", amount: 500.00,  method: "Payoneer",      status: "Completed" },
      { date: "2025-08-21T15:05:00Z", amount: -200.00, method: "Bank Transfer",  status: "Pending"   },
      { date: "2025-08-20T09:00:00Z", amount: 150.00,  method: "Stripe",         status: "Completed" },
    ];

    const inflow  = items.filter(x => x.amount > 0).reduce((a,b)=>a+b.amount, 0);
    const outflow = items.filter(x => x.amount < 0).reduce((a,b)=>a+Math.abs(b.amount), 0);
    const net     = inflow - outflow;

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ok: true, inflow, outflow, net, items }),
    };
  } catch (e) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ok: false, error: String(e) }),
    };
  }
};