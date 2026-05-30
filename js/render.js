/* DOM render helpers. Attached to window for use by main.js. */
(function () {
  const esc = (s) =>
    String(s == null ? '' : s).replace(/[&<>"']/g, (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // ---- Leading indicators table ----
  window.renderIndicators = function (data) {
    const body = document.getElementById('indicatorsBody');
    if (!data || !data.rows || !data.rows.length) {
      body.innerHTML = '<tr><td colspan="4" style="padding:24px;color:var(--slate)">Indicators unavailable.</td></tr>';
      return;
    }
    body.innerHTML = data.rows.map((r) => {
      const isGood =
        r.direction === 'flat' ? null :
        (r.good_when === 'down' ? r.direction === 'down' : r.direction === 'up');
      const cls = isGood == null ? 'flat' : isGood ? 'good' : 'bad';
      const arrow = r.direction === 'up' ? '▲' : r.direction === 'down' ? '▼' : '–';
      const sign = r.delta > 0 ? '+' : '';
      return `<tr>
        <td>${esc(r.label)}</td>
        <td class="val">${esc(r.value)}${esc(r.unit || '')}</td>
        <td><span class="delta ${cls}"><span class="arrow">${arrow}</span>${sign}${esc(r.delta)}${esc(r.unit || '')}</span></td>
        <td class="period">${esc(r.deltaPeriod || '')}</td>
      </tr>`;
    }).join('');
  };

  // ---- News ----
  window.renderNews = function (data) {
    const grid = document.getElementById('newsGrid');
    const items = (data && data.items) || [];
    if (!items.length) { grid.innerHTML = '<div class="card">No news available right now.</div>'; return; }
    grid.innerHTML = items.map((n) => `
      <a class="card news-item" href="${esc(n.link)}" target="_blank" rel="noopener">
        <p class="news-meta">${esc(n.source || 'News')}${n.published ? ' · ' + esc(n.published) : ''}</p>
        <h3>${esc(n.title)}</h3>
        ${n.summary ? `<p>${esc(n.summary)}</p>` : ''}
      </a>`).join('');
  };

  // ---- Books / journals ----
  function litItem(it) {
    const link = it.link
      ? ` <a href="${esc(it.link)}" target="_blank" rel="noopener">read more →</a>`
      : '';
    return `<div class="lit-item">
      <h4>${esc(it.title)}</h4>
      <p class="by">${esc(it.author || '')}${it.year ? ' · ' + esc(it.year) : ''}</p>
      <p>${esc(it.summary || '')}${link}</p>
    </div>`;
  }
  window.renderLit = function (elId, data) {
    const el = document.getElementById(elId);
    const items = (data && data.items) || [];
    el.innerHTML = items.length ? items.map(litItem).join('') : 'No items available.';
  };

  // ---- Footer "last updated" ----
  window.renderMeta = function (meta) {
    const el = document.getElementById('dataUpdated');
    if (!el || !meta || !meta.lastRun) return;
    const d = new Date(meta.lastRun);
    const when = isNaN(d) ? meta.lastRun : d.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
    el.innerHTML = `<div style="margin-top:8px">Market data last updated: <strong>${esc(when)}</strong></div>`;
  };
})();
