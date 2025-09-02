// Empire Navigation + Guards
(function () {
  const path = (location.pathname || "/welcome").replace(/\/+$/,'') || "/welcome";
  const page = path.split("/").pop() || "welcome";

  // Token check
  const hasAuth = !!(window.EmpireAuth && window.EmpireAuth.has());

  // Highlight current tab
  document.querySelectorAll('.emp-nav a').forEach(a => {
    const key = (a.getAttribute('data-tab')||'').toLowerCase();
    if (key === page) a.classList.add('active');
  });

  // Hide items requiring auth
  document.querySelectorAll('[data-requires-auth]').forEach(el => {
    if (!hasAuth) el.style.display = 'none';
  });

  // Guard: prevent direct dashboard access without login
  if (page === 'dashboard' && !hasAuth) {
    const next = encodeURIComponent('/dashboard');
    location.replace('/login?next=' + next);
    return;
  }
})();