exports.handler = async (event) => {
  const axios = require("./lib/http");
  try {
    const r = await axios.get("https://api.paystack.co/bank?country=nigeria");
    let list = r.data?.data || [];
    const q = (event.queryStringParameters?.q || "").toLowerCase();
    if (q) list = list.filter(b => (b.name||"").toLowerCase().includes(q));
    return { statusCode: 200, body: JSON.stringify({ count: list.length, banks: list }) };
  } catch (e) {
    const code = e.response?.status || 500;
    return { statusCode: code, body: JSON.stringify({ error: e.response?.data || e.message }) };
  }
};
