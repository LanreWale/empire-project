import React from "react";
import { getAnalytics } from "../lib/gas";
export default function Analytics(){
  const [data,setData]=React.useState(null); const [err,setErr]=React.useState("");
  React.useEffect(()=>{(async()=>{try{setData(await getAnalytics());}catch(e){setErr(e.message);}})();},[]);
  return <Tab title="Analytics" err={err} data={data} />;
}
function Tab({title,err,data}){
  return (<div style={{padding:16}}>
    <h2>{title}</h2>
    {err && <div style={{color:"crimson"}}>Unknown action</div>}
    <pre style={{background:"#0b1320",color:"#7fffa0",padding:12,borderRadius:8,overflow:"auto"}}>
{JSON.stringify(data,null,2)}
    </pre>
  </div>);
}