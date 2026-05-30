/* Mortgage affordability calculator. Pre-fills the rate from live FRED data
   (via window.applyLiveRate, called by main.js) and recomputes on any input. */
(function () {
  const $ = (id) => document.getElementById(id);
  const usd = (n) => '$' + Math.round(n).toLocaleString('en-US');
  let liveRates = null;

  function compute() {
    if (!$('calcPrice')) return;
    const price = +$('calcPrice').value || 0;
    const downPct = Math.min(100, Math.max(0, +$('calcDownPct').value || 0));
    const term = +$('calcTerm').value || 30;
    const rate = +$('calcRate').value || 0;
    const taxPct = +$('calcTax').value || 0;
    const insYr = +$('calcIns').value || 0;
    const hoa = +$('calcHoa').value || 0;

    const loan = Math.max(0, price - price * downPct / 100);
    const i = rate / 100 / 12;
    const n = term * 12;
    const pi = i > 0 ? loan * i * Math.pow(1 + i, n) / (Math.pow(1 + i, n) - 1) : loan / n;
    const tax = price * taxPct / 100 / 12;
    const ins = insYr / 12;
    const total = pi + tax + ins + hoa;

    $('calcPriceOut').textContent = usd(price);
    $('calcTotal').textContent = usd(total) + '/mo';
    $('calcBreakdown').innerHTML =
      [['Principal & interest', pi], ['Property tax', tax], ['Home insurance', ins], ['HOA', hoa]]
        .map(([k, v]) => `<li><span>${k}</span><span>${usd(v)}</span></li>`).join('') +
      `<li class="calc-sub"><span>Loan amount (${downPct}% down)</span><span>${usd(loan)}</span></li>`;
  }

  // Called by main.js once live mortgage-rates.json loads.
  window.applyLiveRate = function (data) {
    if (!data || !data.latest) return;
    liveRates = data.latest;
    setRateFromTerm();
    compute();
  };

  function setRateFromTerm() {
    if (!liveRates || !$('calcTerm') || !$('calcRate')) return;
    const r = liveRates[$('calcTerm').value + 'yr'];
    if (r) $('calcRate').value = r;
  }

  document.addEventListener('DOMContentLoaded', () => {
    if (!$('calcPrice')) return;
    ['calcPrice', 'calcDownPct', 'calcRate', 'calcTax', 'calcIns', 'calcHoa']
      .forEach((id) => $(id) && $(id).addEventListener('input', compute));
    $('calcTerm') && $('calcTerm').addEventListener('change', () => { setRateFromTerm(); compute(); });
    compute();
  });
})();
