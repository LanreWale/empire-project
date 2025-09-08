import React from "react";

const GAS = "https://script.google.com/macros/s/AKfycbx5FniYFG6YWADrBbfkzVmsGBeqh4Je28x-doOePGC2yolON_C8quh42_gpSdrV9eru/exec";
const PASS = "GENERALISIMO@2025";

async function securityOverview() {
  const u = new URL(GAS);
  u.searchParams.set("action","securityOverview");
  u.searchParams.set("pass", PASS);
  const r = await fetch(u); const j = await r.json();
  if (!r.ok || j?.ok === false) throw new Error(j?.error || `HTTP ${r.status}`);
  return j.data || j;
}

export default function Security(){
  const [data,setData] = React.useState(null);
  const [err,setErr] = React.useState("");

  React.useEffect(()=>{ securityOverview().then(setData).catch(e=>setErr(String(e.message||e))); },[]);

  return (
    <div style={{padding:16}}>
      <h2>Security</h2>
      {err && <div style={{color:"crimson"}}>{err}</div>}
      {!data && !err && <div>Loading…</div>}
      {data && (
        <pre style={{background:"#0b1320",border:"1px solid #15243d",borderRadius:12,padding:14,overflow:"auto"}}>
{JSON.stringify(data, null, 2)}
        </pre>
      )}
    </div>
  );
}