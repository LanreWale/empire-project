import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Shell from "./layout/Shell.jsx";
import Monitoring from "./tabs/Monitoring.jsx";

const Dash = () => <h2>Dashboard</h2>;
const CPA = () => <h2>CPA Accounts</h2>;
const Users = () => <h2>Users</h2>;
const Analytics = () => <h2>Analytics</h2>;
const Wallet = () => <h2>Payments / Wallet</h2>;
const Security = () => <h2>Security</h2>;

function Guard({ children }) {
  const ok = localStorage.getItem("empire.auth") === "commander_ok";
  return ok ? children : <Navigate to="/login" replace />;
}

function Login() {
  const [key, setKey] = React.useState("");
  const EXPECTED = import.meta.env.VITE_COMMANDER_KEY || "THE_GENERALISIMO";
  function submit(e){ e.preventDefault();
    if ((key||"").trim() === EXPECTED) {
      localStorage.setItem("empire.auth","commander_ok");
      location.replace("/dashboard");
    } else alert("Invalid access key.");
  }
  return (
    <div style={{minHeight:"100vh",display:"grid",placeItems:"center",background:"#0b1424",color:"#fff"}}>
      <form onSubmit={submit} style={{background:"#0f172a",padding:24,borderRadius:16,width:360}}>
        <h2>⚔️ The Empire Login</h2>
        <input type="password" value={key} onChange={e=>setKey(e.target.value)}
          placeholder="Commander key" style={{width:"100%",padding:"10px 12px",borderRadius:10,marginTop:10,border:"1px solid #1f2a44",background:"#0b1320",color:"#e6f1ff"}}/>
        <button style={{width:"100%",marginTop:12,padding:"10px 12px",borderRadius:10,border:"none",fontWeight:700,background:"#4cc9f0",color:"#001219"}}>Enter</button>
      </form>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<Login />} />
      <Route element={<Guard><Shell /></Guard>}>
        <Route path="/dashboard" element={<Dash />} />
        <Route path="/cpa" element={<CPA />} />
        <Route path="/users" element={<Users />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/wallet" element={<Wallet />} />
        <Route path="/security" element={<Security />} />
        <Route path="/monitoring" element={<Monitoring />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}