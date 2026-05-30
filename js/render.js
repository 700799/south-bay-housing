/* DOM render helpers. Attached to window for use by main.js. */
(function () {
  const esc = (s) =>
    String(s == null ? '' : s).replace(/[&<>"']/g, (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const WINDOWS = [['7d', '7-Day'], ['14d', '14-Day'], ['30d', '30-Day'], ['60d', '60-Day']];

  // Good/bad/flat styling for a given change relative to whether up or down is "good".
  function dParts(direction, delta, good_when) {
    const isGood =
      direction === 'flat' ? null :
      (good_when === 'down' ? direction === 'down' : direction === 'up');
    return {
      cls: isGood == null ? 'flat' : isGood ? 'good' : 'bad',
      arrow: direction === 'up' ? '▲' : direction === 'down' ? '▼' : '–',
      sign: delta > 0 ? '+' : '',
    };
  }

  // Render a single change (e.g. the 7-day delta) as a colored span.
  function changeCell(ch, unit, good_when) {
    if (!ch || ch.delta == null) return '<span class="delta flat">–</span>';
    const p = dParts(ch.direction, ch.delta, good_when);
    return `<span class="delta ${p.cls}"><span class="arrow">${p.arrow}</span>${p.sign}${esc(ch.delta)}${esc(unit || '')}</span>`;
  }

  // ---- Live stat tiles (Market Trends): value + 7-day and 30-day comparisons ----
  window.renderStatTiles = function (data) {
    const el = document.getElementById('trendStats');
    if (!el) return;
    const rows = (data && data.rows) || [];
    if (!rows.length) { el.innerHTML = '<p style="color:var(--slate)">Live stats unavailable right now.</p>'; return; }
    el.innerHTML = rows.map((r) => {
      const c = r.changes || {};
      return `<div class="stat-tile">
        <div class="stat-tile-val">${esc(r.value)}${esc(r.unit || '')}</div>
        <div class="stat-tile-label">${esc(r.label)}</div>
        <div class="stat-tile-changes">
          <span class="chg"><span class="chg-k">7d</span> ${changeCell(c['7d'], r.unit, r.good_when)}</span>
          <span class="chg"><span class="chg-k">30d</span> ${changeCell(c['30d'], r.unit, r.good_when)}</span>
        </div>
      </div>`;
    }).join('');
  };

  // ---- Leading indicators table: 7 / 14 / 30 / 60-day comparison columns ----
  window.renderIndicators = function (data) {
    const head = document.getElementById('indicatorsHead');
    const body = document.getElementById('indicatorsBody');
    if (head) head.innerHTML = `<tr><th>Indicator</th><th>Latest</th>${WINDOWS.map((w) => `<th>${w[1]}</th>`).join('')}</tr>`;
    if (!data || !data.rows || !data.rows.length) {
      body.innerHTML = '<tr><td colspan="6" style="padding:24px;color:var(--slate)">Indicators unavailable.</td></tr>';
      return;
    }
    body.innerHTML = data.rows.map((r) => {
      const c = r.changes || {};
      const cells = WINDOWS.map((w) => `<td>${changeCell(c[w[0]], r.unit, r.good_when)}</td>`).join('');
      return `<tr>
        <td>${esc(r.label)}</td>
        <td class="val">${esc(r.value)}${esc(r.unit || '')}</td>
        ${cells}
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
