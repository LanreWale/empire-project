import React from "react";

const GAS = "https://script.google.com/macros/s/AKfycbx5FniYFG6YWADrBbfkzVmsGBeqh4Je28x-doOePGC2yolON_C8quh42_gpSdrV9eru/exec";
const PASS = "GENERALISIMO@2025";

async function listCPAAccounts() {
  const u = new URL(GAS);
  u.searchParams.set("action","listCPAAccounts");
  u.searchParams.set("pass", PASS);
  const r = await fetch(u); const j = await r.json();
  if (!r.ok || j?.ok === false) throw new Error(j?.error || `HTTP ${r.status}`);
  return j.data || j.items || [];
}

export default function CPA(){
  const [rows,setRows] = React.useState(null);
  const [err,setErr] = React.useState("");

  React.useEffect(()=>{ listCPAAccounts().then(setRows).catch(e=>setErr(String(e.message||e))); },[]);

  return (
    <div style={{padding:16}}>
      <h2>CPA Accounts</h2>
      {err && <div style={{color:"crimson"}}>{err}</div>}
      {!rows && !err && <div>Loading…</div>}
      {rows && rows.length===0 && <div>No accounts yet.</div>}
      {rows && rows.length>0 && (
        <table style={{width:"100%", borderCollapse:"collapse"}}>
          <thead>
            <tr>
              <th style={{textAlign:"left",borderBottom:"1px solid #213"}}>Network</th>
              <th style={{textAlign:"left",borderBottom:"1px solid #213"}}>Account</th>
              <th style={{textAlign:"left",borderBottom:"1px solid #213"}}>Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r,i)=>(
              <tr key={i}>
                <td style={{padding:"6px 4px"}}>{r.network || r.Network || "-"}</td>
                <td style={{padding:"6px 4px"}}>{r.account || r.Account || "-"}</td>
                <td style={{padding:"6px 4px"}}>{r.status || r.Status || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}