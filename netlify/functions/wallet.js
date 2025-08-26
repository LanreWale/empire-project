<!-- Wallet tab -->
<section id="tab-wallet" class="tab-panel" hidden>
  <div class="cards">
    <div class="card">
      <div class="card-title">Total Inflow (USD)</div>
      <div id="w-inflow" class="big"></div>
    </div>
    <div class="card">
      <div class="card-title">Total Outflow (USD)</div>
      <div id="w-outflow" class="big"></div>
    </div>
    <div class="card">
      <div class="card-title">Net (USD)</div>
      <div id="w-net" class="big"></div>
    </div>
  </div>

  <h3 class="mt">Recent Wallet Activity</h3>
  <div class="table-scroll">
    <table class="table" id="wallet-table">
      <thead>
        <tr>
          <th>Date</th>
          <th>Amount (USD)</th>
          <th>Method</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody><!-- filled by JS --></tbody>
    </table>
  </div>
</section>