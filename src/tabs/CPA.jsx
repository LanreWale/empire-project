import React from "react";
import useFetch from "../lib/useFetch";
import { cpaAccounts, fmt } from "../lib/gas";

export default function CPA(){
  const { data, error, loading } = useFetch(cpaAccounts, []);
  if (loading) return <Wrap>Loading…</Wrap>;
  if (error)   return <Wrap error>Error: {error}</Wrap>;
  const rows = data?.rows || [];
  return (
    <Wrap>
      <h2>CPA ACCOUNTS</h2>
      <table className="tbl">
        <thead><tr>
          <th>AccountID</th><th>Network</th><th>Status</th><th>Active Offers</th><th>Revenue</th><th>Clicks</th><th>Conversion</th>
        </tr></thead>
        <tbody>
          {rows.map((r,i)=>(
            <tr key={i}>
              <td>{r.accountId}</td>
              <td>{r.network}</td>
              <td>{r.status}</td>
              <td>{fmt.int(r.activeOffers)}</td>
              <td>{fmt.money(r.revenue)}</td>
              <td>{fmt.int(r.clicks)}</td>
              <td>{fmt.pct(r.conversion*100)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Wrap>
  );
}
function Wrap({children,error}){ return <div style={{padding:16,color:error?"#f88":"#e8f1ff"}}>{children}</div>; }