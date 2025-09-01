/* Empire global frame injector (idempotent) */
(async function(){
  if (window.__EMPIRE_FRAME_INJECTED) return;               // guard: script included twice
  window.__EMPIRE_FRAME_INJECTED = true;

  // if already present (manually placed), do nothing
  if (document.querySelector('#empire-header') || document.querySelector('#empire-footer')) return;

  try {
    const resp = await fetch('/empire-frame.html', { cache: 'no-cache' });
    if (!resp.ok) return;
    const html = await resp.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const header = doc.querySelector('#empire-header');
    const footer = doc.querySelector('#empire-footer');
    if (header) document.body.insertAdjacentElement('afterbegin', header);
    if (footer) document.body.insertAdjacentElement('beforeend', footer);
  } catch (e) {
    console.error('Empire frame injection failed:', e);
  }
})();
