/* assets/js/empire-dashboard.js */

document.addEventListener("DOMContentLoaded", async () => {
  // defensive: wait until EmpireAPI exists
  if (!window.EmpireAPI) {
    console.error("EmpireAPI not loaded");
    return;
  }

  try {
    const data = await EmpireAPI.kpis();
    if (!data || !data.ok) throw new Error("KPIs not ok");

    setText("tileOnboarding", data.pendingOnboarding);
    setText("tileAssociates", data.activeAssociates);
    setText("tileApprovals", data.approvalsToday);
    setText("tileWallet", `$${Number(data.walletInflow24h || 0).toFixed(2)}`);
    setText("kpiUpdatedAt", new Date(data.ts || Date.now()).toLocaleString());
  } catch (e) {
    console.error(e);
    setText("kpiUpdatedAt", "Error");
  }
});

function setText(id, txt) {
  const el = document.getElementById(id);
  if (el) el.textContent = txt;
}