import React from "react";
import useFetch from "../lib/useFetch";
import { getCPAAccounts } from "../lib/gas";

export default function CPA(){
  const { data, error, loading } = useFetch(() => getCPAAccounts(200), []);
  return (
    <div style={{padding:16}}>
      <h2>CPA Accounts</h2>
      {loading && <p>Loading…</p>}
      {error && <p style={{color:"crimson"}}>Error: {error}</p>}
      {Array.isArray(data?.rows) && data.rows.length > 0 ? (
        <table style={tbl}><thead><tr>
          <Th>ID</Th><Th>Network</Th><Th>Status</Th><Th>Earnings ($)</Th><Th>Active Offers</Th>
        </tr></thead><tbody>
          {data.rows.map((r,i)=>(
            <tr key={i}>
              <Td>{r.id||""}</Td>
              <Td>{r.network||""}</Td>
              <Td>{r.status||""}</Td>
              <Td>{(Number(r.earnings)||0).toFixed(2)}</Td>
              <Td>{r.activeOffers||0}</Td>
            </tr>
          ))}
        </tbody></table>
      ) : <p>No CPA accounts found.</p>}
    </div>
  );
}
const tbl = { width:"100%", borderCollapse:"collapse", background:"#0b1320", borderRadius:12, overflow:"hidden" };
const Th = ({children}) => <th style={{textAlign:"left",padding:"10px 12px",borderBottom:"1px solid #1f2a44",color:"#8fb0ff"}}>{children}</th>;
const Td = ({children}) => <td style={{padding:"10px 12px",borderBottom:"1px solid #16233d"}}>{children}</td>;