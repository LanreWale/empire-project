import React from "react";
import { listCPAAccounts } from "../lib/gas";

export default function CPA() {
  const [rows, setRows] = React.useState(null);
  const [err, setErr] = React.useState("");
  React.useEffect(() => { (async () => {
    try { setRows(await listCPAAccounts()); } catch(e){ setErr(e.message); }
  })(); }, []);
  return (
    <Tab title="CPA Accounts" err={err} data={rows} />
  );
}

function Tab({ title, err, data }) {
  return (
    <div style={{ padding:16 }}>
      <h2>{title}</h2>
      {err && <div style={{ color:"crimson" }}>Unknown action</div>}
      <pre style={{ background:"#0b1320", color:"#7fffa0", padding:12, borderRadius:8, overflow:"auto" }}>
{JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
}