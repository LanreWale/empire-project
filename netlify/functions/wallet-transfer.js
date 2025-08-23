const { canPayout } = require("../shared/policy");
const { flwTransfer } = require("../services/flutterwave");
const { writeAudit } = require("../services/audit");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ ok: false }) };
  }

  const body = JSON.parse(event.body || "{}");
  const user = { id: "demo", role: "COMMANDER", levyCleared: true, weeklyPayoutsThisWeek: 0 }; // Replace with auth
  const { amount, channel, dest } = body;

  const weeklyCount = Number(user.weeklyPayoutsThisWeek ?? 0);
  const guard = canPayout({ role: user.role, amount: Number(amount), levyCleared: !!user.levyCleared, weeklyCount });

  if (!guard.ok) {
    await writeAudit("PAYOUT_BLOCKED", { userId: user.id, amount, reason: guard.reason });
    return { statusCode: 403, body: JSON.stringify({ ok: false, error: guard.reason }) };
  }

  const debit = Number(amount) * (guard.share ?? 1);
  const tx = await flwTransfer({ amount: debit, channel, dest, meta: { userId: user.id } });
  await writeAudit("PAYOUT_REQUESTED", { userId: user.id, amount: debit, txId: tx.id, channel });

  return { statusCode: 200, body: JSON.stringify({ ok: true, txId: tx.id }) };
};