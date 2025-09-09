import React from "react";
import useFetch from "../lib/useFetch";
import { getUsers } from "../lib/gas";

export default function Users(){
  const { data, error, loading } = useFetch(() => getUsers(500), []);
  return (
    <div style={{padding:16}}>
      <h2>Users</h2>
      {loading && <p>Loading…</p>}
      {error && <p style={{color:"crimson"}}>Error: {error}</p>}
      {Array.isArray(data?.rows) && data.rows.length > 0 ? (
        <table style={tbl}><thead><tr>
          <Th>Name</Th><Th>Email</Th><Th>Country</Th><Th>Authority</Th><Th>Status</Th>
        </tr></thead><tbody>
          {data.rows.map((r,i)=>(
            <tr key={i}>
              <Td>{r.name||""}</Td>
              <Td>{r.email||""}</Td>
              <Td>{r.country||""}</Td>
              <Td>{r.role||r.authority||""}</Td>
              <Td>{r.status||""}</Td>
            </tr>
          ))}
        </tbody></table>
      ) : <p>No users found.</p>}
    </div>
  );
}
const tbl = { width:"100%", borderCollapse:"collapse", background:"#0b1320", borderRadius:12, overflow:"hidden" };
const Th = ({children}) => <th style={{textAlign:"left",padding:"10px 12px",borderBottom:"1px solid #1f2a44",color:"#8fb0ff"}}>{children}</th>;
const Td = ({children}) => <td style={{padding:"10px 12px",borderBottom:"1px solid #16233d"}}>{children}</td>;