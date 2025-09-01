(function(){
  async function inject(where, url){
    try {
      const r = await fetch(url, { cache: 'no-cache' });
      if(!r.ok) return;
      const html = await r.text();
      const mount = document.getElementById(where);
      if (mount) mount.outerHTML = html;
    } catch {}
  }
  // Create mounts if the page doesn't have them
  if (!document.getElementById('empire-header')) {
    const h = document.createElement('div'); h.id = 'empire-header';
    document.body.insertAdjacentElement('afterbegin', h);
  }
  if (!document.getElementById('empire-tabs')) {
    const t = document.createElement('div'); t.id = 'empire-tabs';
    document.body.insertAdjacentElement('afterbegin', t);
  }
  if (!document.getElementById('empire-footer')) {
    const f = document.createElement('div'); f.id = 'empire-footer';
    document.body.insertAdjacentElement('beforeend', f);
  }
  inject('empire-header', '/fragments/header.html');
  inject('empire-tabs',   '/fragments/tabs.html');
  inject('empire-footer', '/fragments/footer.html');
})();
// --- Layout safety + active tab highlight ---
(function(){
  // Ensure all page content sits in a padded container
  const already = document.querySelector('main.emp-shell');
  if (!already) {
    const m = document.querySelector('main') || document.createElement('main');
    if (!m.parentNode) {
      while (document.body.firstChild) m.appendChild(document.body.firstChild);
      document.body.appendChild(m);
    }
    m.classList.add('emp-shell');
  }

  // Highlight the correct tab for the current route
  const path = (location.pathname.replace(/\/+$/,'') || '/');
  const map = {
    '/':'welcome','/index.html':'welcome','/welcome.html':'welcome',
    '/login.html':'login',
    '/dashboard.html':'dashboard'
  };
  const active = map[path];
  document.querySelectorAll('.emp-tabs .tab')
    .forEach(a => a.classList.toggle('active', a.dataset.key === active));
})();
// ==== Overlay fix & active tab highlight ====
(function(){
  // Ensure content wrapper exists
  const ensureShell = () => {
    let shell = document.querySelector('main.emp-shell');
    if (!shell) {
      const m = document.querySelector('main') || document.createElement('main');
      if (!m.parentNode) {
        while (document.body.firstChild) m.appendChild(document.body.firstChild);
        document.body.appendChild(m);
      }
      m.classList.add('emp-shell');
      shell = m;
    }
    return shell;
  };

  const measure = () => {
    const topbar = document.querySelector('.empire-topbar');
    const tabs   = document.querySelector('.emp-tabs');
    const hTop   = topbar ? topbar.offsetHeight : 0;
    const hTabs  = tabs   ? tabs.offsetHeight   : 0;
    const gap    = 16; // breathing space
    const safe   = hTop + hTabs + gap;
    document.documentElement.style.setProperty('--topbar-h', hTop + 'px');
    document.documentElement.style.setProperty('--safe-top',  safe + 'px');
  };

  // Highlight current tab
  const setActiveTab = () => {
    const path = (location.pathname.replace(/\/+$/,'') || '/');
    const map = {
      '/':'welcome','/index.html':'welcome','/welcome.html':'welcome',
      '/login.html':'login',
      '/dashboard.html':'dashboard'
    };
    const key = map[path];
    document.querySelectorAll('.emp-tabs .tab')
      .forEach(a => a.classList.toggle('active', a.dataset.key === key));
  };

  ensureShell();
  measure();
  setActiveTab();
  // recalc on resize and after fonts/images
  window.addEventListener('load', measure, { once:true });
  window.addEventListener('resize', () => { clearTimeout(window.__empReflow); window.__empReflow=setTimeout(measure,120); });
})();
