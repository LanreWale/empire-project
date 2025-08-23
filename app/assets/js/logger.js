import { postJSON, ENDPOINTS } from "./api.js";

/** Central event logger; call from any page */
export async function logEvent({ type, message, ref = "", actor = "system", meta = {} }) {
  try {
    await postJSON(ENDPOINTS.feed, { type, message, ref, actor, meta });
  } catch (e) {
    console.warn("logEvent failed", e);
  }
}