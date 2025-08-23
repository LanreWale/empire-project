// src/tabs/Monitoring.jsx (snippet)
import { useEffect, useState } from "react";

export default function Monitoring() {
  const [health, setHealth] = useState(null);
  const [events, setEvents] = useState([]);

  useEffect(() => {
    let stop = false;

    async function tick() {
      try {
        const h = await fetch("/.netlify/functions/monitor-health").then(r => r.json());
        if (!stop) setHealth(h);
      } catch {}
      try {
        const e = await fetch("/.netlify/functions/monitor-feed").then(r => r.json());
        if (!stop) setEvents(e.events || e); // supports both shapes
      } catch {}
    }

    tick();
    const id = setInterval(tick, 15000);
    return () => { stop = true; clearInterval(id); };
  }, []);

  // render health badges + events table...
  return /* your UI */;
}