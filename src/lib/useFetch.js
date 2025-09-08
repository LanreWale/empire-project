// src/lib/useFetch.js
import { useEffect, useState } from "react";
export default function useFetch(fn, deps=[]) {
  const [data,setData]=useState(null);
  const [error,setError]=useState("");
  const [loading,setLoading]=useState(true);
  useEffect(()=>{ let on=true;
    (async()=>{
      setLoading(true); setError("");
      try{ const d=await fn(); if(on) setData(d); }
      catch(e){ if(on) setError(e.message||String(e)); }
      finally{ if(on) setLoading(false); }
    })();
    return ()=>{ on=false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return { data, error, loading };
}