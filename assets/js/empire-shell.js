// /assets/js/empire-shell.js
(function () {
  function isAuthed() {
    try { return !!(window.EmpireAuth && window.EmpireAuth.has && window.EmpireAuth.has()); }
    catch { return false; }
  }

  const authed = isAuthed();

  const LINKS = [
    { href: "/welcome.html",   label: "Welcome", show: true },
    { href: "/login.html",     label: "Commander Login", show: !authed },
    { href: "/dashboard.html", label: "Dashboard", show: true } // keep visible; CTA handles smart jump
  ];

  function isActive(href) {
    try {
      const here = location.pathname.replace(/\/+$/, "") || "/index.html";
      const there = href.replace(/\/+$/, "");
      if (here === "" || here === "/") return (there === "/welcome.html");
      return here === there;
    } catch { return false; }
  }

  function navHTML() {
    return LINKS.filter(l => l.show).map(l => `
      <a class="emp-nav__link ${isActive(l.href) ? "active" : ""}" href="${l.href}">
        ${l.label}
      </a>
    `).join("");
  }

  const headerHTML = `
    <div class="emp-header__inner">
      <a class="emp-brand" href="/welcome.html" aria-label="The Empire">
        <img src="/assets/brand/empire-logo.png" alt="Empire crown" />
        <span class="emp-brand__title">THE EMPIRE <small>— Command Interface</small></span>
      </a>
      <nav class="emp-nav" aria-label="Primary">${navHTML()}</nav>

      <div class="emp-cta">
        <a id="emp-enter-btn" class="emp-enter-btn" href="${authed ? "/dashboard.html" : "/login.html"}">
          Enter Empire
        </a>
      </div>
    </div>
  `;

  const footerHTML = `
    <div class="emp-footer__inner">
      <p>Commanding the Future of Affiliate Marketing</p>
      <small>© ${new Date().getFullYear()} The Empire</small>
    </div>
  `;

  function inject(id, html) {
    const slot = document.getElementById(id);
    if (slot) slot.innerHTML = html;
  }

  // Inline styles (kept minimal and consistent with your theme)
  const css = `
    .emp-header{background:#121624;border-bottom:1px solid rgba(255,255,255,.06);box-shadow:0 8px 20px -12px rgba(0,0,0,.5)}
    .emp-header__inner{max-width:980px;margin:0 auto;padding:14px 16px;display:flex;align-items:center;gap:16px}
    .emp-brand{display:flex;align-items:center;gap:10px;text-decoration:none;color:#e8eaed}
    .emp-brand img{width:28px;height:28px;border-radius:6px;box-shadow:0 6px 18px -8px rgba(241,196,15,.8)}
    .emp-brand__title{font-weight:700}
    .emp-brand__title small{color:#b6b9c2;font-weight:500}
    .emp-nav{margin-left:auto;display:flex;gap:10px;flex-wrap:wrap}
    .emp-nav__link{display:inline-block;padding:8px 10px;border:1px solid rgba(255,255,255,.07);border-radius:10px;color:#e8eaed;text-decoration:none;background:#1a2030}
    .emp-nav__link:hover{border-color:#2dd4bf}
    .emp-nav__link.active{border-color:#2dd4bf;color:#2dd4bf}
    .emp-cta{margin-left:10px}
    .emp-enter-btn{display:inline-block;padding:8px 12px;border-radius:10px;background:#2dd4bf;color:#06111d;font-weight:800;text-decoration:none;border:1px solid #0e6e63}
    .emp-enter-btn:hover{filter:brightness(1.05)}
    .emp-footer{margin-top:24px;border-top:1px solid rgba(255,255,255,.06);background:#0f1520}
    .emp-footer__inner{max-width:980px;margin:0 auto;padding:16px;color:#b6b9c2;text-align:center}
    @media (max-width:740px){
      .emp-nav{display:none} /* keep header clean on small screens; CTA remains */
    }
  `;
  const style = document.createElement("style");
  style.textContent = css;
  document.head.appendChild(style);

  window.addEventListener("DOMContentLoaded", () => {
    inject("emp-header", headerHTML);
    inject("emp-footer", footerHTML);

    // Keep CTA accurate if auth state changes on this page
    const btn = document.getElementById("emp-enter-btn");
    if (btn) {
      try {
        btn.setAttribute("href", isAuthed() ? "/dashboard.html" : "/login.html");
      } catch {}
    }
  });
})();