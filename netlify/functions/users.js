import { preflight, json, fail, buildUrl, fetchJson } from './_util.js';

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return preflight(event);
  try {
    const url = buildUrl('users');
    const data = await fetchJson(url);
    if (!Array.isArray(data)) {
      return fail('No users array found. Check GAS route=users output.', 500, {
        preview: Object.keys(data || {}).slice(0, 8),
      });
    }
    return json({ ok: true, users: data });
  } catch (err) {
    return fail(String(err));
  }
};
