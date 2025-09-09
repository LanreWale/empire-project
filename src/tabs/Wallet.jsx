// src/tabs/Wallet.jsx
import React, { useEffect, useMemo, useState } from "react";
import { listBanks } from "../lib/gas";

export default function Wallet(){
  const [banks, setBanks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [sel, setSel] = useState({ bankCode:"", amount:"", method:"bank" });
  const [error, setError] = useState("");

  useEffect(() => {
    let on = true;
    (async () => {
      try{
        setLoading(true); setError("");
        const data = await listBanks(q);
        if (on) setBanks(data);
      }catch(e){
        if(on) setError(e.message||String(e));
      }finally{
        if(on) setLoading(false);
      }
    })();
    return ()=>{ on=false; };
  }, [q]);

  const groups = useMemo(() => {
    const byType = banks.reduce((acc, b) => {
      const t = (b.type||"other").toLowerCase();
      (acc[t] ||= []).push(b);
      return acc;
    }, {});
    // nice ordering
    const order = ["nuban","microfinance","wallet","mortgage","other"];
    return order.filter(k => byType[k]?.length).map(k => [k, byType[k]]);
  }, [banks]);

  function submit(e){
    e.preventDefault();
    if (!sel.bankCode) return alert("Choose a bank or wallet.");
    if (!sel.amount || Number(sel.amount) < 50) return alert("Minimum withdrawal is $50.");
    // TODO: call your existing payout request GAS action here
    alert(`Withdrawal submitted:\nBank code: ${sel.bankCode}\nAmount: $${Number(sel.amount).toFixed(2)}`);
  }

  return (
    <div style={{padding:16}}>
      <h2>Payments / Wallet</h2>

      <div style={{margin:"12px 0"}}>
        <input
          value={q}
          onChange={e=>setQ(e.target.value)}
          placeholder="Search institutions (name/code/type)…"
          style={{padding:"8px 10px", borderRadius:8, border:"1px solid #223", background:"#0b1320", color:"#e6f1ff", width:360}}
        />
      </div>

      {error && <div style={{color:"crimson", margin:"6px 0"}}>{error}</div>}
      {loading && <div>Loading institutions…</div>}

      {!loading && (
        <form onSubmit={submit} style={{maxWidth:560, background:"#0f172a", padding:16, borderRadius:12}}>
          <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:12}}>
            <div>
              <label style={{display:"block", color:"#9fb3c8", marginBottom:6}}>Amount ($)</label>
              <input type="number" min="50" step="0.01"
                value={sel.amount}
                onChange={e=>setSel(s=>({...s, amount:e.target.value}))}
                style={{width:"100%", padding:"10px 12px", borderRadius:10, border:"1px solid #1f2a44", background:"#0b1320", color:"#e6f1ff"}}
              />
            </div>

            <div>
              <label style={{display:"block", color:"#9fb3c8", marginBottom:6}}>Financial Institution</label>
              <select
                value={sel.bankCode}
                onChange={e=>setSel(s=>({...s, bankCode:e.target.value}))}
                style={{width:"100%", padding:"10px 12px", borderRadius:10, border:"1px solid #1f2a44", background:"#0b1320", color:"#e6f1ff"}}
              >
                <option value="">Choose Institution</option>
                {groups.map(([type, list]) => (
                  <optgroup key={type} label={labelFor(type)}>
                    {list.map(b => (
                      <option key={`${b.code}:${b.name}`} value={b.code}>
                        {b.name} — {b.code}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
          </div>

          <button
            style={{marginTop:12, padding:"10px 12px", borderRadius:10, border:"none", fontWeight:700, background:"#4cc9f0", color:"#001219"}}
          >
            Request Withdrawal
          </button>
        </form>
      )}
    </div>
  );
}

function labelFor(type){
  switch(String(type).toLowerCase()){
    case "nuban": return "Banks (NUBAN)";
    case "microfinance": return "Microfinance Banks";
    case "wallet": return "Wallets & Fintech";
    case "mortgage": return "Mortgage Banks";
    default: return "Other Institutions";
  }
}