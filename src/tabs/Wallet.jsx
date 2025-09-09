import React from "react";
import useFetch from "../lib/useFetch";
import { getWalletReport } from "../lib/gas";

export default function Wallet(){
  const { data, error, loading } = useFetch(() => getWalletReport(300), []);
  const fmt2 = (n) => (Number(n||0)).toFixed(2);

  return (
    <div style={{padding:16}}>
      <h2>Payments / Wallet</h2>
      {loading && <p>Loading…</p>}
      {error && <p style={{color:"crimson"}}>Error: {error}</p>}
      {data?.overview && (
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,minmax(0,1fr))",gap:12,marginBottom:12}}>
          <Card title="Available Balance" value={`$ ${fmt2(data.overview.available)}`} />
          <Card title="Pending Withdrawals" value={`$ ${fmt2(data.overview.pending)}`} />
          <Card title="Total Withdrawn" value={`$ ${fmt2(data.overview.totalWithdrawn)}`} />
        </div>
      )}
      {Array.isArray(data?.rows) && data.rows.length > 0 ? (
        <table style={tbl}><thead><tr>
          <Th>Date</Th><Th>Type</Th><Th>Amount ($)</Th><Th>Status</Th><Th>Reference</Th>
        </tr></thead><tbody>
          {data.rows.map((r,i)=>(
            <tr key={i}>
              <Td>{r.date||""}</Td>
              <Td>{r.type||""}</Td>
              <Td>{fmt2(r.amount)}</Td>
              <Td>{r.status||""}</Td>
              <Td>{r.ref||r.reference||""}</Td>
            </tr>
          ))}
        </tbody></table>
      ) : <p>No wallet records.</p>}
    </div>
  );
}
function Card({title,value}) {
  return <div style={{background:"#0f172a",border:"1px solid #1f2a44",borderRadius:12,padding:16}}>
    <div style={{color:"#9fb3c8",fontSize:12,marginBottom:6}}>{title}</div>
    <div style={{fontWeight:800,fontSize:22}}>{value}</div>
  </div>;
}
const tbl = { width:"100%", borderCollapse:"collapse", background:"#0b1320", borderRadius:12, overflow:"hidden" };
const Th = ({children}) => <th style={{textAlign:"left",padding:"10px 12px",borderBottom:"1px solid #1f2a44",color:"#8fb0ff"}}>{children}</th>;
const Td = ({children}) => <td style={{padding:"10px 12px",borderBottom:"1px solid #16233d"}}>{children}</td>;