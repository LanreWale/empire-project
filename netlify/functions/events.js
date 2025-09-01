import { preflight, json, fail, buildUrl, fetchJson } from './_util.js';

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return preflight(event);
  try {
    const url = buildUrl('events');
    const data = await fetchJson(url);
    if (!Array.isArray(data)) {
      return fail('No events array found. Check GAS route=events output.', 500, {
        preview: Object.keys(data || {}).slice(0, 8),
      });
    }
    return json({ ok: true, events: data });
  } catch (err) {
    return fail(String(err));
  }
};
