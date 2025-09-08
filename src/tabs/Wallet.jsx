import React from "react";
import useFetch from "../lib/useFetch";
import { walletSummary, walletHistory, fmt } from "../lib/gas";

export default function Wallet(){
  const o  = useFetch(walletSummary, []);
  const hi = useFetch(walletHistory, []);
  if (o.loading || hi.loading) return <Wrap>Loading…</Wrap>;
  if (o.error)  return <Wrap error>Error: {o.error}</Wrap>;
  if (hi.error) return <Wrap error>Error: {hi.error}</Wrap>;
  const rows = hi.data?.rows || [];
  const s = o.data || {};
  return (
    <Wrap>
      <h2>WALLET</h2>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:12}}>
        <Card label="Total In"  value={fmt.money(s.totalIn)} />
        <Card label="Total Out" value={fmt.money(s.totalOut)} />
        <Card label="Balance"   value={fmt.money(s.balance)} />
      </div>
      <h3 style={{marginTop:16}}>Transactions</h3>
      <table className="tbl">
        <thead><tr><th>Time</th><th>Amount</th><th>Method</th><th>Status</th><th>Direction</th><th>Name</th><th>Email</th><th>Phone</th></tr></thead>
        <tbody>{rows.map((r,i)=>(
          <tr key={i}><td>{r.time}</td><td>{fmt.money(r.amount)}</td><td>{r.method}</td><td>{r.status}</td><td>{r.direction}</td><td>{r.name}</td><td>{r.email}</td><td>{r.phone}</td></tr>
        ))}</tbody>
      </table>
    </Wrap>
  );
}
function Wrap({children,error}){ return <div style={{padding:16,color:error?"#f88":"#e8f1ff"}}>{children}</div>; }
function Card({label,value}){ return <div style={{background:"#0e1729",padding:14,borderRadius:12,border:"1px solid #1f2a44"}}><div style={{opacity:.7,fontSize:12}}>{label}</div><div style={{fontSize:22,fontWeight:800}}>{value}</div></div>; }