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

async function run() {
  // --- FRED: mortgage rates + indicators ---
  if (!KEY) {
    console.warn('FRED_API_KEY not set — using seed data for rates + indicators.');
    await copySeed('mortgage-rates');
    await copySeed('indicators');
  } else {
    try {
      const [rates, indicators] = await Promise.all([
        fetchMortgageRates(KEY),
        fetchIndicators(KEY),
      ]);
      await writeJson('mortgage-rates.json', rates);
      await writeJson('indicators.json', indicators);
      meta.fred = 'ok';
      console.log('FRED data updated.');
    } catch (e) {
      console.error('FRED fetch failed, using seed:', e.message);
      await copySeed('mortgage-rates');
      await copySeed('indicators');
    }
  }

  // --- News ---
  try {
    const news = await fetchNews(6);
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
