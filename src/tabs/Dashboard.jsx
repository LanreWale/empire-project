import React, { useEffect, useState } from "react";

function Dashboard() {
  const [banks, setBanks] = useState([]);
  const [selectedBank, setSelectedBank] = useState("");

  // Load banks JSON once when component mounts
  useEffect(() => {
    fetch("/all_banks.json")
      .then((res) => res.json())
      .then((data) => {
        // Normalize data if it comes as array of objects
        const bankList = data.map((b) => ({
          name: b.name || b.bank || b.BankName,
          code: b.code || b.BankCode || b.id,
        }));
        setBanks(bankList);
      })
      .catch((err) => console.error("Bank load error:", err));
  }, []);

  return (
    <div className="dashboard">
      <h1>⚔️ The Empire Dashboard ⚔️</h1>

      <div className="form-group">
        <label htmlFor="bank">Choose Bank:</label>
        <select
          id="bank"
          value={selectedBank}
          onChange={(e) => setSelectedBank(e.target.value)}
        >
          <option value="">-- Select Bank --</option>
          {banks.map((bank, idx) => (
            <option key={idx} value={bank.code}>
              {bank.name} ({bank.code})
            </option>
          ))}
        </select>
      </div>

      {selectedBank && (
        <p className="selected-bank">
          ✅ You selected: <strong>{selectedBank}</strong>
        </p>
      )}
    </div>
  );
}

export default Dashboard;