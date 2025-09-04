/* === THE EMPIRE — Unified Global Theme (Welcome • Login • Dashboard) === */

/* ---------- Variables (merged) ---------- */
:root{
  /* General */
  --bg:#0b0e12;
  --bg-2:#0a0d11;
  --panel:#121624;
  --panel-2:#101520;
  --text:#e8eaed;
  --muted:#b6b9c2;
  --gold:#f1c40f;
  --gold-2:#d9a100;
  --accent:#2dd4bf;
  --border:#1d2432;
  --shadow:rgba(0,0,0,.55);
  --ring:rgba(241,196,15,.25);

  /* Dashboard polish */
  --emp-bg-1:#0b1020;
  --emp-bg-2:#081225;
  --emp-sheen:#0d1b3a;
  --emp-card: rgba(16,21,32,.88);
  --emp-border: rgba(255,255,255,.06);
  --emp-text:#e5efff;
  --emp-muted:#9db2d7;
  --emp-accent:#ffd166;     /* gold */
  --emp-accent-2:#59ffa5;   /* mint */
}

/* ---------- Resets ---------- */
*{box-sizing:border-box;margin:0;padding:0}
html,body{height:100%}
body{
  font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;
  color:var(--text);
  background:
    radial-gradient(1200px 600px at 50% 15%, #0e1420 0%, transparent 60%),
    radial-gradient(900px 480px at 50% 60%, #0a0f1a 0%, transparent 60%),
    linear-gradient(180deg, #0a0d11 0%, #0b0e12 100%);
  min-height:100vh;
}

/* ---------- Shared header/footer (dashboard compatible) ---------- */
.emp-header{background:#121624;border-bottom:1px solid rgba(255,255,255,.06);box-shadow:0 8px 20px -12px var(--shadow)}
.emp-header .emp-header__inner{max-width:980px;margin:0 auto;padding:14px 16px;display:flex;align-items:center;gap:16px}
.emp-footer{margin-top:24px;border-top:1px solid rgba(255,255,255,.06);background:#0f1520}
.emp-footer .emp-footer__inner{max-width:980px;margin:0 auto;padding:16px;color:var(--muted);text-align:center}

/* ---------- Dashboard shell ---------- */
.emp-container{max-width:1100px;margin:0 auto;padding:24px 16px}
.emp-nav .emp-tab{display:inline-block;background:#0c111a;color:var(--text);border:1px solid var(--border);border-radius:12px;padding:10px 14px;text-decoration:none;font-weight:600}
.emp-nav .emp-tab.active{background:#1a2233;border-color:#2a3350}
.emp-view.hidden{display:none}
.emp-btn{background:var(--gold);color:#161000;border:none;border-radius:10px;padding:10px 14px;font-weight:800;cursor:pointer}
.emp-btn.small{padding:7px 10px}

/* ---------- Buttons (global) ---------- */
a.btn, .btn, .cta-primary{
  display:inline-block;text-decoration:none;text-align:center;
  background:linear-gradient(180deg, var(--gold) 0%, var(--gold-2) 100%);
  color:#161000;font-weight:900;letter-spacing:.02em;
  padding:12px 20px;border-radius:14px;border:0;cursor:pointer;
  box-shadow:0 16px 44px -18px rgba(241,196,15,.85), inset 0 -2px 0 rgba(0,0,0,.25);
  transition:transform .12s ease, box-shadow .12s ease, filter .12s ease;
}
a.btn:hover, .btn:hover, .cta-primary:hover{transform:translateY(-1px);filter:saturate(112%);box-shadow:0 24px 56px -24px rgba(241,196,15,.9)}
a.btn:active, .btn:active, .cta-primary:active{transform:translateY(0) scale(.995)}

/* ---------- HERO (Welcome) ---------- */
.hero-cover{
  min-height:100svh;
  display:flex;flex-direction:column;justify-content:center;align-items:center;
  position:relative;text-align:center;padding:72px 16px 96px;
  isolation:isolate;
  /* Use CSS var so HTML can choose the image path */
  background-image:
    radial-gradient(1200px 600px at 50% 15%, rgba(8,11,18,.75) 0%, rgba(8,11,18,.92) 80%),
    var(--hero-url, none);
  background-size:cover;
  background-position:center top;
  background-repeat:no-repeat;
}
.hero-inner{max-width:980px;margin:auto}
.kicker{font-size:.82rem;letter-spacing:.22em;text-transform:uppercase;color:#ffd766;font-weight:800;opacity:.92;margin-bottom:12px}
.hero-title{font-size:clamp(36px,6vw,64px);line-height:1.02;font-weight:900;letter-spacing:.01em;text-shadow:0 10px 28px var(--shadow);margin:0 0 14px}
.hero-sub{color:var(--muted);font-size:clamp(15px,2.6vw,20px);margin:0 auto 22px;max-width:720px}
.hero-cta{display:flex;gap:12px;justify-content:center;flex-wrap:wrap}
.hero-bottom-note{position:absolute;left:0;right:0;bottom:18px;text-align:center;color:#cbd5e1;opacity:.9;font-size:.92rem;font-weight:700;letter-spacing:.08em}

/* Ensure nothing overlays the CTA */
.hero-cover, .hero-inner{pointer-events:auto; z-index:1}

/* ---------- LOGIN Card ---------- */
.login-wrap{
  min-height:100svh;display:grid;place-items:center;padding:28px 16px;
  background:
    radial-gradient(1100px 520px at 50% 20%, rgba(28,36,54,.25) 0%, transparent 60%),
    radial-gradient(800px 460px at 50% 70%, rgba(10,16,28,.3) 0%, transparent 65%),
    linear-gradient(180deg, #0a0d11 0%, #0b0e12 100%);
}
.login-card{
  width:min(520px,92vw);
  background:linear-gradient(180deg, rgba(21,26,36,.72), rgba(17,22,32,.72));
  border:1px solid rgba(255,255,255,.06);
  border-radius:18px;padding:22px 18px 20px;
  box-shadow:0 24px 60px -24px var(--shadow), 0 0 0 1px rgba(255,255,255,.03) inset;
  position:relative;
  backdrop-filter:saturate(115%) blur(6px);
}
.login-card h1{font-size:clamp(24px,3.8vw,30px);margin:2px 0 12px}
.login-card .desc{color:var(--muted);font-size:.95rem;margin-bottom:10px}
.form-row{margin:10px 0}
label{display:block;margin:0 0 6px;color:#cfd3dc;font-size:.92rem}
input.emp{
  width:100%;padding:12px 12px;border-radius:10px;
  background:#0c111a;border:1px solid #2a3350;color:var(--text);
  outline:0;transition:border-color .12s ease, box-shadow .12s ease;
}
input.emp:focus{border-color:#3a4770;box-shadow:0 0 0 3px rgba(58,71,112,.35)}
.login-actions{display:flex;gap:10px;align-items:center;margin-top:12px}
a.link{color:#9fd3f7;text-decoration:none}
a.link:hover{text-decoration:underline}
.footer-note{margin-top:12px;color:var(--muted);font-size:.85rem;text-align:center}

/* ---------- Dashboard background & cards ---------- */
body.bg-empire-hero{
  background:
    radial-gradient(1200px 600px at 10% 90%, rgba(21,40,82,.35), transparent 60%),
    radial-gradient(900px 500px at 85% 15%, rgba(27,60,120,.28), transparent 55%),
    linear-gradient(180deg, var(--emp-bg-2) 0%, var(--emp-bg-1) 100%);
  color:var(--emp-text);
}
.emp-view,.emp-card{
  background:var(--emp-card);
  border:1px solid var(--emp-border);
  border-radius:16px;
}

/* ---------- Dashboard nav/tokens/KPIs ---------- */
.emp-tab.active{ background:#172036; border-color:#2a3350 }
.emp-muted{ color:var(--emp-muted) }
.kpi .val, .kpi-card .val{ color:var(--emp-accent-2); font-weight:800 }

/* ---------- Buttons (dashboard) ---------- */
.cta, .emp-btn{ background:var(--emp-accent); color:#1a1a1a; border:none; border-radius:10px; font-weight:800 }
.cta.ghost, .emp-btn.alt{ background:transparent; color:var(--emp-text); border:1px solid var(--emp-border) }

/* ---------- Responsive tweaks ---------- */
@media (max-width: 520px){
  .hero-sub{font-size:clamp(14px,3.5vw,18px)}
  .cta-primary{width:100%;max-width:360px}
}