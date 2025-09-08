import React from "react";
import useFetch from "../lib/useFetch";
import { securityOv } from "../lib/gas";

export default function Security(){
  const { data, error, loading } = useFetch(securityOv, []);
  if (loading) return <Wrap>Loading…</Wrap>;
  if (error)   return <Wrap error>Error: {error}</Wrap>;
  const s = data || {};
  return (
    <Wrap>
      <h2>SECURITY</h2>
      <ul>
        <li>Alerts (24h): <b>{s.alerts24h}</b></li>
        <li>Failed Logins: <b>{s.failedLogins}</b></li>
        <li>Blocks: <b>{s.blocks}</b></li>
      </ul>
    </Wrap>
  );
}
function Wrap({children,error}){ return <div style={{padding:16,color:error?"#f88":"#e8f1ff"}}>{children}</div>; }