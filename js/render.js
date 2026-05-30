/* DOM render helpers. Attached to window for use by main.js. */
(function () {
  const esc = (s) =>
    String(s == null ? '' : s).replace(/[&<>"']/g, (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // Shared delta styling (good/bad/flat + arrow) used by table and stat tiles.
  function deltaParts(r) {
    const isGood =
      r.direction === 'flat' ? null :
      (r.good_when === 'down' ? r.direction === 'down' : r.direction === 'up');
    return {
      cls: isGood == null ? 'flat' : isGood ? 'good' : 'bad',
      arrow: r.direction === 'up' ? '▲' : r.direction === 'down' ? '▼' : '–',
      sign: r.delta > 0 ? '+' : '',
    };
  }

  // ---- Live stat tiles (Market Trends) ----
  window.renderStatTiles = function (data) {
    const el = document.getElementById('trendStats');
    if (!el) return;
    const rows = (data && data.rows) || [];
    if (!rows.length) { el.innerHTML = '<p style="color:var(--slate)">Live stats unavailable right now.</p>'; return; }
    el.innerHTML = rows.map((r) => {
      const d = deltaParts(r);
      return `<div class="stat-tile">
        <div class="stat-tile-val">${esc(r.value)}${esc(r.unit || '')}</div>
        <div class="stat-tile-label">${esc(r.label)}</div>
        <div class="delta ${d.cls}"><span class="arrow">${d.arrow}</span>${d.sign}${esc(r.delta)}${esc(r.unit || '')} <span class="period">${esc(r.deltaPeriod || '')}</span></div>
      </div>`;
    }).join('');
  };

  // ---- Leading indicators table ----
  window.renderIndicators = function (data) {
    const body = document.getElementById('indicatorsBody');
    if (!data || !data.rows || !data.rows.length) {
      body.innerHTML = '<tr><td colspan="4" style="padding:24px;color:var(--slate)">Indicators unavailable.</td></tr>';
      return;
    }
    body.innerHTML = data.rows.map((r) => {
      const d = deltaParts(r);
      return `<tr>
        <td>${esc(r.label)}</td>
        <td class="val">${esc(r.value)}${esc(r.unit || '')}</td>
        <td><span class="delta ${d.cls}"><span class="arrow">${d.arrow}</span>${d.sign}${esc(r.delta)}${esc(r.unit || '')}</span></td>
        <td class="period">${esc(r.deltaPeriod || '')}</td>
      </tr>`;
    }).join('');
  };

  // ---- News (live, daily) ----
  // Google News titles end with " - Source"; strip that since we show the source separately.
  function cleanTitle(t, source) {
    let s = String(t || '');
    if (source && s.endsWith(' - ' + source)) s = s.slice(0, -(source.length + 3));
    return s.replace(/\s+-\s+[^-]+$/,'').trim() || s.trim();
  }
  window.renderNews = function (data) {
    const grid = document.getElementById('newsGrid');
    const items = (data && data.items) || [];
    if (!items.length) { grid.innerHTML = '<div class="card">No news available right now.</div>'; return; }
    grid.innerHTML = items.map((n) => `
      <a class="card news-item" href="${esc(n.link)}" target="_blank" rel="noopener">
        <p class="news-meta">${esc(n.source || 'News')}${n.published ? ' · ' + esc(n.published) : ''}</p>
        <h3>${esc(cleanTitle(n.title, n.source))}</h3>
        <span class="news-readmore">Read article →</span>
      </a>`).join('');
  };

  // ---- Books / journals (rich multi-paragraph summaries, no outbound links) ----
  function litItem(it) {
    const paras = Array.isArray(it.summary) ? it.summary : [it.summary || ''];
    return `<div class="lit-item">
      <h4>${esc(it.title)}</h4>
      <p class="by">${esc(it.author || '')}${it.year ? ' · ' + esc(it.year) : ''}</p>
      ${paras.map((p) => `<p>${esc(p)}</p>`).join('')}
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
