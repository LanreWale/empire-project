import React from "react";

const GAS = "https://script.google.com/macros/s/AKfycbx5FniYFG6YWADrBbfkzVmsGBeqh4Je28x-doOePGC2yolON_C8quh42_gpSdrV9eru/exec";
const PASS = "GENERALISIMO@2025";

const fmtMoney = (n) =>
  Number(n ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtInt = (n) => Number(n ?? 0).toLocaleString();
const fmtPct = (n) => `${Number(n ?? 0).toFixed(2)}%`;

async function fetchMetrics() {
  const u = new URL(GAS);
  u.searchParams.set("action", "commanderMetrics");
  u.searchParams.set("pass", PASS);
  const r = await fetch(u, { headers: { "Cache-Control":"no-cache" } });
  const j = await r.json();
  if (!r.ok || j?.ok === false) throw new Error(j?.error || `HTTP ${r.status}`);
  return j.data || j;
}

export default function Dashboard() {
  const [data, setData] = React.useState(null);
  const [err, setErr] = React.useState("");

  React.useEffect(() => {
    fetchMetrics().then(setData).catch(e => setErr(String(e.message || e)));
  }, []);

  if (err) return <div style={{color:"#ffb4a2"}}>Error: {err}</div>;
  if (!data) return <div style={{opacity:.7}}>Loading metrics…</div>;

  const totalEarnings = data.totalEarnings ?? data.total ?? 0;
  const activeUsers   = data.activeUsers   ?? 0;
  const convRate      = data.conversionRate ?? 0;
  const totalClicks   = data.totalClicks ?? 0;
  const updatedAt     = data.updatedAt ?? "";

  const card = { background:"#0b1320", border:"1px solid #15243d", borderRadius:16, padding:16, minHeight:120 };

  return (
    <div style={{ padding: 16 }}>
      <h2 style={{color:"#8ab4f8", margin:"0 0 14px"}}>SUPREME COMMAND DASHBOARD — LIVE</h2>

      <div style={{display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(260px,1fr))", gap:16}}>
        <div style={card}>
          <div style={{opacity:.7}}>Total Earnings</div>
          <div style={{fontSize:28, fontWeight:800, color:"#00ff95"}}>${fmtMoney(totalEarnings)}</div>
        </div>
        <div style={card}>
          <div style={{opacity:.7}}>Active Users</div>
          <div style={{fontSize:28, fontWeight:800, color:"#4cc9f0"}}>{fmtInt(activeUsers)}</div>
        </div>
        <div style={card}>
          <div style={{opacity:.7}}>Conversion Rate</div>
          <div style={{fontSize:28, fontWeight:800, color:"#7cffea"}}>{fmtPct(convRate)}</div>
        </div>
        <div style={card}>
          <div style={{opacity:.7}}>Total Clicks</div>
          <div style={{fontSize:28, fontWeight:800, color:"#c0f"}}>{fmtInt(totalClicks)}</div>
        </div>
      </div>

      <div style={{marginTop:10, opacity:.6, fontSize:12}}>UPDATED {updatedAt}</div>
    </div>
  );
}
