/* Curated listings browser: photo-card grid with pill filters (status, city,
   type). Data comes from data/listings.json, which is edited by hand. Exposes
   window.renderListings. Filters: OR within a group, AND across groups. */
(function () {
  const esc = (s) =>
    String(s == null ? '' : s).replace(/[&<>"']/g, (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const STATUS = { active: 'For sale', pending: 'Pending', sold: 'Sold' };
  const STATUS_ORDER = { active: 0, pending: 1, sold: 2 };

  const fmtPrice = (n) => '$' + Math.round(Number(n) || 0).toLocaleString('en-US');
  const fmtNum = (n) => Number(n).toLocaleString('en-US');
  const fmtDate = (iso) => {
    const d = new Date(iso);
    return isNaN(d) ? '' : d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

  function card(h) {
    const status = STATUS[h.status] ? h.status : 'active';
    const specs = [
      h.beds != null ? `${esc(h.beds)} bd` : '',
      h.baths != null ? `${esc(h.baths)} ba` : '',
      h.sqft ? `${fmtNum(h.sqft)} sq ft` : '',
      h.lot ? `${fmtNum(h.lot)} sq ft lot` : '',
    ].filter(Boolean).join(' · ');
    const photo = h.photo
      ? `<img src="${esc(h.photo)}" alt="${esc(h.address)}, ${esc(h.city)}" loading="lazy" onerror="this.parentNode.classList.add('no-photo');this.remove()" />`
      : '';
    const dateLabel = h.date ? (status === 'sold' ? 'Sold ' : 'Listed ') + fmtDate(h.date) : '';
    const detailMsg = `Hi Anna, I'd like more details on ${h.address}, ${h.city}.`;
    const link = h.url
      ? `<a class="home-link" href="${esc(h.url)}" target="_blank" rel="noopener">View listing →</a>`
      : '';
    return `<article class="card home-card${h.photo ? '' : ' no-photo'}" data-status="${status}">
      <div class="home-photo">
        ${photo}
        <span class="home-status home-status--${status}">${STATUS[status]}</span>
        ${h.sample ? '<span class="home-sample">Sample</span>' : ''}
      </div>
      <div class="home-body">
        <p class="home-price">${fmtPrice(h.price)}${status === 'sold' ? ' <span class="home-sold-note">sale price</span>' : ''}</p>
        <p class="home-addr"><strong>${esc(h.address)}</strong><br>${esc(h.city)}${h.neighborhood ? ' · ' + esc(h.neighborhood) : ''}, CA</p>
        ${specs ? `<p class="specs">${specs}</p>` : ''}
        <div class="home-tags">
          ${h.type ? `<span class="tag tag--type">${esc(h.type)}</span>` : ''}
          ${h.year ? `<span class="tag">Built ${esc(h.year)}</span>` : ''}
          ${dateLabel ? `<span class="tag">${esc(dateLabel)}</span>` : ''}
        </div>
        ${h.blurb ? `<p class="home-blurb">${esc(h.blurb)}</p>` : ''}
        <div class="home-actions">
          <a href="#contact" class="home-ask" data-close data-prefill="${esc(detailMsg)}">${status === 'sold' ? 'Ask about similar homes →' : 'Request details →'}</a>
          ${link}
        </div>
      </div>
    </article>`;
  }

  function pillGroup(label, key, values, selected) {
    if (values.length < 2) return '';
    return `<div class="filter-group">
      <div class="filter-label">${esc(label)}</div>
      <div class="pills" data-filter="${key}">
        ${values.map((v) => `<button type="button" class="pill" data-value="${esc(v.value)}" aria-pressed="${selected.has(v.value)}">${esc(v.label)}</button>`).join('')}
      </div>
    </div>`;
  }

  window.renderListings = function (data) {
    const root = document.getElementById('listingsRoot');
    if (!root) return;
    const items = ((data && data.items) || []).slice()
      .sort((a, b) => (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9) || String(b.date || '').localeCompare(String(a.date || '')));

    if (!items.length) {
      root.innerHTML = '<div class="empty-state">No listings posted right now — <a href="#contact" class="linklike" data-close>reach out</a> to hear about homes before they hit the market.</div>';
      return;
    }

    const uniq = (arr) => Array.from(new Set(arr.filter(Boolean)));
    const statuses = uniq(items.map((h) => h.status)).sort((a, b) => (STATUS_ORDER[a] ?? 9) - (STATUS_ORDER[b] ?? 9));
    const cities = uniq(items.map((h) => h.city)).sort();
    const types = uniq(items.map((h) => h.type)).sort();
    const sel = { status: new Set(), city: new Set(), type: new Set() };

    function draw() {
      const shown = items.filter((h) =>
        (!sel.status.size || sel.status.has(h.status)) &&
        (!sel.city.size || sel.city.has(h.city)) &&
        (!sel.type.size || sel.type.has(h.type)));
      const any = sel.status.size + sel.city.size + sel.type.size > 0;
      const hasSample = shown.some((h) => h.sample);
      root.innerHTML = `
        ${pillGroup('Status', 'status', statuses.map((s) => ({ value: s, label: STATUS[s] || s })), sel.status)}
        ${pillGroup('City', 'city', cities.map((c) => ({ value: c, label: c })), sel.city)}
        ${pillGroup('Property type', 'type', types.map((t) => ({ value: t, label: t })), sel.type)}
        <div class="filter-bar">
          <span class="result-count">${shown.length} of ${items.length} home${items.length === 1 ? '' : 's'}</span>
          ${any ? '<button type="button" class="clear-btn" data-clear>Clear filters</button>' : ''}
        </div>
        ${shown.length
          ? `<div class="listings-grid">${shown.map(card).join('')}</div>`
          : '<div class="empty-state">No homes match those filters.</div>'}
        ${hasSample ? '<p class="checklist-note"><strong>Sample listings</strong> are placeholders showing the layout — not real homes. Replace them in <code>data/listings.json</code>.</p>' : ''}`;
    }

    root.addEventListener('click', (e) => {
      const pill = e.target.closest('.pill');
      if (pill) {
        const key = pill.parentNode.getAttribute('data-filter');
        const v = pill.getAttribute('data-value');
        sel[key].has(v) ? sel[key].delete(v) : sel[key].add(v);
        draw();
        return;
      }
      if (e.target.closest('[data-clear]')) {
        Object.values(sel).forEach((s) => s.clear());
        draw();
        return;
      }
      const ask = e.target.closest('[data-prefill]');
      if (ask) {
        const msg = document.getElementById('cmsg');
        const intent = document.getElementById('cintent');
        if (msg && !msg.value.trim()) msg.value = ask.getAttribute('data-prefill');
        if (intent) intent.value = 'Buying a home';
      }
    });

    draw();

    // Hub card chip: "3 for sale · 2 sold"
    const nActive = items.filter((h) => h.status === 'active').length;
    const nSold = items.filter((h) => h.status === 'sold').length;
    const parts = [];
    if (nActive) parts.push(`${nActive} for sale`);
    if (nSold) parts.push(`${nSold} sold`);
    if (parts.length && window.setCardStat) window.setCardStat('listings', parts.join(' · '), nActive > 0);
  };

  // IDX embed: reveal the "Search all homes" block only when an embed has been
  // pasted into #idxEmbed (anything beyond the HTML comment placeholder).
  document.addEventListener('DOMContentLoaded', () => {
    const idx = document.getElementById('idxEmbed');
    const block = document.getElementById('idxBlock');
    if (idx && block && idx.children.length) block.hidden = false;
  });
})();
