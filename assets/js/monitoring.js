// asset/js/monitoring.js
document.addEventListener("DOMContentLoaded", () => loadMonitoring());

async function loadMonitoring(){
  try{
    const url=`${window.EMPIRE_API.BASE_URL}?action=monitoring`;
    const res=await fetch(url);
    const data=await res.json();
    if(!data.ok) throw new Error(data.error||"Bad monitoring payload");

    setText("#mon-health", fmt(data.systems?.overallHealth,"pct"));

    const feed=document.querySelector("#mon-feed");
    if(feed){
      feed.innerHTML="";
      (data.feed||[]).forEach(ev=>{
        const li=document.createElement("li");
        li.textContent=`[${ev.time}] ${ev.type}: ${ev.message}`;
        feed.appendChild(li);
      });
    }
  }catch(e){ console.error(e); }
}