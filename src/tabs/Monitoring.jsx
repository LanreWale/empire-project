// src/tabs/Monitoring.jsx
import React, { useEffect, useState } from "react";
import { ping, forceSync, getSummary, GAS } from "../lib/gas";

export default function Monitoring() {
  const [health, setHealth] = useState(null);
  const [summary, setSummary] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function run(label, fn) {
    setBusy(label);
    setError("");
    try {
      const data = await fn();
      if (label === "Test APIs") setHealth(data);
      if (label === "Force Sync") {
        // refresh summary after sync
        try { setSummary(await getSummary()); } catch {}
      }
      alert(`${label}: OK`);
    } catch (e) {
      console.error(e);
      setError(`${label} failed: ${e.message}`);
      alert(`${label}: FAILED`);
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    // auto health + summary on load
    (async () => {
      try { setHealth(await ping()); } catch (e) { setError(`Health check: ${e.message}`); }
      try { setSummary(await getSummary()); } catch {}
    })();
  }, []);

  return (
    <div style={{ padding: "16px" }}>
      <h2>⚔️ Monitoring</h2>
      <p style={{ margin: "6px 0" }}>
        GAS Endpoint: <code>{GAS}</code>
      </p>

      <div style={{ display: "flex", gap: 12, margin: "12px 0" }}>
        <button
          id="btnTestApis"
          disabled={!!busy}
          onClick={() => run("Test APIs", ping)}
        >
          {busy === "Test APIs" ? "Testing…" : "Test APIs"}
        </button>

        <button
          id="btnForceSync"
          disabled={!!busy}
          onClick={() => run("Force Sync", forceSync)}
        >
          {busy === "Force Sync" ? "Syncing…" : "Force Sync"}
        </button>
      </div>

      {error && (
        <div style={{ color: "crimson", marginTop: 8 }}>
          {error}
        </div>
      )}

      <section style={{ marginTop: 16 }}>
        <h3>Health</h3>
        <pre style={{ background: "#111", color: "#0f0", padding: 12, borderRadius: 8, overflow: "auto" }}>
{JSON.stringify(health, null, 2)}
        </pre>
      </section>

      <section style={{ marginTop: 16 }}>
        <h3>Summary</h3>
        <pre style={{ background: "#111", color: "#0f0", padding: 12, borderRadius: 8, overflow: "auto" }}>
{JSON.stringify(summary, null, 2)}
        </pre>
      </section>
    </div>
  );
}