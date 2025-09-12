// assets/js/wallet.js
(function(){
  const $ = (id)=>document.getElementById(id);
  const money = n => "$" + Number(n||0).toLocaleString(undefined,{minimumFractionDigits:2, maximumFractionDigits:2});

  async function api(action, payload){
    const base = window.EMPIRE?.API_URL;
    const url  = `${base}?view=wallet${action ? `&action=${encodeURIComponent(action)}`:""}`;
    const opts = payload ? {method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify(payload)} : {};
    const res  = await fetch(url, opts);
    const txt  = await res.text();
    let data; try{ data = JSON.parse(txt); }catch(e){ throw new Error("Wallet view returned non-JSON"); }
    if (!data || data.ok !== true) throw new Error(data?.error || "Wallet view not implemented");
    return data;
  }

  async function load(){
    const totIn   = $("wallet-totalIn");
    const totOut  = $("wallet-totalOut");
    const bal     = $("wallet-balance");
    const bankSel = $("bankSelect");
    try{
      const { totals = {}, banks = [], minWithdrawal = 50 } = await api();
      totIn.textContent  = money(totals.in  ?? totals.totalIn  ?? 0);
      totOut.textContent = money(totals.out ?? totals.totalOut ?? 0);
      bal.textContent    = money(totals.balance ?? 0);
      bankSel.innerHTML  = banks.length
        ? banks.map(b=>`<option value="${b.code||b.id||b.name}">${b.name||b.code}</option>`).join("")
        : `<option>No banks listed</option>`;
      bankSel.dataset.minw = minWithdrawal;
    }catch(err){
      console.error("[Wallet] ", err);
      totIn.textContent = totOut.textContent = bal.textContent = money(0);
      bankSel.innerHTML = `<option>No data (API view not implemented)</option>`;
    }
  }

  async function withdraw(){
    const acct = $("acctNumber").value.trim();
    const bank = $("bankSelect").value;
    const amt  = Number($("withdrawAmt").value);
    const min  = Number($("bankSelect").dataset.minw || 50);
    if (!acct || !bank || !(amt>0)) return alert("Enter account, bank and amount.");
    if (amt < min) return alert(`Minimum withdrawal is $${min}.`);
    try{
      const r = await api("withdraw", { account: acct, bank, amount: amt });
      alert(r.message || "Withdraw requested");
      await load();
    }catch(err){
      console.error("[Wallet/withdraw] ", err);
      alert("Withdrawal failed: " + err.message);
    }
  }

  window.loadWallet = load;
  // hook the button (index already has inline onclick as a fallback)
  document.addEventListener("click",(e)=>{
    if (e.target && e.target.matches("#wallet button")) withdraw();
  });
})();