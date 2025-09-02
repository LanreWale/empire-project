// /assets/js/empire-shell.js
(function () {
  const LINKS = [
    { href: "/welcome.html",   label: "Welcome" },
    { href: "/login.html",     label: "Commander Login" },
    { href: "/dashboard.html", label: "Dashboard" },
  ];

  function isActive(href) {
    try {
      const here = location.pathname.replace(/\/+$/, "");
      const there = href.replace(/\/+$/, "");
      return here === there || (here === "/" && there === "/welcome.html");
    } catch { return false; }
  }

  function navHTML() {
    return LINKS.map(l => `
      <a class="emp-nav__link ${isActive(l.href) ? "active" : ""}" href="${l.href}">
        ${l.label}
      </a>`).join("");
  }

  const headerHTML = `
    <div class="emp-header__inner">
      <a class="emp-brand" href="/welcome.html" aria-label="The Empire">
        <img src="/assets/brand/empire-logo.png" alt="Empire crown" />
        <span class="emp-brand__title">THE EMPIRE <small>— Command Interface</small></span>
      </a>
      <nav class="emp-nav" aria-label="Primary">${navHTML()}</nav>
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

  // Inline styles so you don’t need a new CSS file.
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
    .emp-footer{margin-top:24px;border-top:1px solid rgba(255,255,255,.06);background:#0f1520}
    .emp-footer__inner{max-width:980px;margin:0 auto;padding:16px;color:#b6b9c2;text-align:center}
    @media (max-width:640px){ .emp-nav{justify-content:flex-end} }
  `;
  const style = document.createElement("style");
  style.textContent = css;
  document.head.appendChild(style);

  window.addEventListener("DOMContentLoaded", () => {
    inject("emp-header", headerHTML);
    inject("emp-footer", footerHTML);
  });
})();