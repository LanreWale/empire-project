import React from "react";
import useFetch from "../lib/useFetch";
import { usersList, fmt } from "../lib/gas";

export default function Users(){
  const { data, error, loading } = useFetch(usersList, []);
  if (loading) return <Wrap>Loading…</Wrap>;
  if (error)   return <Wrap error>Error: {error}</Wrap>;
  const rows = data?.rows || [];
  return (
    <Wrap>
      <h2>USERS</h2>
      <table className="tbl">
        <thead><tr>
          <th>UserID</th><th>Name</th><th>Email</th><th>Phone</th><th>Level</th>
          <th>Earnings</th><th>Override</th><th>Performance</th><th>Status</th><th>Last Action</th>
        </tr></thead>
        <tbody>
          {rows.map((r,i)=>(
            <tr key={i}>
              <td>{r.userId}</td><td>{r.name}</td><td>{r.email}</td><td>{r.phone}</td><td>{r.level}</td>
              <td>{fmt.money(r.earnings)}</td><td>{fmt.money(r.override)}</td><td>{r.performance}</td><td>{r.status}</td><td>{r.lastActionAt}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Wrap>
  );
}
function Wrap({children,error}){ return <div style={{padding:16,color:error?"#f88":"#e8f1ff"}}>{children}</div>; }