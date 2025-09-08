import React from "react";
import { getSummary } from "../lib/gas";

const fmt2 = (n) =>
  Number(n ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function Dashboard() {
  const [data, setData] = React.useState(null);
  const [err, setErr] = React.useState("");

  React.useEffect(() => {
    (async () => {
      try { setData(await getSummary()); }
      catch (e) { setErr(e.message || "Failed to fetch"); }
    })();
  }, []);

  return (
    <div style={{ padding: 16 }}>
      <h2>🛡️ Dashboard</h2>
      {err && <div style={{ color: "crimson" }}>Error: {err}</div>}
      {!data ? <div>Loading…</div> : (
        <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
          <Card title="Total Earnings" value={`$${fmt2(data.totalUsd)}`} />
          <Card title="Active Users" value={String(data.activeUsers ?? 0)} />
          <Card title="Conversion Rate" value={`${fmt2((data.convRate ?? 0) * 100)}%`} />
          <Card title="Total Clicks" value={Number(data.totalClicks ?? 0).toLocaleString()} />
        </div>
      )}
    </div>
  );
}

function Card({ title, value }) {
  return (
    <div style={{ background: "#0f172a", borderRadius: 12, padding: 16 }}>
      <div style={{ opacity: .8 }}>{title}</div>
      <div style={{ fontSize: 28, fontWeight: 800, marginTop: 6, color: "#39ff88" }}>{value}</div>
    </div>
  );
}