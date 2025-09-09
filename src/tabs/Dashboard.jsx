import React from "react";
import useFetch from "../lib/useFetch";
import { getSummary } from "../lib/gas";

export default function Dashboard(){
  const { data, error, loading } = useFetch(getSummary, []);
  const fmt2 = (n) => (Number(n||0)).toFixed(2);

  return (
    <div style={{padding:16}}>
      <h2>Dashboard Overview</h2>
      {loading && <p>Loading…</p>}
      {error && <p style={{color:"crimson"}}>Error: {error}</p>}
      {data && (
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,minmax(0,1fr))",gap:12}}>
          <Card title="Total Earnings"  value={`$ ${fmt2(data.totalEarnings)}`} />
          <Card title="Active Users"    value={data.activeUsers||0} />
          <Card title="Approval Rate"   value={`${(Number(data.approvalRate)||0).toFixed(2)}%`} />
        </div>
      )}
    </div>
  );
}
function Card({title,value}) {
  return <div style={{background:"#0f172a",border:"1px solid #1f2a44",borderRadius:12,padding:16}}>
    <div style={{color:"#9fb3c8",fontSize:12,marginBottom:6}}>{title}</div>
    <div style={{fontWeight:800,fontSize:22}}>{value}</div>
  </div>;
}