const { getJSON } = require('./lib/fetchFromSheet');
const { jsonOK, jsonError, preflight } = require('./lib/http');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return preflight();
  try {
    const d = await getJSON('PENDING');
    const pending = Array.isArray(d?.users) ? d.users : Array.isArray(d?.pending) ? d.pending : Array.isArray(d) ? d : [];
    return jsonOK({ ok:true, users: pending, pendingReviews: pending.length });
  } catch (e) {
    return jsonError(e.message || e, 500);
  }
};
