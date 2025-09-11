// asset/js/wallet.js
document.addEventListener("DOMContentLoaded", () => loadWallet());

async function loadWallet(){
  try{
    const url=`${window.EMPIRE_API.BASE_URL}?action=walletoverview`;
    const res=await fetch(url);
    const data=await res.json();
    if(!data.ok) throw new Error(data.error||"Bad wallet payload");

    setText("#wallet-totalIn", fmt(data.totalIn,"money"));
    setText("#wallet-totalOut", fmt(data.totalOut,"money"));
    setText("#wallet-balance", fmt(data.balance,"money"));
  }catch(e){ console.error(e); }
}

// example validator (dummy)
async function validateAccount(num,bankCode){
  const url=`${window.EMPIRE_API.BASE_URL}?action=validate&num=${num}&bank=${bankCode}`;
  return fetch(url).then(r=>r.json());
}