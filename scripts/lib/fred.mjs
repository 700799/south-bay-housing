// FRED (Federal Reserve Economic Data) client — mortgage rates + leading indicators.
// Free API key required: https://fred.stlouisfed.org/  -> stored as env FRED_API_KEY.
import { oneYearAgo, round } from './util.mjs';

const BASE = 'https://api.stlouisfed.org/fred/series/observations';

async function observations(seriesId, key, start) {
  const url = `${BASE}?series_id=${seriesId}&api_key=${key}&file_type=json` +
    (start ? `&observation_start=${start}` : '&limit=12&sort_order=desc');
  const res = await fetch(url);
  if (!res.ok) throw new Error(`FRED ${seriesId} -> HTTP ${res.status}`);
  const json = await res.json();
  // Keep only real numeric observations (FRED uses "." for missing).
  return (json.observations || [])
    .filter((o) => o.value !== '.' && o.value !== '')
    .map((o) => ({ date: o.date, value: Number(o.value) }));
}

// Latest value + previous distinct observation, for delta computation.
async function latestTwo(seriesId, key) {
  const obs = await observations(seriesId, key, null); // newest first
  const sorted = obs.slice().sort((a, b) => (a.date < b.date ? 1 : -1));
  return { latest: sorted[0], prev: sorted[1] };
}

export async function fetchMortgageRates(key) {
  const start = oneYearAgo();
  const [s30, s15] = await Promise.all([
    observations('MORTGAGE30US', key, start),
    observations('MORTGAGE15US', key, start),
  ]);
  const last = (arr) => (arr.length ? arr[arr.length - 1] : null);
  const l30 = last(s30);
  const l15 = last(s15);
  return {
    updated: new Date().toISOString(),
    source: 'FRED',
    series: { '30yr': s30, '15yr': s15 },
    latest: {
      '30yr': l30 ? round(l30.value) : null,
      '15yr': l15 ? round(l15.value) : null,
      date: l30 ? l30.date : null,
    },
  };
}

// Series -> table row metadata. San Jose MSA inventory falls back to US.
const ROW_DEFS = [
  { key: 'mortgage30', id: 'MORTGAGE30US', label: '30-Yr Fixed Mortgage', unit: '%', period: 'vs last week', good: 'down' },
  { key: 'mortgage15', id: 'MORTGAGE15US', label: '15-Yr Fixed Mortgage', unit: '%', period: 'vs last week', good: 'down' },
  { key: 'dgs10', id: 'DGS10', label: '10-Yr Treasury Yield', unit: '%', period: 'vs prior day', good: 'down' },
  { key: 'fedfunds', id: 'FEDFUNDS', label: 'Fed Funds Rate', unit: '%', period: 'vs last month', good: 'down' },
  { key: 'unrate', id: 'UNRATE', label: 'U.S. Unemployment', unit: '%', period: 'vs last month', good: 'down' },
  { key: 'umcsent', id: 'UMCSENT', label: 'Consumer Sentiment', unit: '', period: 'vs last month', good: 'up' },
  { key: 'inventory', id: 'ACTLISCOU41940', fallback: 'ACTLISCOUUS', label: 'Active Listings (San Jose MSA)', unit: '', period: 'vs last month', good: 'up' },
  { key: 'dom', id: 'MEDDAYONMAR41940', fallback: 'MEDDAYONMARUS', label: 'Median Days on Market', unit: ' days', period: 'vs last month', good: 'down' },
];

export async function fetchIndicators(key) {
  const rows = [];
  for (const def of ROW_DEFS) {
    let pair;
    try {
      pair = await latestTwo(def.id, key);
      if (!pair.latest && def.fallback) pair = await latestTwo(def.fallback, key);
    } catch (e) {
      if (def.fallback) {
        try { pair = await latestTwo(def.fallback, key); } catch { pair = null; }
      }
    }
    if (!pair || !pair.latest) continue;
    const value = round(pair.latest.value);
    const prev = pair.prev ? round(pair.prev.value) : value;
    const delta = round(value - prev);
    rows.push({
      key: def.key, label: def.label, value, unit: def.unit, prev,
      delta, deltaPeriod: def.period,
      direction: delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat',
      good_when: def.good,
    });
  }
  return { updated: new Date().toISOString(), source: 'FRED', rows };
}
