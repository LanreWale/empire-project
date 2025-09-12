(function () {
  const cfg = (window.EmpireConfig || {});
  const API = cfg.BASE_API;

  const $ = (id) => document.getElementById(id);

  const fmtNumber = (n) =>
    (typeof n === "number" ? n : Number(n || 0)).toLocaleString(cfg.LOCALE, {
      maximumFractionDigits: 2,
      minimumFractionDigits: 0,
    });

  const fmtMoney = (n) =>
    (typeof n === "number" ? n : Number(n || 0)).toLocaleString(cfg.LOCALE, {
      style: "currency",
      currency: cfg.CURRENCY || "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const fmtPct = (n) =>
    (typeof n === "number" ? n : Number(n || 0)).toLocaleString(cfg.LOCALE, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }) + "%";

  function tableFromEntries(entries, col1, col2, isMoney) {
    if (!entries || !entries.length) return "<div class='muted'>No data</div>";
    const rows = entries
      .map(
        ([k, v]) =>
          `<tr><td>${k}</td><td class="num">${
            isMoney ? fmtMoney(v) : fmtNumber(v)
          }</td></tr>`
      )
      .join("");
    return `
      <table>
        <thead><tr><th>${col1}</th><th class="num">${col2}</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>`;
  }

  async function fetchOverview() {
    const url = API + (API.includes("?") ? "&" : "?") + "t=" + Date.now();
    const r = await fetch(url, { cache: "no-store" });
    if (!r.ok) throw new Error("API HTTP " + r.status);
    return r.json();
  }

  async function render() {
    try {
      const data = await fetchOverview();
      if (!data || data.ok !== true) throw new Error("Bad payload");

      const t = data.totals || {};
      $("ov-earnings").textContent = fmtMoney(t.earnings);
      $("ov-leads").textContent = fmtNumber(t.leads);
      $("ov-clicks").textContent = fmtNumber(t.clicks);
      $("ov-convrate").textContent = fmtPct(t.conversionRate);
      $("ov-epc").textContent = fmtMoney(t.epc);
      $("ov-cpa").textContent = fmtMoney(t.cpa);
      $("ov-rpm").textContent = fmtMoney(t.rpm);

      // By Geo (sorted desc)
      const geo = Object.entries(data.geo || {}).sort((a, b) => b[1] - a[1]);
      $("tbl-geo").innerHTML = tableFromEntries(geo, "Country", "Earnings ($)", true);

      // By Device
      const dev = Object.entries(data.devices || {}).sort((a, b) => b[1] - a[1]);
      $("tbl-device").innerHTML = tableFromEntries(dev, "Device", "Earnings ($)", true);

      // By Offer Type
      const offer = Object.entries(data.offerTypes || {}).sort((a, b) => b[1] - a[1]);
      $("tbl-offerType").innerHTML = tableFromEntries(offer, "Offer", "Earnings ($)", true);

      // By Day (sort by date asc)
      const byDay = Object.entries(data.byDay || {}).sort(
        (a, b) => new Date(a[0]) - new Date(b[0])
      );
      $("tbl-byDay").innerHTML = tableFromEntries(byDay, "Date", "Earnings ($)", true);

      // Debug (optional): open console to verify payload once
      // console.log("Overview data:", data);

    } catch (e) {
      console.error(e);
      // Leave the placeholders, but show a small note once
      const noteId = "ov-error-note";
      if (!$(noteId)) {
        const p = document.createElement("p");
        p.id = noteId;
        p.className = "muted";
        p.textContent = "Unable to load overview at the moment.";
        $("overview").appendChild(p);
      }
    }
  }

  // Expose for your tab router
  window.loadOverview = render;

  // If Overview is the landing tab, render immediately
  document.addEventListener("DOMContentLoaded", () => {
    const sec = document.getElementById("overview");
    if (sec && sec.classList.contains("active")) render();
  });
})();