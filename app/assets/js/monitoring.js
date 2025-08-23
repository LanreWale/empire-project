import { getJSON, ENDPOINTS } from "./api.js";

const healthRow = document.getElementById("healthRow");
const refreshBtn = document.getElementById("refreshBtn");
const feedTable  = document.querySelector("#feedTable tbody");
const feedEmpty  = document.getElementById("feedEmpty");

function badge(label, value) {
  const cls =
    value === "ONLINE" || value === "OPERATIONAL" || value === "CONNECTED" ? "ok" :
    value === "DEGRADED" ? "warn" : "down";
  return `<div class="card"><div style="display:flex;gap:8px;align-items:center">
    <span class="muted">${label}</span>
    <span class="badge ${cls}">${value}</span>
  </div></div>`;
}

async function render() {
  // health
  try {
    const h = await getJSON(ENDPOINTS.health);
    healthRow.innerHTML = [
      badge("Server", h.server),
      badge("Database", h.db),
      badge("Sheets", h.sheets),
      badge("AI", h.ai),
      badge("Sync", h.sync)
    ].join("");
  } catch {
    healthRow.innerHTML = "<div class='card'>Health fetch failed</div>";
  }

  // feed
  try {
    const f = await getJSON(ENDPOINTS.feed);
    const events = f.events || f || [];
    feedTable.innerHTML = "";
    if (!events.length) {
      feedEmpty.style.display = "block";
    } else {
      feedEmpty.style.display = "none";
      events.forEach(ev => {
        const ts = ev.ts || ev[0] || "";
        const type = ev.type || ev[1] || "";
        const msg = ev.message || ev[2] || "";
        const ref = ev.ref || ev[3] || "";
        const actor = ev.actor || ev[4] || "";
        const row = `<tr>
          <td>${ts}</td><td>${type}</td><td>${msg}</td><td>${ref}</td><td>${actor}</td>
        </tr>`;
        feedTable.insertAdjacentHTML("beforeend", row);
      });
    }
  } catch {
    feedTable.innerHTML = "<tr><td colspan='5' class='muted'>Feed fetch failed</td></tr>";
  }
}

refreshBtn.addEventListener("click", render);
render();
setInterval(render, 15000);