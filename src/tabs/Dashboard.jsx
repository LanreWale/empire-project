import React from "react";
import useFetch from "../lib/useFetch";
import { overview, fmt } from "../lib/gas";

export default function Dashboard(){
  const { data, error, loading } = useFetch(overview, []);
  if (loading) return <Pad>Loading…</Pad>;
  if (error)   return <Pad error>Error: {error}</Pad>;
  const o = data || {};
  return (
    <Pad>
      <h2>SUPREME COMMAND DASHBOARD</h2>
      <Stat label="Total Earnings" value={fmt.money(o.totalEarnings)} />
      <Stat label="Active Users"   value={fmt.int(o.activeUsers)} />
      <Stat label="Conversion Rate" value={fmt.pct(o.conversionRate * 100)} />
      <Stat label="Total Clicks"   value={fmt.int(o.clicks)} />
    </Pad>
  );
}

function Pad({children,error}){ return <div style={{padding:16,color:error?"#f88":"#e8f1ff"}}>{children}</div>; }
function Stat({label,value}){
  return (
    <div style={{margin:"12px 0",background:"#0e1729",padding:16,borderRadius:12,border:"1px solid #1f2a44"}}>
      <div style={{opacity:.7,fontSize:12}}>{label}</div>
      <div style={{fontSize:28,fontWeight:800,marginTop:6}}>{value}</div>
    </div>
  );
}