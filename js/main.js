/* Bootstraps the page: loads every JSON file independently so one failure never
   blanks the page, then hands data to the section renderers. */
(function () {
  async function loadJson(path) {
    const res = await fetch(path, { cache: 'no-store' });
    if (!res.ok) throw new Error(`${path} -> HTTP ${res.status}`);
    return res.json();
  }

  function hydrate(path, fn) {
    loadJson(path).then(fn).catch((e) => console.error('Failed to load', path, e));
  }

  document.addEventListener('DOMContentLoaded', () => {
    // Back-to-top button: show after scrolling down a bit
    const toTop = document.getElementById('toTop');
    if (toTop) {
      const onScroll = () => toTop.classList.toggle('show', window.scrollY > 500);
      window.addEventListener('scroll', onScroll, { passive: true });
      onScroll();
    }

    // Mobile nav toggle
    const toggle = document.getElementById('navToggle');
    const links = document.getElementById('navLinks');
    if (toggle && links) {
      toggle.addEventListener('click', () => links.classList.toggle('open'));
      links.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => links.classList.remove('open')));
    }

    // Market-trends tabs
    const tabs = document.querySelectorAll('.tab');
    tabs.forEach((tab) => tab.addEventListener('click', () => {
      tabs.forEach((t) => t.setAttribute('aria-selected', 'false'));
      tab.setAttribute('aria-selected', 'true');
      document.querySelectorAll('.tabpanel').forEach((p) => p.classList.remove('active'));
      const panel = document.getElementById('tab-' + tab.dataset.tab);
      if (panel) panel.classList.add('active');
    }));

    // News carousel arrows (mobile users just swipe)
    const track = document.getElementById('newsGrid');
    const scrollBy = () => Math.max(260, Math.round((track ? track.clientWidth : 300) * 0.85));
    const prev = document.getElementById('newsPrev');
    const next = document.getElementById('newsNext');
    if (track && prev) prev.addEventListener('click', () => track.scrollBy({ left: -scrollBy(), behavior: 'smooth' }));
    if (track && next) next.addEventListener('click', () => track.scrollBy({ left: scrollBy(), behavior: 'smooth' }));

    // Data-driven sections
    hydrate('data/indicators.json', (d) => { window.renderStatTiles(d); window.renderIndicators(d); window.renderTrendTabs(d); });
    hydrate('data/mortgage-rates.json', (d) => { window.renderMortgageChart(d); if (window.applyLiveRate) window.applyLiveRate(d); });
    hydrate('data/news.json', window.renderNews);
    hydrate('data/books.json', (d) => window.renderLit('booksList', d));
    hydrate('data/journals.json', (d) => window.renderLit('journalsList', d));
    hydrate('data/meta.json', window.renderMeta);
  });
})();
