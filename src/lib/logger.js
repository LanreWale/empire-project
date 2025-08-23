// src/lib/logger.js
export async function logEvent({ type, message, ref = "", actor = "system", meta = {} }) {
  try {
    await fetch("/.netlify/functions/monitor-feed", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, message, ref, actor, meta }),
    });
  } catch (err) {
    console.error("Failed to log event", err);
  }
}