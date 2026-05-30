// FRED (Federal Reserve Economic Data) client — mortgage rates + leading indicators.
// Free API key required: https://fred.stlouisfed.org/  -> stored as env FRED_API_KEY.
import { oneYearAgo, round } from './util.mjs';

const BASE = 'https://api.stlouisfed.org/fred/series/observations';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Fetch observations with a small retry (handles transient errors / rate limits).
async function observations(seriesId, key, { start = null, limit = null, desc = false } = {}) {
  let url = `${BASE}?series_id=${seriesId}&api_key=${key}&file_type=json`;
  if (start) url += `&observation_start=${start}`;
  if (desc) url += '&sort_order=desc';
  if (limit) url += `&limit=${limit}`;

  let lastErr;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(url);
      if (res.status === 429) throw new Error(`FRED ${seriesId} rate-limited (429)`);
      if (!res.ok) throw new Error(`FRED ${seriesId} -> HTTP ${res.status}`);
      const json = await res.json();
      return (json.observations || [])
        .filter((o) => o.value !== '.' && o.value !== '')
        .map((o) => ({ date: o.date, value: Number(o.value) }));
    } catch (e) {
      lastErr = e;
      if (attempt < 3) await sleep(attempt * 800);
    }
  }
  throw lastErr;
}

export async function fetchMortgageRates(key) {
  const start = oneYearAgo();
  const [s30, s15] = await Promise.all([
    observations('MORTGAGE30US', key, { start }),
    observations('MORTGAGE15US', key, { start }),
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

// Compare the latest observation to the one closest to `days` ago.
// `obsDesc` is newest-first.
function changeOver(obsDesc, days) {
  if (!obsDesc.length) return null;
  const latest = obsDesc[0];
  const target = new Date(latest.date);
  target.setDate(target.getDate() - days);
  const tIso = target.toISOString().slice(0, 10);
  const past = obsDesc.find((o) => o.date <= tIso);
  if (!past) return null;
  const delta = round(latest.value - past.value);
  return { delta, direction: delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat' };
}

const WINDOWS = [['7d', 7], ['14d', 14], ['30d', 30], ['60d', 60]];

// Series -> table row metadata. San Jose MSA series fall back to US.
const ROW_DEFS = [
  { key: 'mortgage30', id: 'MORTGAGE30US', label: '30-Yr Fixed Mortgage', unit: '%', good: 'down' },
  { key: 'mortgage15', id: 'MORTGAGE15US', label: '15-Yr Fixed Mortgage', unit: '%', good: 'down' },
  { key: 'dgs10', id: 'DGS10', label: '10-Yr Treasury Yield', unit: '%', good: 'down' },
  { key: 'fedfunds', id: 'FEDFUNDS', label: 'Fed Funds Rate', unit: '%', good: 'down' },
  { key: 'unrate', id: 'UNRATE', label: 'U.S. Unemployment', unit: '%', good: 'down' },
  { key: 'umcsent', id: 'UMCSENT', label: 'Consumer Sentiment', unit: '', good: 'up' },
  { key: 'inventory', id: 'ACTLISCOU41940', fallback: 'ACTLISCOUUS', label: 'Active Listings (South Bay Metro)', unit: '', good: 'up' },
  { key: 'dom', id: 'MEDDAYONMAR41940', fallback: 'MEDDAYONMARUS', label: 'Median Days on Market', unit: ' days', good: 'down' },
];

// Pull ~4 months of history (desc) so 7/14/30/60-day comparisons are possible.
async function seriesHistory(def, key) {
  try {
    const obs = await observations(def.id, key, { desc: true, limit: 130 });
    if (obs.length) return obs;
  } catch (e) {
    console.error(`indicator ${def.key}:`, e.message);
  }
  if (def.fallback) {
    try { return await observations(def.fallback, key, { desc: true, limit: 130 }); }
    catch (e) { console.error(`indicator ${def.key} fallback:`, e.message); }
  }
  return [];
}

export async function fetchIndicators(key) {
  const rows = [];
  for (const def of ROW_DEFS) {
    const obs = await seriesHistory(def, key);
    if (!obs.length) continue;
    const changes = {};
    for (const [name, days] of WINDOWS) changes[name] = changeOver(obs, days);
    rows.push({
      key: def.key, label: def.label,
      value: round(obs[0].value), unit: def.unit,
      good_when: def.good, changes,
    });
    await sleep(250); // space out calls to stay well under FRED rate limits
  }
  return { updated: new Date().toISOString(), source: 'FRED', rows };
}
