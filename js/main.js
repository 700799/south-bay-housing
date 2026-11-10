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

    // Hub card live-stat helpers
    const setStat = (id, html, live) => window.setCardStat && window.setCardStat(id, html, live);
    const usdShort = (v) => {
      v = Number(v);
      if (Math.abs(v) >= 1e6) return '$' + (v / 1e6).toFixed(2).replace(/\.?0+$/, '') + 'M';
      if (Math.abs(v) >= 1e3) return '$' + Math.round(v / 1e3) + 'K';
      return '$' + Math.round(v).toLocaleString('en-US');
    };
    const setPreview = (id, lines) => window.setCardPreview && window.setCardPreview(id, lines);
    const val = (r) => (r.format === 'usd' ? usdShort(r.value) : r.value + (r.unit || ''));
    const num = (v) => Number(v).toLocaleString('en-US');
    // " · ▲ +0.05 in 7d" style change fragment for a row, or '' when flat/missing.
    const chg = (r, w) => {
      const c = r && r.changes && r.changes[w];
      if (!c || !c.delta) return '';
      const d = r.format === 'usd' ? usdShort(Math.abs(c.delta)) : Math.abs(c.delta) + (r.unit || '');
      return ` · ${c.delta > 0 ? '▲ +' : '▼ −'}${d} in ${w}`;
    };
    const pair = (a, b) => [a, b].filter(Boolean).join(' · ');

    function updateMarketCards(d) {
      const rows = (d && d.rows) || [];
      const by = {}; rows.forEach((r) => { by[r.key] = r; });
      if (by.listprice) setStat('market', 'Median list ' + usdShort(by.listprice.value), true);
      else if (by.mortgage30) setStat('market', by.mortgage30.value + '% 30-yr fixed', true);
      if (rows.length) setStat('indicators', rows.length + ' indicators tracked', true);
      setPreview('market', [
        by.mortgage30 && `30-yr fixed ${val(by.mortgage30)}${chg(by.mortgage30, '7d')}`,
        by.listprice && `Median list ${val(by.listprice)}${chg(by.listprice, '30d')}`,
        by.inventory && `${num(by.inventory.value)} homes for sale${chg(by.inventory, '60d')}`,
      ]);
      setPreview('indicators', [
        pair(by.dgs10 && `10-yr Treasury ${val(by.dgs10)}`, by.fedfunds && `Fed funds ${val(by.fedfunds)}`),
        pair(by.sjunrate && `SJ unemployment ${val(by.sjunrate)}`, by.umcsent && `Sentiment ${val(by.umcsent)}`),
        pair(by.dom && `${by.dom.value} days on market`, by.newlistings && `${num(by.newlistings.value)} new listings`),
      ]);
    }
    function updateMortgageCards(d) {
      const l = d && d.latest;
      if (!l) return;
      const r30 = l['30yr'], r15 = l['15yr'];
      if (r30 != null) {
        setStat('mortgage', r30 + '% · 30-yr fixed', true);
        setStat('calculator', 'Prefilled at ' + r30 + '%', true);
      }
      const s30 = ((d.series || {})['30yr'] || []).map((pt) => Number(pt.value)).filter((v) => !isNaN(v));
      const asOf = l.date ? new Date(l.date + 'T12:00:00') : null;
      setPreview('mortgage', [
        pair(r30 != null && `30-yr fixed ${r30}%`, r15 != null && `15-yr fixed ${r15}%`),
        s30.length ? `12-month range ${Math.min(...s30)}% – ${Math.max(...s30)}%` : '',
        asOf && !isNaN(asOf) ? `As of ${asOf.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} · Freddie Mac via FRED` : '',
      ]);
      // Sample payment: $1.5M, 20% down, 30-yr at today's rate + 1.25% tax + $1,800/yr insurance
      if (r30 != null) {
        const price = 1500000, loan = price * 0.8, i = r30 / 100 / 12, n = 360;
        const pi = i > 0 ? loan * i / (1 - Math.pow(1 + i, -n)) : loan / n;
        const monthly = pi + price * 0.0125 / 12 + 1800 / 12;
        setPreview('calculator', [
          `≈ $${num(Math.round(monthly))}/mo · $1.5M home, 20% down, ${r30}%`,
          'Adjust price, down payment, term, tax & HOA',
          'Full principal / interest / tax breakdown',
        ]);
      }
    }
    function updateNewsCard(d) {
      const items = (d && d.items) || [];
      if (items.length) setStat('news', items.length + ' recent headline' + (items.length === 1 ? '' : 's'), true);
      // Google News titles end with " - Source"; drop that suffix.
      const clean = (n) => String(n.title || '').replace(/\s+-\s+[^-]+$/, '').trim() || String(n.title || '');
      const short = (t) => (t.length > 64 ? t.slice(0, 61).replace(/\s+\S*$/, '') + '…' : t);
      setPreview('news', items.slice(0, 3).map((n) => short(clean(n))));
    }
    function updateListingsCard(d) {
      const all = (d && d.items) || [];
      // Reveal the nav button and hub card only once there is at least one home.
      document.querySelectorAll('[data-listings-entry]').forEach((el) => { el.hidden = !all.length; });
      const items = all.filter((h) => h.status !== 'sold');
      if (!items.length) {
        setPreview('listings', ['No homes posted right now', 'Ask about off-market & coming-soon homes', 'Recently sold homes appear here too']);
        return;
      }
      setPreview('listings', items.slice(0, 3).map((h) =>
        `$${num(Math.round(h.price))} · ${h.beds} bd / ${h.baths} ba · ${h.city}${h.status === 'pending' ? ' (pending)' : ''}`));
    }
    function updateCitiesCard(d) {
      const cities = (d && d.cities) || [];
      const total = cities.reduce((n, c) => n + ((c.neighborhoods || []).length), 0);
      if (total) setPreview('cities', [
        cities.map((c) => c.city).join(' · '),
        `${total} neighborhood guides: character, homes, who each fits`,
        'Links to active listings in each city',
      ]);
    }

    // Data-driven sections
    hydrate('data/indicators.json', (d) => { window.renderStatTiles(d); window.renderIndicators(d); window.renderTrendTabs(d); updateMarketCards(d); });
    hydrate('data/mortgage-rates.json', (d) => { window.renderMortgageChart(d); if (window.applyLiveRate) window.applyLiveRate(d); updateMortgageCards(d); });
    hydrate('data/news.json', (d) => { window.renderNews(d); updateNewsCard(d); });
    hydrate('data/neighborhoods.json', (d) => { window.renderNeighborhoods(d); updateCitiesCard(d); });
    hydrate('data/listings.json', (d) => { window.renderListings(d); updateListingsCard(d); });
    hydrate('data/books.json', (d) => window.renderLit('booksList', d));
    hydrate('data/journals.json', (d) => window.renderLit('journalsList', d));
    hydrate('data/meta.json', window.renderMeta);
  });
})();
