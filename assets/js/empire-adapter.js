// === Adapter: uses your existing DOM + your working GAS URL ===
// Requires: window.EMPIRE.API_URL already set (from config.js)

(function(){
  const API = (act, params={}) => {
    const u = new URL(window.EMPIRE.API_URL);
    u.searchParams.set("action", act);
    Object.entries(params).forEach(([k,v]) => u.searchParams.set(k, v));
    return fetch(u, { credentials: "omit" })
      .then(r => r.json())
      .catch(err => ({ ok:false, error:String(err) }));
  };

  const $$ = sel => document.querySelector(sel);
  const setText = (sel, v) => { const el = $$(sel); if (el) el.textContent = v; };
  const money = n => `$${Number(n||0).toLocaleString(undefined,{minimumFractionDigits:2, maximumFractionDigits:2})}`;
  const pct   = n => `${Number(n||0).toFixed(2)}%`;
  const safe  = s => (s==null || s==="") ? "—" : String(s);

  /* ------------- OVERVIEW ------------- */
  window.loadOverview = async function(){
    const boxErr = msg => {
      const slot = $$("#overview .card") || $$("#overview");
      if (!slot) return;
      let el = slot.querySelector(".js-overview-error");
      if (!el) {
        el = document.createElement("div");
        el.className = "js-overview-error";
        el.style.cssText = "color:#ff6b6b;margin:6px 0;font-weight:700";
        slot.insertBefore(el, slot.firstChild);
      }
      el.textContent = msg;
    };

    const res = await API("overview");
    if (!res.ok) { boxErr(`Failed to load data: ${res.error || "API returned ok=false"}`); return; }

    const t = res.totals || {};
    setText("#ov-earnings", money(t.earnings));
    setText("#ov-leads",    t.leads||0);
    setText("#ov-clicks",   t.clicks||0);
    setText("#ov-convrate", pct(t.convRate));
    setText("#ov-epc",      money(t.epc));
    setText("#ov-cpa",      money(t.cpa));
    setText("#ov-rpm",      money(t.rpm));

    // tables
    const fillTable = (tbodySel, rows, map) => {
      const tb = $$(tbodySel);
      if (!tb) return;
      tb.innerHTML = "";
      (rows||[]).forEach(r=>{
        const tr = document.createElement("tr");
        tr.innerHTML = map(r);
        tb.appendChild(tr);
      });
    };

    fillTable("#tbl-geo", (res.breakdowns?.byGeo||[]), r =>
      `<td>${safe(r.key)}</td><td class="num">${money(r.earnings)}</td>`);

    fillTable("#tbl-device", (res.breakdowns?.byDevice||[]), r =>
      `<td>${safe(r.key)}</td><td class="num">${money(r.earnings)}</td>`);

    fillTable("#tbl-offerType", (res.breakdowns?.byOfferType||[]), r =>
      `<td>${safe(r.key)}</td><td class="num">${money(r.earnings)}</td>`);

    fillTable("#tbl-byDay", (res.breakdowns?.byDay||[]), r =>
      `<td>${safe(r.date)}</td><td class="num">${money(r.earnings)}</td>`);
  };

  /* ------------- CPA ACCOUNTS ------------- */
  window.loadCPAAccounts = async function(){
    const wrap = $$("#cpaAccounts");
    if (!wrap) return;
    wrap.innerHTML = "Loading…";

    const res = await API("cpaaccounts");
    if (!res.ok) { wrap.innerHTML = `<div style="color:#ff6b6b">Failed: ${safe(res.error)}</div>`; return; }

    const cards = (res.accounts||[]).map(acc => `
      <div class="card" style="margin-bottom:12px">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <div><strong>${safe(acc.AccountID)}</strong> · <span class="muted">${safe(acc.Network||"CPA Grip")}</span></div>
          <span class="muted">${safe(acc.Status||"ACTIVE")}</span>
        </div>
        <div style="margin-top:8px;display:grid;grid-template-columns:repeat(4,1fr);gap:10px">
          <div>Earnings: <strong>${money(acc.Revenue)}</strong></div>
          <div>Clicks: <strong>${safe(acc.Clicks||0)}</strong></div>
          <div>Offers: <strong>${safe(acc.ActiveOffers||0)}</strong></div>
          <div>Conv: <strong>${pct(acc.ConversionRate||0)}</strong></div>
        </div>
      </div>
    `).join("");

    wrap.innerHTML = cards || `<div class="muted">No CPA accounts</div>`;
  };

  /* ------------- USERS ------------- */
  window.loadUsers = async function(){
    const body = $$("#usersBody");
    if (!body) return;
    body.innerHTML = "";

    const res = await API("users");
    if (!res.ok) { body.innerHTML = `<tr><td colspan="3" style="color:#ff6b6b">Failed: ${safe(res.error)}</td></tr>`; return; }

    (res.users||[]).forEach(u=>{
      const tr = document.createElement("tr");
      tr.innerHTML = `<td>${safe(u.Name)}</td><td>${safe(u.Email)}</td><td>${safe(u.Phone)}</td>`;
      body.appendChild(tr);
    });

    // Invite links (demo)
    const link = $$("#inviteLink"), ref = $$("#inviteRef");
    if (link) link.value = location.origin + "/invite?code=ABC123";
    if (ref)  ref.value  = "REF-" + (Date.now().toString(36).toUpperCase());
  };

  /* ------------- ANALYTICS ------------- */
  window.loadAnalytics = async function(){
    const body = $$("#analyticsBody");
    if (!body) return;
    body.innerHTML = "Loading…";

    const res = await API("analytics");
    if (!res.ok) { body.innerHTML = `<tr><td colspan="4" style="color:#ff6b6b">Failed: ${safe(res.error)}</td></tr>`; return; }

    body.innerHTML = "";
    (res.analytics||[]).forEach(r=>{
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${safe(r.Date)}</td>
        <td class="num">${safe(r.Clicks||0)}</td>
        <td class="num">${safe(r.Leads||0)}</td>
        <td class="num">${money(r.Earnings)}</td>
      `;
      body.appendChild(tr);
    });
  };

  /* ------------- WALLET ------------- */
  window.loadWallet = async function(){
    const res = await API("wallet");
    if (!res.ok) {
      setText("#wallet-totalIn",  money(0));
      setText("#wallet-totalOut", money(0));
      setText("#wallet-balance",  money(0));
      alert("Wallet load failed: " + safe(res.error));
      return;
    }
    setText("#wallet-totalIn",  money(res.totalIn));
    setText("#wallet-totalOut", money(res.totalOut));
    setText("#wallet-balance",  money(res.balance));

    // banks
    const sel = $$("#bankSelect");
    if (sel){
      const b = await API("banks");
      sel.innerHTML = "";
      (b.banks||[]).forEach(x=>{
        const opt = document.createElement("option");
        opt.value = x.Code || x.BankCode || x.BankName;
        opt.textContent = `${safe(x.BankName)} (${safe(x.Code||x.Country||"")})`;
        sel.appendChild(opt);
      });
    }

    // wire withdraw action (keeps your button behavior if you already attached one)
    const btn = document.querySelector("#wallet button[type=button]");
    if (btn && !btn.dataset.wired){
      btn.dataset.wired = "1";
      btn.addEventListener("click", async ()=>{
        const amt = Number(($$("#withdrawAmt")||{}).value || 0);
        const acct = ($$("#acctNumber")||{}).value || "";
        const bank = ($$("#bankSelect")||{}).value || "";
        if (!amt || amt<=0) return alert("Enter a valid amount");
        const r = await API("withdraw", { amount: amt, accountNumber: acct, bankCode: bank, accountName: "—" });
        if (!r.ok) return alert("Withdrawal failed: "+safe(r.error));
        alert("Withdrawal submitted. Ref: "+r.id);
      });
    }
  };

  /* ------------- MONITORING ------------- */
  window.loadMonitoring = async function(){
    const res = await API("monitoring");
    const el = $$("#mon-health"), feed = $$("#mon-feed");
    if (el) el.textContent = `${Number(res.health||0).toFixed(2)}%`;
    if (feed){
      feed.innerHTML = "";
      (res.missingSheets||[]).forEach(s=>{
        const li = document.createElement("li");
        li.textContent = `Missing sheet: ${s}`;
        feed.appendChild(li);
      });
      if (!res.ok) {
        const li = document.createElement("li");
        li.style.color = "#ff6b6b";
        li.textContent = "Monitoring error: "+safe(res.error);
        feed.appendChild(li);
      }
    }
  };

  /* ------------- SETTINGS ------------- */
  window.loadSettings = async function(){
    const body = $$("#settingsBody");
    if (!body) return;
    body.innerHTML = "Loading…";
    const res = await API("settings");
    if (!res.ok) { body.innerHTML = `<tr><td colspan="4" style="color:#ff6b6b">Failed: ${safe(res.error)}</td></tr>`; return; }
    body.innerHTML = "";
    (res.settings||[]).forEach(s=>{
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${safe(s.Key)}</td>
        <td>${safe(s.Value)}</td>
        <td>${safe(s.Description)}</td>
        <td>${safe(s.UpdatedAt || s.Updated || "")}</td>
      `;
      body.appendChild(tr);
    });
  };

  /* ------------- OPTIONAL: Offer pulling tester ------------- */
  // If you later add selects with IDs #geoCountry, #geoDevice and a table #offersBody:
  window.loadOffersForCurrent = async function(){
    const c = ($$("#geoCountry")||{}).value || "";
    const d = ($$("#geoDevice")||{}).value || "";
    if (!c) return;
    const res = await API("offers", { country:c, device:d, limit:25 });
    const body = $$("#offersBody"); if (!body) return;
    if (!res.ok) { body.innerHTML = `<tr><td colspan="6" style="color:#ff6b6b">Failed: ${safe(res.error)}</td></tr>`; return; }
    body.innerHTML = "";
    (res.offers||[]).forEach(o=>{
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${safe(o.offerId)}</td>
        <td>${safe(o.network)}</td>
        <td>${safe(o.country)}</td>
        <td>${safe(o.offerType)}</td>
        <td class="num">${money(o.payout)} / EPC ${o.epc}</td>
        <td><a href="${safe(o.url)}" target="_blank">Open</a></td>
      `;
      body.appendChild(tr);
    });
  };

})();