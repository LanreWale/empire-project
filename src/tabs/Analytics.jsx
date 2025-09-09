import React from "react";
import useFetch from "../lib/useFetch";
import { getRevenueMonthly, getRevenueGeo } from "../lib/gas";

export default function Analytics(){
  const m = useFetch(getRevenueMonthly, []);
  const g = useFetch(getRevenueGeo, []);
  const fmt2 = (n) => (Number(n||0)).toFixed(2);

  return (
    <div style={{padding:16}}>
      <h2>Analytics</h2>

      <h3 style={{marginTop:16}}>Revenue (Monthly)</h3>
      {m.loading && <p>Loading…</p>}
      {m.error && <p style={{color:"crimson"}}>Error: {m.error}</p>}
      {Array.isArray(m.data?.rows) && m.data.rows.length>0 ? (
        <table style={tbl}><thead><tr><Th>Month</Th><Th>Revenue ($)</Th></tr></thead><tbody>
          {m.data.rows.map((r,i)=>(
            <tr key={i}><Td>{r.month||r.label||""}</Td><Td>{fmt2(r.revenue||r.amount)}</Td></tr>
          ))}
        </tbody></table>
      ) : <p>No monthly revenue.</p>}

      <h3 style={{marginTop:24}}>Revenue by Geo</h3>
      {g.loading && <p>Loading…</p>}
      {g.error && <p style={{color:"crimson"}}>Error: {g.error}</p>}
      {Array.isArray(g.data?.rows) && g.data.rows.length>0 ? (
        <table style={tbl}><thead><tr><Th>Country</Th><Th>Revenue ($)</Th></tr></thead><tbody>
          {g.data.rows.map((r,i)=>(
            <tr key={i}><Td>{r.country||r.label||""}</Td><Td>{fmt2(r.revenue||r.amount)}</Td></tr>
          ))}
        </tbody></table>
      ) : <p>No geo revenue.</p>}
    </div>
  );
}
const tbl = { width:"100%", borderCollapse:"collapse", background:"#0b1320", borderRadius:12, overflow:"hidden", marginTop:8 };
const Th = ({children}) => <th style={{textAlign:"left",padding:"10px 12px",borderBottom:"1px solid #1f2a44",color:"#8fb0ff"}}>{children}</th>;
const Td = ({children}) => <td style={{padding:"10px 12px",borderBottom:"1px solid #16233d"}}>{children}</td>;