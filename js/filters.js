/* Sold-homes pill filters. Exposes window.initSoldHomes(homes). */
(function () {
  const CITIES = ['San Jose', 'Santa Clara', 'Sunnyvale', 'Mountain View'];
  const TYPES = ['House', 'Townhome', 'Condo'];
  const BANDS = [
    { key: 'under-1m', label: 'Under $1M', test: (p) => p < 1000000 },
    { key: '1-1.5m', label: '$1M–$1.5M', test: (p) => p >= 1000000 && p < 1500000 },
    { key: '1.5-2m', label: '$1.5M–$2M', test: (p) => p >= 1500000 && p < 2000000 },
    { key: '2-2.5m', label: '$2M–$2.5M', test: (p) => p >= 2000000 && p < 2500000 },
    { key: 'over-2.5m', label: 'Over $2.5M', test: (p) => p >= 2500000 },
  ];

  const state = { city: new Set(), band: new Set(), type: new Set() };

  const usd = (n) => '$' + Number(n).toLocaleString('en-US');
  const bandKeyOf = (price) => (BANDS.find((b) => b.test(price)) || {}).key;
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function matches(home) {
    const cityOk = state.city.size === 0 || state.city.has(home.city);
    const bandOk = state.band.size === 0 || state.band.has(bandKeyOf(home.price));
    const typeOk = state.type.size === 0 || state.type.has(home.type);
    return cityOk && bandOk && typeOk;
  }

  function pill(label, group, value) {
    const b = document.createElement('button');
    b.className = 'pill';
    b.type = 'button';
    b.textContent = label;
    b.setAttribute('aria-pressed', 'false');
    b.addEventListener('click', () => {
      const set = state[group];
      if (set.has(value)) { set.delete(value); b.setAttribute('aria-pressed', 'false'); }
      else { set.add(value); b.setAttribute('aria-pressed', 'true'); }
      apply();
    });
    return b;
  }

  function homeCard(h) {
    return `<article class="card home-card">
      <div class="home-photo">${h.image ? `<img src="${esc(h.image)}" alt="${esc(h.address)}" style="width:100%;height:100%;object-fit:cover">` : 'SOLD'}</div>
      <div class="home-body">
        <p class="home-price">${usd(h.price)}</p>
        <p class="home-addr">${esc(h.address)}</p>
        <div class="home-tags">
          <span class="tag">${esc(h.city)}</span>
          <span class="tag tag--type">${esc(h.type)}</span>
        </div>
        <p class="specs">${esc(h.beds)} bd · ${esc(h.baths)} ba · ${Number(h.sqft).toLocaleString()} sqft${h.soldDate ? ' · Sold ' + esc(h.soldDate) : ''}</p>
      </div>
    </article>`;
  }

  let allHomes = [];

  function apply() {
    const grid = document.getElementById('homesGrid');
    const count = document.getElementById('resultCount');
    const clearBtn = document.getElementById('clearFilters');
    const filtered = allHomes.filter(matches);
    const anyActive = state.city.size || state.band.size || state.type.size;

    clearBtn.hidden = !anyActive;
    count.textContent = `Showing ${filtered.length} of ${allHomes.length} sold homes`;

    if (!filtered.length) {
      grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1">
        <p>No sold homes match these filters.</p>
        <button class="btn btn--primary" id="emptyClear" type="button">Clear filters</button>
      </div>`;
      const ec = document.getElementById('emptyClear');
      if (ec) ec.addEventListener('click', clearAll);
      return;
    }
    grid.innerHTML = filtered.map(homeCard).join('');
  }

  function clearAll() {
    state.city.clear(); state.band.clear(); state.type.clear();
    document.querySelectorAll('#sold .pill').forEach((p) => p.setAttribute('aria-pressed', 'false'));
    apply();
  }

  window.initSoldHomes = function (data) {
    allHomes = (data && data.homes) || [];
    const cityWrap = document.getElementById('filterCity');
    const bandWrap = document.getElementById('filterBand');
    const typeWrap = document.getElementById('filterType');

    CITIES.forEach((c) => cityWrap.appendChild(pill(c, 'city', c)));
    BANDS.forEach((b) => bandWrap.appendChild(pill(b.label, 'band', b.key)));
    TYPES.forEach((t) => typeWrap.appendChild(pill(t, 'type', t)));

    document.getElementById('clearFilters').addEventListener('click', clearAll);
    apply();
  };
})();
