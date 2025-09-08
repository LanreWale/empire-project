import React from "react";
import { Link, Outlet, useLocation } from "react-router-dom";

const Item = ({ to, label }) => {
  const { pathname } = useLocation();
  const active = pathname === to;
  return (
    <Link to={to}
      style={{display:"block",padding:"10px 14px",textDecoration:"none",
        color: active ? "#4cc9f0" : "#e6e6e6", fontWeight: active ? 700 : 500}}>
      {label}
    </Link>
  );
};

export default function Shell() {
  function logout(){
    localStorage.removeItem("empire.auth");
    location.replace("/login");
  }
  return (
    <div style={{display:"grid",gridTemplateColumns:"240px 1fr",minHeight:"100vh",
                 background:"linear-gradient(120deg,#061326,#000)"}}>
      <aside style={{borderRight:"1px solid #13213a",padding:12}}>
        <div style={{color:"#8ab4f8",fontWeight:800,letterSpacing:1,marginBottom:12}}>THE EMPIRE</div>
        <Item to="/dashboard" label="Dashboard" />
        <Item to="/cpa" label="CPA Accounts" />
        <Item to="/users" label="Users" />
        <Item to="/analytics" label="Analytics" />
        <Item to="/wallet" label="Payments / Wallet" />
        <Item to="/security" label="Security" />
        <Item to="/monitoring" label="Monitoring" />
        <a href="/legacy/dashboard.html" style={{display:"block",marginTop:12,opacity:.55}}>Emergency Launch</a>
        <button onClick={logout} style={{marginTop:10,padding:"8px 10px",borderRadius:8,border:"1px solid #22324f",background:"#0b1320",color:"#cde1ff"}}>Logout</button>
      </aside>
      <main style={{padding:18}}><Outlet /></main>
    </div>
  );
}