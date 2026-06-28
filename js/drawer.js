/* Drawer system: hub cards (and nav buttons) open a slide-in panel that holds
   the full section content. Panels live in the DOM at full size (translated
   off-canvas), so the chart, calculator, and data renderers keep working. */
(function () {
  let lastFocus = null;
  const scrim = () => document.getElementById('drawerScrim');

  function openDrawer(id) {
    const d = document.getElementById('drawer-' + id);
    if (!d) return;
    lastFocus = document.activeElement;
    if (scrim()) scrim().classList.add('show');
    d.classList.add('open');
    d.setAttribute('aria-hidden', 'false');
    document.body.classList.add('drawer-open');
    d.querySelector('.drawer-body') && d.querySelector('.drawer-body').scrollTo(0, 0);
    const close = d.querySelector('.drawer-close');
    if (close) close.focus();
    // collapse the mobile nav if it was open
    const links = document.getElementById('navLinks');
    if (links) links.classList.remove('open');
  }

  function closeAll() {
    let had = false;
    document.querySelectorAll('.drawer.open').forEach((d) => {
      d.classList.remove('open');
      d.setAttribute('aria-hidden', 'true');
      had = true;
    });
    if (scrim()) scrim().classList.remove('show');
    document.body.classList.remove('drawer-open');
    if (had && lastFocus && lastFocus.focus) lastFocus.focus();
  }

  document.addEventListener('click', (e) => {
    const opener = e.target.closest('[data-drawer]');
    if (opener) { e.preventDefault(); openDrawer(opener.getAttribute('data-drawer')); return; }
    if (e.target.closest('[data-close]') || e.target.id === 'drawerScrim') closeAll();
  });

  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeAll(); });

  // Simple focus trap: keep Tab inside the open drawer.
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab') return;
    const d = document.querySelector('.drawer.open');
    if (!d) return;
    const f = d.querySelectorAll('a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])');
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });

  // Called by main.js to fill a card's live stat chip once data loads.
  window.setCardStat = function (id, html, live) {
    const el = document.getElementById('cardStat-' + id);
    if (!el || html == null) return;
    el.innerHTML = html;
    if (live) el.classList.add('live');
  };
})();
