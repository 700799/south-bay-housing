/* Mortgage-rate line chart (Chart.js). Exposes window.renderMortgageChart. */
(function () {
  const fmtLabel = (iso) => {
    const d = new Date(iso);
    return isNaN(d) ? iso : d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
  };

  window.renderMortgageChart = function (data) {
    const stats = document.getElementById('chartStats');
    const canvas = document.getElementById('mortgageChart');
    if (!data || !data.series) {
      if (canvas) canvas.parentElement.innerHTML = '<p style="color:var(--slate)">Mortgage chart unavailable.</p>';
      return;
    }

    // Latest-value callouts.
    if (stats && data.latest) {
      stats.innerHTML = `
        <div class="stat"><strong>${data.latest['30yr'] ?? '—'}%</strong><span>30-Yr Fixed</span></div>
        <div class="stat"><strong>${data.latest['15yr'] ?? '—'}%</strong><span>15-Yr Fixed</span></div>
        ${data.latest.date ? `<div class="stat"><strong style="font-size:1.1rem;color:var(--slate)">as of ${data.latest.date}</strong><span>Source: FRED</span></div>` : ''}`;
    }

    if (typeof Chart === 'undefined' || !canvas) {
      if (canvas) canvas.parentElement.innerHTML = '<p style="color:var(--slate)">Chart library could not load; latest rates shown above.</p>';
      return;
    }

    const s30 = data.series['30yr'] || [];
    const s15 = data.series['15yr'] || [];
    const labels = s30.map((p) => fmtLabel(p.date));

    new Chart(canvas.getContext('2d'), {
      type: 'line',
      data: {
        labels,
        datasets: [
          { label: '30-Yr Fixed', data: s30.map((p) => p.value), borderColor: '#14213d', backgroundColor: 'rgba(20,33,61,.08)', tension: .3, fill: true, pointRadius: 2, borderWidth: 2.5 },
          { label: '15-Yr Fixed', data: s15.map((p) => p.value), borderColor: '#c8973f', backgroundColor: 'rgba(200,151,63,.08)', tension: .3, fill: true, pointRadius: 2, borderWidth: 2.5 },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { position: 'top', labels: { font: { family: 'Inter' }, usePointStyle: true } },
          tooltip: { callbacks: { label: (c) => `${c.dataset.label}: ${c.parsed.y}%` } },
        },
        scales: {
          y: { ticks: { callback: (v) => v + '%', font: { family: 'Inter' } }, grid: { color: '#eee' } },
          x: { ticks: { font: { family: 'Inter' }, maxRotation: 0, autoSkip: true }, grid: { display: false } },
        },
      },
    });
  };
})();
