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

    // Data-driven sections
    hydrate('data/indicators.json', (d) => { window.renderStatTiles(d); window.renderIndicators(d); });
    hydrate('data/mortgage-rates.json', window.renderMortgageChart);
    hydrate('data/news.json', window.renderNews);
    hydrate('data/sold-homes.json', window.initSoldHomes);
    hydrate('data/books.json', (d) => window.renderLit('booksList', d));
    hydrate('data/journals.json', (d) => window.renderLit('journalsList', d));
    hydrate('data/meta.json', window.renderMeta);
  });
})();
