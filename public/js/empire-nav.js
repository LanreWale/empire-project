<script>
// Shared navbar + guards (Welcome -> Login -> Dashboard)
(function () {
  const path = (location.pathname || "/welcome").replace(/\/+$/,'') || "/welcome";
  const page = path.split("/").pop() || "welcome";

  // Require helper
  const hasAuth = !!(window.EmpireAuth && window.EmpireAuth.has());

  // Highlight active tab
  document.querySelectorAll('.emp-nav a').forEach(a => {
    const key = (a.getAttribute('data-tab')||'').toLowerCase();
    if (key === page) a.classList.add('active');
  });

  // Hide items that require auth
  document.querySelectorAll('[data-requires-auth]').forEach(el => {
    if (!hasAuth) el.style.display = 'none';
  });

  // Guard: dashboard needs auth
  if (page === 'dashboard' && !hasAuth) {
    const next = encodeURIComponent('/dashboard');
    location.replace('/login?next=' + next);
    return;
  }

  // NOTE: We DO NOT auto-redirect from welcome to dashboard,
  // even if already authed—per your required sequence.
})();
</script>