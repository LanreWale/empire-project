const {getJSON, resolveURL, cors} = require("./lib/fetchFromSheet");

exports.handler = async () => {
  try {
    const url = resolveURL(
      process.env.GS_WEBHOOK_URL,
      [
        process.env.SHEETS_BASE_URL && `${process.env.SHEETS_BASE_URL}/monitor`,
        process.env.EMPIRE_APPS_SCRIPT_BASE && `${process.env.EMPIRE_APPS_SCRIPT_BASE}/monitor`
      ]
    );
    const data = await getJSON(url, {apikey: process.env.GS_WEBAPP_KEY});
    return cors({ok:true, events: data.events ?? data ?? []});
  } catch (e) {
    return cors({ok:false, error:String(e.message || e)}, 500);
  }
};
