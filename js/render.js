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

  // Currency-aware formatting (row.format === 'usd').
  function fmtUsd(n) {
    const v = Number(n);
    if (Math.abs(v) >= 1e6) return '$' + (v / 1e6).toFixed(2).replace(/\.?0+$/, '') + 'M';
    if (Math.abs(v) >= 1e3) return '$' + Math.round(v / 1e3) + 'K';
    return '$' + Math.round(v).toLocaleString('en-US');
  }
  function fmtVal(r) {
    if (r.format === 'usd') return fmtUsd(r.value);
    return r.value + (r.unit || '');
  }
  function fmtDelta(ch, r) {
    if (r.format === 'usd') return (ch.delta > 0 ? '+' : ch.delta < 0 ? '-' : '') + fmtUsd(Math.abs(ch.delta));
    return (ch.delta > 0 ? '+' : '') + ch.delta + (r.unit || '');
  }

  // One-line "why it matters for buying or selling" per indicator.
  const WHY = {
    mortgage30: 'Sets your monthly payment and how much home you can afford.',
    mortgage15: 'A lower rate with faster payoff — popular with move-up buyers and refinances.',
    dgs10: 'Mortgage rates track this benchmark, so it hints where rates head next.',
    fedfunds: "The Fed's rate steers the direction of mortgage and loan costs.",
    sjunrate: 'Local job strength drives buyer demand and confidence across the South Bay.',
    umcsent: 'When confidence rises, more buyers act; when it falls, demand cools.',
    listprice: 'What sellers are asking today — a read on pricing power and competition.',
    newlistings: 'More new listings means more choice for buyers and more competition for sellers.',
    inventory: 'Tight supply props up prices; rising supply hands buyers leverage.',
    dom: 'Quick sales favor sellers; longer days on market favor buyer negotiation.',
    hpi: 'How South Bay home values are trending — your equity and your timing.',
    income: 'Local earning power underpins what buyers here can truly afford.',
  };

  // Render a single change as a colored, format-aware span.
  function changeCell(ch, r) {
    if (!ch || ch.delta == null || ch.delta === 0) return '<span class="delta flat">–</span>';
    const p = dParts(ch.direction, ch.delta, r.good_when);
    return `<span class="delta ${p.cls}"><span class="arrow">${p.arrow}</span>${esc(fmtDelta(ch, r))}</span>`;
  }

  // ---- Live stat tiles (Market Trends): value + 7d/30d comparisons + why it matters ----
  window.renderStatTiles = function (data) {
    const el = document.getElementById('trendStats');
    if (!el) return;
    const rows = (data && data.rows) || [];
    if (!rows.length) { el.innerHTML = '<p style="color:var(--slate)">Live stats unavailable right now.</p>'; return; }
    el.innerHTML = rows.map((r) => {
      const c = r.changes || {};
      return `<div class="stat-tile">
        <div class="stat-tile-val">${esc(fmtVal(r))}</div>
        <div class="stat-tile-label">${esc(r.label)}</div>
        <div class="stat-tile-changes">
          <span class="chg"><span class="chg-k">7d</span> ${changeCell(c['7d'], r)}</span>
          <span class="chg"><span class="chg-k">30d</span> ${changeCell(c['30d'], r)}</span>
        </div>
        ${WHY[r.key] ? `<p class="stat-why">${esc(WHY[r.key])}</p>` : ''}
      </div>`;
    }).join('');
  };

  // ---- Leading indicators table: 7 / 14 / 30 / 60-day comparison columns ----
  window.renderIndicators = function (data) {
    const head = document.getElementById('indicatorsHead');
    const body = document.getElementById('indicatorsBody');
    if (head) head.innerHTML = `<tr><th>Indicator</th><th>Why it matters</th><th>Latest</th>${WINDOWS.map((w) => `<th>${w[1]}</th>`).join('')}</tr>`;
    if (!data || !data.rows || !data.rows.length) {
      body.innerHTML = '<tr><td colspan="7" style="padding:24px;color:var(--slate)">Indicators unavailable.</td></tr>';
      return;
    }
    body.innerHTML = data.rows.map((r) => {
      const c = r.changes || {};
      const cells = WINDOWS.map((w) => `<td>${changeCell(c[w[0]], r)}</td>`).join('');
      return `<tr>
        <td>${esc(r.label)}</td>
        <td class="why">${esc(WHY[r.key] || '')}</td>
        <td class="val">${esc(fmtVal(r))}</td>
        ${cells}
      </tr>`;
    }).join('');
  };

  // ---- Numeric Weekly/Monthly/Seasonal cards (value + arrow + why) ----
  const TREND_TABS = {
    trendWeekly: { window: '7d', period: 'vs 7 days ago', keys: ['mortgage30', 'mortgage15', 'dgs10'] },
    trendMonthly: { window: '30d', period: 'vs 30 days ago', keys: ['listprice', 'newlistings', 'sjunrate'] },
    trendSeasonal: { window: '60d', period: 'vs 60 days ago', keys: ['inventory', 'dom', 'hpi'] },
  };
  window.renderTrendTabs = function (data) {
    const rows = (data && data.rows) || [];
    const byKey = {};
    rows.forEach((r) => { byKey[r.key] = r; });
    Object.keys(TREND_TABS).forEach((elId) => {
      const el = document.getElementById(elId);
      if (!el) return;
      const cfg = TREND_TABS[elId];
      const cards = cfg.keys.map((k) => {
        const r = byKey[k];
        if (!r) return '';
        const ch = (r.changes || {})[cfg.window];
        return `<div class="card trend-card">
          <h3>${esc(r.label)}</h3>
          <p class="trend-val">${esc(fmtVal(r))}</p>
          <p class="trend-delta">${changeCell(ch, r)} <span class="period">${esc(cfg.period)}</span></p>
          <p class="trend-desc">${esc(WHY[k] || '')}</p>
        </div>`;
      }).join('');
      el.innerHTML = cards || '<div class="card">Live stats unavailable.</div>';
    });
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
