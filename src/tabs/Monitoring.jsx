import { useEffect, useState } from "react";

function Badge({ label, value }) {
  const color = (v) => {
    if (v === "ONLINE" || v === "OPERATIONAL" || v === "CONNECTED") return "bg-green-600";
    if (v === "DEGRADED") return "bg-amber-600";
    return "bg-red-600"; // DOWN or unknown
  };
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-zinc-800 shadow">
      <span className="text-zinc-300 text-sm">{label}</span>
      <span className={`text-white text-xs px-2 py-1 rounded ${color(value)}`}>{String(value)}</span>
    </div>
  );
}

export default function Monitoring() {
  const [health, setHealth] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let stop = false;

    async function tick() {
      try {
        const hRes = await fetch("/.netlify/functions/monitor-health");
        const h = await hRes.json();
        if (!stop) setHealth(h);
      } catch (e) {
        if (!stop) setError("Health fetch failed");
      }
      try {
        const eRes = await fetch("/.netlify/functions/monitor-feed");
        const ej = await eRes.json();
        const list = ej.events || ej || [];
        if (!stop) setEvents(Array.isArray(list) ? list : []);
      } catch (e) {
        if (!stop) setError("Feed fetch failed");
      }
      if (!stop) setLoading(false);
    }

    tick();
    const id = setInterval(tick, 15000);
    return () => { stop = true; clearInterval(id); };
  }, []);

  return (
    <div className="p-4 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-zinc-100">System Monitoring</h1>
        <button
          onClick={() => window.location.reload()}
          className="px-3 py-2 rounded-lg bg-zinc-700 text-zinc-200 hover:bg-zinc-600"
        >
          Refresh
        </button>
      </div>

      {loading && <p className="text-zinc-400">Loading…</p>}
      {error && <p className="text-amber-400">{error}</p>}

      {health && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          <Badge label="Server" value={health.server} />
          <Badge label="Database" value={health.db} />
          <Badge label="Sheets" value={health.sheets} />
          <Badge label="AI" value={health.ai} />
          <Badge label="Sync" value={health.sync} />
        </div>
      )}

      <div className="bg-zinc-900 rounded-2xl p-4 shadow">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg text-zinc-100">Event Feed</h2>
          <span className="text-xs text-zinc-400">{events.length} events</span>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-zinc-400 text-left">
                <th className="py-2 pr-4">Time</th>
                <th className="py-2 pr-4">Type</th>
                <th className="py-2 pr-4">Message</th>
                <th className="py-2 pr-4">Ref</th>
                <th className="py-2 pr-4">Actor</th>
              </tr>
            </thead>
            <tbody>
              {events.map((e, idx) => (
                <tr key={idx} className="border-t border-zinc-800 text-zinc-200">
                  <td className="py-2 pr-4 whitespace-nowrap">{e.time || e.ts || e[0] || ""}</td>
                  <td className="py-2 pr-4">{e.type || e[1] || ""}</td>
                  <td className="py-2 pr-4 max-w-xl truncate">{e.msg || e.message || e[2] || ""}</td>
                  <td className="py-2 pr-4">{e.ref || e[3] || ""}</td>
                  <td className="py-2 pr-4">{e.actor || e[4] || ""}</td>
                </tr>
              ))}
              {events.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-6 text-zinc-500 text-center">No events yet</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}