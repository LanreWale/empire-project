import React from "react";
import useFetch from "../lib/useFetch";
import { ping } from "../lib/gas";

export default function Security(){
  const { data, error, loading } = useFetch(ping, []);
  return (
    <div style={{padding:16}}>
      <h2>Security</h2>
      {loading && <p>Loading…</p>}
      {error && <p style={{color:"crimson"}}>Error: {error}</p>}
      {data && <pre style={pre}>{JSON.stringify(data,null,2)}</pre>}
    </div>
  );
}
const pre = { background:"#0b1320", padding:12, borderRadius:10, border:"1px solid #1f2a44", overflow:"auto" };