// asset/js/overview.js
// Renders the OVERVIEW tab exactly from the GAS payload

// ==== 1) Map your DOM boxes (change selectors to the ones in your HTML) ====
const $box = {
  earnings:   document.querySelector('#kpi-earnings'),
  leads:      document.querySelector('#kpi-leads'),
  clicks:     document.querySelector('#kpi-clicks'),
  conv:       document.querySelector('#kpi-conv'),
  epc:        document.querySelector('#kpi-epc'),
  cpa:        document.querySelector('#kpi-cpa'),
  rpm:        document.querySelector('#kpi-rpm'),
  byGeo:      document.querySelector('#tbl-by-geo tbody'),
  byDevice:   document.querySelector('#tbl-by-device tbody'),
  byOffer:    document.querySelector('#tbl-by-offer tbody'),
  byDay:      document.querySelector('#tbl-by-day tbody'),
};

// ==== 2) Helper ====
function fmtMoney(n){ return `$${Number(n||0).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}`; }
function clearBody(tbody){ if(tbody) tbody.innerHTML=''; }
function addRow(tbody, cols){
  if(!tbody) return;
  const tr=document.createElement('tr');
  cols.forEach(c=>{
    const td=document.createElement('td');
    td.textContent=c;
    tr.appendChild(td);
  });
  tbody.appendChild(tr);
}

// ==== 3) Render function used by config.js → loadOverview() ====
window.renderOverview = (data) => {
  if(!data || !data.ok){ console.warn('overview error', data); return; }
  const t = data.totals || {};
  // KPIs
  if($box.earnings) $box.earnings.textContent = fmtMoney(t.earnings);
  if($box.leads)    $box.leads.textContent    = Number(t.leads||0).toLocaleString();
  if($box.clicks)   $box.clicks.textContent   = Number(t.clicks||0).toLocaleString();
  if($box.conv)     $box.conv.textContent     = `${(t.convRate||0).toFixed(2)}%`;
  if($box.epc)      $box.epc.textContent      = fmtMoney(t.epc||0);
  if($box.cpa)      $box.cpa.textContent      = fmtMoney(t.cpa||0);
  if($box.rpm)      $box.rpm.textContent      = fmtMoney(t.rpm||0);

  // Tables
  const b = data.breakdowns || {};
  // By Geo
  clearBody($box.byGeo);
  Object.entries(b.byGeo||{}).sort((a,b)=>b[1]-a[1]).forEach(([country, amt])=>{
    addRow($box.byGeo, [country, fmtMoney(amt)]);
  });
  // By Device
  clearBody($box.byDevice);
  Object.entries(b.byDevice||{}).sort((a,b)=>b[1]-a[1]).forEach(([device, amt])=>{
    addRow($box.byDevice, [device, fmtMoney(amt)]);
  });
  // By Offer
  clearBody($box.byOffer);
  Object.entries(b.byOfferType||{}).sort((a,b)=>b[1]-a[1]).forEach(([offer, amt])=>{
    addRow($box.byOffer, [offer, fmtMoney(amt)]);
  });
  // By Day
  clearBody($box.byDay);
  Object.entries(b.byDay||{}).sort().forEach(([date, amt])=>{
    addRow($box.byDay, [date, fmtMoney(amt)]);
  });
};