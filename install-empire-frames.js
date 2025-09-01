// install-empire-frames.js  — wires Empire frames into Static HTML or React+Vite projects.
const fs = require('fs'); const path = require('path');
const args = process.argv.slice(2).reduce((a,s)=>{const m=s.match(/^--([^=]+)=(.*)$/); if(m)a[m[1]]=m[2]; return a;},{});
const PROJ = process.cwd(); const ex=fs.existsSync; const rd=p=>fs.readFileSync(p,'utf8'); const mk=p=>fs.mkdirSync(p,{recursive:true});
const wr=(p,c)=>{ mk(path.dirname(p)); fs.writeFileSync(p,c,'utf8'); console.log('✓',path.relative(PROJ,p)); };

function stageAssetsStatic(root=''){
  const brand = path.join(PROJ, root, 'assets','brand');
  mk(brand);
  const p = (n)=>path.join(brand,n);
  const web = root ? `/${root}/assets/brand` : '/assets/brand';
  const want = { logo:p('empire-logo.png'), hero:p('empire-hero.jpg'), launch:p('empire-launch.jpg'), favicon:p('favicon.png') };
  function put(src,dest,label){
    if (args[label] && ex(args[label])) fs.copyFileSync(args[label], dest);
    else if (!ex(dest)) fs.writeFileSync(dest+'.txt', `PLACEHOLDER for ${label}. Replace with real ${label} using same filename.`);
  }
  put(args.logo,   want.logo,   'logo');
  put(args.hero,   want.hero,   'hero');
  put(args.launch, want.launch, 'launch');
  if (args.logo && ex(args.logo)) fs.copyFileSync(args.logo, want.favicon); else if (!ex(want.favicon)) fs.writeFileSync(want.favicon+'.txt','PLACEHOLDER favicon');
  return { web };
}

function patchStatic(){
  const { web } = stageAssetsStatic('');
  const css = `
:root{--gold:#d4af37;--text:#e7e7ea}
*{box-sizing:border-box}
html,body{margin:0;background:#050914;color:var(--text);font-family:Inter,system-ui,Segoe UI,Roboto,Helvetica,Arial,sans-serif}
a{color:var(--gold);text-decoration:none}
.btn{display:inline-block;padding:12px 20px;border-radius:999px;border:1px solid var(--gold);background:linear-gradient(180deg,#2b2f3f,#171b2a);color:var(--text);font-weight:600}
.hero{position:relative;min-height:100vh;display:grid;place-items:center;text-align:center;overflow:hidden}
.hero-bg{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:.25;filter:brightness(.6)}
.hero-content{position:relative;z-index:2;padding:32px;max-width:960px}
.hero h1{font-size:72px;margin:0 0 8px;color:#fff;letter-spacing:.08em}
.hero p{opacity:.92;margin:6px 0 22px;font-size:18px}
.login{display:grid;place-items:center;min-height:100vh;padding:24px}
.card{width:100%;max-width:440px;padding:32px;border-radius:24px;background:rgba(16,24,48,.75);box-shadow:0 10px 60px rgba(0,0,0,.45);text-align:center}
.card img{width:140px;margin:6px auto 12px;display:block}
.card input{width:100%;padding:14px 16px;border-radius:12px;border:1px solid #2a334d;background:#0c1326;color:#fff;margin-bottom:12px}
.welcome{position:relative;min-height:100vh;display:grid;place-items:center}
.welcome img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:.30;filter:brightness(.7)}
.welcome .actions{position:relative;z-index:2;display:flex;gap:16px;flex-wrap:wrap}
.header{display:flex;align-items:center;gap:12px;padding:14px 18px;border-bottom:1px solid #1b2238;background:#0b1123}
.header img{width:40px;height:40px}
.footer{padding:22px;text-align:center;border-top:1px solid #1b2238;background:#0b1123;opacity:.9}
.empty{display:grid;place-items:center;min-height:40vh;background:radial-gradient(ellipse at center,#0f1732,transparent 60%)}
.watermark{opacity:.08;font-size:140px;font-weight:800;letter-spacing:.2em}
`.trim();
  wr(path.join(PROJ,'assets','css','empire.css'), css);

  wr(path.join(PROJ,'index.html'), `<!DOCTYPE html><html lang="en"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>The Empire — Command Gateway</title>
<link rel="icon" href="${web}/favicon.png" sizes="any"><link rel="stylesheet" href="/assets/css/empire.css">
<meta property="og:title" content="THE EMPIRE — Affiliate Command Intelligence">
<meta property="og:description" content="Real-Time Earnings · Global Performance Engine">
<meta property="og:image" content="${web}/empire-hero.jpg"></head><body>
<section class="hero">
  <img src="${web}/empire-hero.jpg" alt="The Empire Hero" class="hero-bg" />
  <div class="hero-content">
    <h1>THE EMPIRE</h1>
    <p>Affiliate Command Intelligence • Real-Time Earnings • Global Performance Engine</p>
    <a href="/login.html" class="btn">Enter Command</a>
  </div>
</section></body></html>`);

  wr(path.join(PROJ,'login.html'), `<!DOCTYPE html><html lang="en"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>The Empire — Login</title>
<link rel="icon" href="${web}/favicon.png" sizes="any"><link rel="stylesheet" href="/assets/css/empire.css">
</head><body><div class="login"><div class="card">
  <img src="${web}/empire-logo.png" alt="Empire Logo" />
  <h2>⚔️ Commander Login ⚔️</h2>
  <form id="f"><input type="password" placeholder="Access Key" required /><button class="btn" type="submit">Enter The Empire</button></form>
  <p style="opacity:.7;margin-top:10px;font-size:12px">By entering you agree to Empire terms.</p>
</div></div>
<script>
document.getElementById('f').addEventListener('submit', function(e){e.preventDefault();localStorage.setItem('welcomeSeen','false');location.href='/welcome.html';});
</script></body></html>`);

  wr(path.join(PROJ,'welcome.html'), `<!DOCTYPE html><html lang="en"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>The Empire — Welcome</title>
<link rel="icon" href="${web}/favicon.png" sizes="any"><link rel="stylesheet" href="/assets/css/empire.css">
</head><body><div class="welcome">
  <img src="${web}/empire-launch.jpg" alt="Empire Launch" />
  <div class="actions">
    <a class="btn" href="/dashboard.html" id="toDash">Go to Dashboard</a>
    <a class="btn" href="https://t.me/TheEmpireHq" target="_blank" rel="noopener">Join HQ Channel</a>
  </div></div>
<script>
if(localStorage.getItem('welcomeSeen')==='true'){ location.replace('/dashboard.html'); }
document.getElementById('toDash').addEventListener('click', ()=> localStorage.setItem('welcomeSeen','true'));
</script></body></html>`);

  wr(path.join(PROJ,'dashboard.html'), `<!DOCTYPE html><html lang="en"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>The Empire — Dashboard</title>
<link rel="icon" href="${web}/favicon.png" sizes="any"><link rel="stylesheet" href="/assets/css/empire.css">
</head><body><header class="header">
  <img src="${web}/empire-logo.png" alt="Empire Logo" /><h1>The Empire Dashboard</h1>
</header><main><section class="empty"><div class="watermark">AFFILIATE COMMAND</div></section></main>
<footer class="footer"><p>Commanding the Future of Affiliate Marketing</p></footer></body></html>`);
}

function patchReact(){
  wr(path.join(PROJ,'public','_redirects'), `/* /index.html 200\n`);
  wr(path.join(PROJ,'netlify.toml'), `[[redirects]]\nfrom="/*"\nto="/index.html"\nstatus=200\n`);
  stageAssetsStatic(path.join('src'));

  const idx = path.join(PROJ,'index.html');
  const html = ex(idx) ? rd(idx) : `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>THE EMPIRE</title></head><body><div id="root"></div><script type="module" src="/src/main.jsx"></script></body></html>`;
  wr(idx, html.replace('</head>', `
<link rel="icon" href="/src/assets/brand/favicon.png" />
<meta property="og:title" content="THE EMPIRE — Affiliate Command Intelligence">
<meta property="og:description" content="Real-Time Earnings · Global Performance Engine">
<meta property="og:image" content="/src/assets/brand/empire-hero.jpg">
</head>`));

  wr(path.join(PROJ,'src','styles.css'), `
:root{--gold:#d4af37;--text:#e7e7ea}
*{box-sizing:border-box} html,body,#root{height:100%}
html,body{margin:0;background:#050914;color:var(--text);font-family:Inter,system-ui,Segoe UI,Roboto,Helvetica,Arial,sans-serif}
a{color:var(--gold);text-decoration:none}
.btn{display:inline-block;padding:12px 20px;border-radius:999px;border:1px solid var(--gold);background:linear-gradient(180deg,#2b2f3f,#171b2a);color:var(--text);font-weight:600}
.hero{position:relative;min-height:100vh;display:grid;place-items:center;text-align:center;overflow:hidden}
.hero-bg{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:.25;filter:brightness(.6)}
.hero-content{position:relative;z-index:2;padding:32px;max-width:960px}
.hero h1{font-size:72px;margin:0 0 8px;color:#fff;letter-spacing:.08em}
.hero p{opacity:.92;margin:6px 0 22px;font-size:18px}
.login{display:grid;place-items:center;min-height:100vh;padding:24px}
.login-card{width:100%;max-width:440px;padding:32px;border-radius:24px;background:rgba(16,24,48,.75);box-shadow:0 10px 60px rgba(0,0,0,.45);text-align:center}
.login-card img{width:140px;margin:6px auto 12px;display:block}
.login-card input{width:100%;padding:14px 16px;border-radius:12px;border:1px solid #2a334d;background:#0c1326;color:#fff;margin-bottom:12px}
.welcome{position:relative;min-height:100vh;display:grid;place-items:center}
.welcome img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:.30;filter:brightness(.7)}
.welcome .actions{position:relative;z-index:2;display:flex;gap:16px;flex-wrap:wrap}
.header{display:flex;align-items:center;gap:12px;padding:14px 18px;border-bottom:1px solid #1b2238;background:#0b1123}
.header img{width:40px;height:40px}
.footer{padding:22px;text-align:center;border-top:1px solid #1b2238;background:#0b1123;opacity:.9}
.empty{display:grid;place-items:center;min-height:40vh;background:radial-gradient(ellipse at center,#0f1732,transparent 60%)}
.watermark{opacity:.08;font-size:140px;font-weight:800;letter-spacing:.2em}
`.trim());

  wr(path.join(PROJ,'src','main.jsx'), `
import React from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import './styles.css'
import Landing from './routes/Landing.jsx'
import Login from './routes/Login.jsx'
import Welcome from './routes/Welcome.jsx'
import Dashboard from './routes/Dashboard.jsx'
const router = createBrowserRouter([
  { path: '/', element: <Landing/> },
  { path: '/login', element: <Login/> },
  { path: '/welcome', element: <Welcome/> },
  { path: '/dashboard', element: <Dashboard/> }
])
createRoot(document.getElementById('root')).render(<RouterProvider router={router} />)
`.trim());

  wr(path.join(PROJ,'src','routes','Landing.jsx'), `
import React from 'react'
import hero from '../assets/brand/empire-hero.jpg'
export default function Landing(){
  return (
    <section className="hero">
      <img src={hero} alt="The Empire Hero" className="hero-bg" />
      <div className="hero-content">
        <h1>THE EMPIRE</h1>
        <p>Affiliate Command Intelligence • Real-Time Earnings • Global Performance Engine</p>
        <a className="btn" href="/login">Enter Command</a>
      </div>
    </section>
  )
}
`.trim());

  wr(path.join(PROJ,'src','routes','Login.jsx'), `
import React from 'react'
import logo from '../assets/brand/empire-logo.png'
export default function Login(){
  function onSubmit(e){ e.preventDefault(); localStorage.setItem('welcomeSeen','false'); window.location.href='/welcome' }
  return (
    <div className="login">
      <div className="login-card">
        <img src={logo} alt="Empire Logo" />
        <h2>⚔️ Commander Login ⚔️</h2>
        <form onSubmit={onSubmit}>
          <input type="password" placeholder="Access Key" required />
          <button className="btn" type="submit">Enter The Empire</button>
        </form>
        <p style={{opacity:.7, marginTop:10, fontSize:12}}>By entering you agree to Empire terms.</p>
      </div>
    </div>
  )
}
`.trim());

  wr(path.join(PROJ,'src','routes','Welcome.jsx'), `
import React, { useEffect } from 'react'
import launch from '../assets/brand/empire-launch.jpg'
export default function Welcome(){
  useEffect(()=>{ if(localStorage.getItem('welcomeSeen')==='true'){ window.location.replace('/dashboard') } },[])
  function goDash(){ localStorage.setItem('welcomeSeen','true'); window.location.href='/dashboard' }
  return (
    <div className="welcome">
      <img src={launch} alt="Empire Launch Poster" />
      <div className="actions">
        <button className="btn" onClick={goDash}>Go to Dashboard</button>
        <a className="btn" href="https://t.me/TheEmpireHq" target="_blank" rel="noreferrer">Join HQ Channel</a>
      </div>
    </div>
  )
}
`.trim());

  wr(path.join(PROJ,'src','routes','Dashboard.jsx'), `
import React from 'react'
import logo from '../assets/brand/empire-logo.png'
export default function Dashboard(){
  return (
    <div>
      <header className="header">
        <img src={logo} alt="Empire Logo" />
        <h1>The Empire Dashboard</h1>
      </header>
      <main>
        <section className="empty"><div className="watermark">AFFILIATE COMMAND</div></section>
      </main>
      <footer className="footer"><p>Commanding the Future of Affiliate Marketing</p></footer>
    </div>
  )
}
`.trim());
}

const isReact = ex(path.join(PROJ,'package.json')) && /react/i.test(rd(path.join(PROJ,'package.json')));
if (isReact){ console.log('Detected React project → wiring frames into SPA routes…'); patchReact(); }
else if (ex(path.join(PROJ,'dashboard.html')) || ex(path.join(PROJ,'index.html'))){ console.log('Detected Static HTML project → wiring frames into pages…'); patchStatic(); }
else { console.log('No structure detected → creating STATIC scaffold…'); patchStatic(); }

console.log('\\nALL SET ✅  Flow: / → /login → /welcome (one-time) → /dashboard');
console.log('Replace placeholder art at assets/brand/* when ready.');
