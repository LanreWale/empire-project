const {getJSON, resolveURL, cors} = require("./lib/fetchFromSheet");

exports.handler = async () => {
  try {
    const url = resolveURL(
      process.env.SHEETS_USERS_URL,
      [
        process.env.SHEETS_BASE_URL && `${process.env.SHEETS_BASE_URL}/users`,
        process.env.EMPIRE_APPS_SCRIPT_BASE && `${process.env.EMPIRE_APPS_SCRIPT_BASE}/users`
      ]
    );
    const data = await getJSON(url, {apikey: process.env.GS_WEBAPP_KEY});
    const all = data.users ?? data ?? [];
    const approved = all.filter(u => String(u.status || u.approval || "").toLowerCase() === "active");
    return cors({ok:true, users: approved, totalEarnings: data.totalEarnings ?? 0, activeUsers: approved.length});
  } catch (e) {
    return cors({ok:false, error:String(e.message || e)}, 500);
  }
};
