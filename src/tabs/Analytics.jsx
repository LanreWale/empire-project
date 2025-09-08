import React from "react";
import useFetch from "../lib/useFetch";
import { analyticsOv, analyticsMon, analyticsGeo, fmt } from "../lib/gas";

export default function Analytics(){
  const ov  = useFetch(analyticsOv,  []);
  const mon = useFetch(analyticsMon, []);
  const geo = useFetch(analyticsGeo, []);
  if (ov.loading || mon.loading || geo.loading) return <Wrap>Loading…</Wrap>;
  if (ov.error)  return <Wrap error>Error: {ov.error}</Wrap>;
  if (mon.error) return <Wrap error>Error: {mon.error}</Wrap>;
  if (geo.error) return <Wrap error>Error: {geo.error}</Wrap>;

  return (
    <Wrap>
      <h2>ANALYTICS</h2>
      <Stat label="Total Revenue (12m)" value={fmt.money(ov.data?.total)} />

      <h3 style={{marginTop:12}}>Revenue — Monthly</h3>
      <table className="tbl">
        <thead><tr><th>Year</th><th>Month</th><th>Amount</th></tr></thead>
        <tbody>{(mon.data?.rows||[]).map((r,i)=><tr key={i}><td>{r.year}</td><td>{r.month}</td><td>{fmt.money(r.amount)}</td></tr>)}</tbody>
      </table>

      <h3 style={{marginTop:12}}>Revenue — By Country</h3>
      <table className="tbl">
        <thead><tr><th>Country</th><th>Amount</th></tr></thead>
        <tbody>{(geo.data?.rows||[]).map((r,i)=><tr key={i}><td>{r.country}</td><td>{fmt.money(r.amount)}</td></tr>)}</tbody>
      </table>
    </Wrap>
  );
}
function Wrap({children,error}){ return <div style={{padding:16,color:error?"#f88":"#e8f1ff"}}>{children}</div>; }
function Stat({label,value}){ return <div style={{margin:"8px 0",background:"#0e1729",padding:12,borderRadius:10,border:"1px solid #1f2a44"}}><div style={{opacity:.7,fontSize:12}}>{label}</div><div style={{fontSize:22,fontWeight:800}}>{value}</div></div>; }