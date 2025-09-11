/* ===== Empire API config + loaders (diagnostic build) ===== */
(function () {
  // ✅ Your deployed Web App "exec" URL
  var BASE_URL = "https://script.google.com/macros/s/AKfycbz-jj7Cr_KzqCku4SQPQ14MEIuCPdq5OEgiiqjo_O2A0FItBrHlmfkoJHViDxuX4P6z/exec";

  // small status banner so you can see errors on mobile too
  function showStatus(msg, isErr) {
    var el = document.getElementById("empire-status");
    if (!el) {
      el = document.createElement("div");
      el.id = "empire-status";
      el.style.cssText = "position:fixed;right:8px;bottom:8px;z-index:9999;background:#0b1320;color:#e6f1ff;border:1px solid #2d416f;padding:8px 10px;border-radius:8px;max-width:80vw;font:12px system-ui,Arial";
      document.body.appendChild(el);
    }
    el.style.borderColor = isErr ? "#ff5c5c" : "#2d416f";
    el.style.color = isErr ? "#ffb3b3" : "#e6f1ff";
    el.textContent = msg;
  }

  async function apiGet(params) {
    var url = BASE_URL + "?" + new URLSearchParams(params).toString();
    showStatus("Fetching: " + (params.action || "…"));
    try {
      var res = await fetch(url, { method: "GET" });
      if (!res.ok) throw new Error("HTTP " + res.status);
      var data = await res.json();
      showStatus("OK: " + (params.action || "done"));
      return data;
    } catch (e) {
      console.error("apiGet error", params, e);
      showStatus("ERR " + (params.action || "") + ": " + (e && e.message ? e.message : e), true);
      throw e;
    }
  }

  // expose globally
  window.EMPIRE_API = { BASE_URL: BASE_URL, apiGet: apiGet, showStatus: showStatus };

  // ---- loaders (names MUST match router) ----
  window.loadOverview    = function () { return apiGet({ action: "overview"     }).then(function (d){ if (window.renderOverview)    window.renderOverview(d); }); };
  window.loadCPAAccounts = function () { return apiGet({ action: "cpaaccounts"  }).then(function (d){ if (window.renderCPAAccounts) window.renderCPAAccounts(d); }); };
  window.loadUsers       = function () { return apiGet({ action: "users"        }).then(function (d){ if (window.renderUsers)       window.renderUsers(d.users || []); }); };
  window.loadAnalytics   = function () { return apiGet({ action: "analytics"    }).then(function (d){ if (window.renderAnalytics)   window.renderAnalytics(d.rows || d.data || []); }); };
  window.loadWallet      = function () { return apiGet({ action: "walletoverview"}).then(function (d){ if (window.renderWallet)      window.renderWallet(d); }); };
  window.loadMonitoring  = function () { return apiGet({ action: "monitoring"   }).then(function (d){ if (window.renderMonitoring)  window.renderMonitoring(d); }); };
  window.loadSettings    = function () { return apiGet({ action: "systemsettings"}).then(function (d){ if (window.renderSettings)   window.renderSettings(d.settings || d || []); }); };

  // also load overview once DOM is ready (extra safety)
  document.addEventListener("DOMContentLoaded", function () {
    if (typeof window.loadOverview === "function") window.loadOverview();
  });
})();