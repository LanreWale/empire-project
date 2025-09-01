import { preflight, json, fail, buildUrl, fetchJson } from './_util.js';

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return preflight(event);
  try {
    const url = buildUrl('');
    const s = await fetchJson(url);
    return json({
      ok: true,
      totalEarnings: s.totalEarnings ?? 0,
      activeUsers: s.activeUsers ?? 0,
      approvalRate: s.approvalRate ?? 0,
      pendingReviews: s.pendingReviews ?? 0,
    });
  } catch (err) {
    return fail(String(err));
  }
};
