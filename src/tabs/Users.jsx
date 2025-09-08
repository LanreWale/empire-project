import React from "react";
import { listUsers } from "../lib/gas";
export default function Users(){
  const [data,setData]=React.useState(null); const [err,setErr]=React.useState("");
  React.useEffect(()=>{(async()=>{try{setData(await listUsers());}catch(e){setErr(e.message);}})();},[]);
  return <Tab title="Users" err={err} data={data} />;
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