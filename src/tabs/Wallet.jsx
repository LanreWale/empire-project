import React from "react";
const GAS = "https://script.google.com/macros/s/AKfycbx5FniYFG6YWADrBbfkzVmsGBeqh4Je28x-doOePGC2yolON_C8quh42_gpSdrV9eru/exec";
const PASS = "GENERALISIMO@2025";

const fmtMoney = (n) =>
  Number(n ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

async function walletOverview() {
  const u = new URL(GAS);
  u.searchParams.set("action","walletOverview");
  u.searchParams.set("pass", PASS);
  const r = await fetch(u); const j = await r.json();
  if (!r.ok || j?.ok === false) throw new Error(j?.error || `HTTP ${r.status}`);
  return j.data || j;
}

export default function Wallet(){
  const [data,setData] = React.useState(null);
  const [err,setErr] = React.useState("");

  React.useEffect(()=>{ walletOverview().then(setData).catch(e=>setErr(String(e.message||e))); },[]);

  return (
    <div style={{padding:16}}>
      <h2>Payments / Wallet</h2>
      {err && <div style={{color:"crimson"}}>{err}</div>}
      {!data && !err && <div>Loading…</div>}
      {data && (
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:12}}>
          <Stat label="Balance" value={`$${fmtMoney(data.balance ?? 0)}`} />
          <Stat label="Payouts Pending" value={`$${fmtMoney(data.payoutsPending ?? 0)}`} />
          <Stat label="Payouts Completed" value={`$${fmtMoney(data.payoutsCompleted ?? 0)}`} />
        </div>
      )}
    </div>
  );
}

function Stat({label,value}){
  return (
    <div style={{background:"#0b1320",border:"1px solid #15243d",borderRadius:12,padding:14}}>
      <div style={{opacity:.7}}>{label}</div>
      <div style={{fontSize:26,fontWeight:800,color:"#00ff95"}}>{value}</div>
    </div>
  );
}
