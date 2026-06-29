#!/usr/bin/env node
// Daily data fetcher. Run by .github/workflows/daily-update.yml (or locally).
// Pulls mortgage rates + leading indicators from FRED and Bay Area real-estate
// news from RSS, writing JSON into /data. Always falls back to seed files so the
// committed data is valid and the site renders even if a fetch fails or the key
// is missing. Books/journals/sold-homes are curated and intentionally untouched.
import { fetchMortgageRates, fetchIndicators } from './lib/fred.mjs';
import { fetchNews } from './lib/news.mjs';
import { writeJson, copySeed, nowIso } from './lib/util.mjs';

const KEY = process.env.FRED_API_KEY;
const meta = { lastRun: nowIso(), fred: 'seed', news: 'seed' };

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Fetch one FRED dataset with a single retry (handles transient rate limits),
// write it on success, or fall back to its seed file. Returns true on success.
async function tryFred(outName, seedBase, fetcher) {
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const data = await fetcher();
      await writeJson(outName, data);
      console.log(`FRED ${seedBase} updated.`);
      return true;
    } catch (e) {
      console.error(`FRED ${seedBase} attempt ${attempt} failed:`, e.message);
      if (attempt < 2) await sleep(2000);
    }
  }
  await copySeed(seedBase);
  console.warn(`FRED ${seedBase}: using seed fallback.`);
  return false;
}

async function run() {
  // --- FRED: mortgage rates + indicators (fetched independently so one
  // transient failure can't seed both) ---
  if (!KEY) {
    console.warn('FRED_API_KEY not set — using seed data for rates + indicators.');
    await copySeed('mortgage-rates');
    await copySeed('indicators');
  } else {
    const okRates = await tryFred('mortgage-rates.json', 'mortgage-rates', () => fetchMortgageRates(KEY));
    const okInd = await tryFred('indicators.json', 'indicators', () => fetchIndicators(KEY));
    meta.fred = okRates && okInd ? 'ok' : okRates || okInd ? 'partial' : 'seed';
  }

  // --- News ---
  try {
    const news = await fetchNews(12);
    await writeJson('news.json', news);
    meta.news = 'ok';
    console.log(`News updated (${news.items.length} items).`);
  } catch (e) {
    console.error('News fetch failed, using seed:', e.message);
    await copySeed('news');
  }

  await writeJson('meta.json', meta);
  console.log('Done. meta:', meta);
}

run().catch((e) => {
  console.error('Fatal:', e);
  process.exit(1);
});
