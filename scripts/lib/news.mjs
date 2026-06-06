// Dependency-free RSS fetch + parse for the news feed.
// Runs in GitHub Actions (server-side) to avoid browser CORS limits on RSS.
//
// Scope: we keep ONLY the top monthly articles that are either (a) based in
// Northern California or (b) published by the Federal Reserve Board. Everything
// else parsed from the feeds is filtered out before ranking.

// `when:30d` restricts Google News results to the past 30 days (monthly window).
const FEEDS = [
  // Northern California real-estate / housing coverage.
  { url: 'https://news.google.com/rss/search?q=(%22Northern+California%22+OR+%22Bay+Area%22+OR+%22San+Jose%22+OR+%22San+Francisco%22)+housing+market+real+estate+when:30d&hl=en-US&gl=US&ceid=US:en' },
  { url: 'https://news.google.com/rss/search?q=(%22Santa+Clara+County%22+OR+Sunnyvale+OR+%22Mountain+View%22+OR+Sacramento+OR+Oakland)+home+prices+when:30d&hl=en-US&gl=US&ceid=US:en' },
  // Federal Reserve Board — monetary-policy press releases (rates, FOMC).
  { url: 'https://www.federalreserve.gov/feeds/press_monetary.xml', source: 'Federal Reserve Board', region: 'fed' },
];

// Drop anything older than this many days (the "monthly" window).
const MAX_AGE_DAYS = 30;

// Northern California places used both to KEEP an item and to rank it.
const NORCAL = [
  'northern california', 'norcal', 'bay area', 'silicon valley', 'south bay', 'east bay', 'north bay', 'peninsula',
  'san jose', 'santa clara', 'sunnyvale', 'mountain view', 'palo alto', 'cupertino', 'milpitas', 'campbell',
  'los gatos', 'saratoga', 'morgan hill', 'gilroy', 'san francisco', 'oakland', 'berkeley', 'fremont',
  'san mateo', 'redwood city', 'menlo park', 'sacramento', 'marin', 'sonoma', 'napa', 'alameda',
  'contra costa', 'santa cruz', 'monterey',
];

// Signals that an item comes from / is about the Federal Reserve Board.
const FED = ['federal reserve', 'fomc', 'the fed', 'jerome powell'];

const tag = (block, name) => {
  const m = block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, 'i'));
  return m ? m[1].trim() : '';
};

// Decode encoded angle brackets first, then strip ALL tags (literal or encoded),
// then decode remaining entities. This prevents Google News descriptions (which
// contain HTML-encoded <a> link markup) from leaking into the text.
const clean = (s) =>
  s.replace(/<!\[CDATA\[|\]\]>/g, '')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ').trim();

function parseItems(xml, defaults = {}) {
  const items = [];
  const blocks = xml.split(/<item>/i).slice(1);
  for (const b of blocks) {
    const block = b.split(/<\/item>/i)[0];
    const title = clean(tag(block, 'title'));
    const linkRaw = tag(block, 'link');
    const link = clean(linkRaw) || linkRaw;
    if (!title || !link) continue;
    const pub = tag(block, 'pubDate');
    const source = clean(tag(block, 'source')) || defaults.source || 'Google News';
    const date = pub ? new Date(pub).toISOString().slice(0, 10) : '';
    // Intentionally omit the RSS description: Google News descriptions are just
    // link dumps to related coverage, not useful summaries.
    items.push({ title, link, source, published: date, region: defaults.region || '' });
  }
  return items;
}

const norcalHits = (it) => {
  const t = it.title.toLowerCase();
  return NORCAL.reduce((n, k) => (t.includes(k) ? n + 1 : n), 0);
};

const isFed = (it) => {
  if (it.region === 'fed') return true;
  const hay = `${it.title} ${it.source}`.toLowerCase();
  return FED.some((k) => hay.includes(k));
};

// Keep only Northern-California-based items or Federal Reserve Board items.
const inScope = (it) => isFed(it) || norcalHits(it) > 0;

// Rank: Fed items first (rate-setting context), then by NorCal relevance.
const score = (it) => (isFed(it) ? 100 : 0) + norcalHits(it);

export async function fetchNews(limit = 20) {
  const seen = new Set();
  let all = [];
  for (const feed of FEEDS) {
    const res = await fetch(feed.url, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SouthBayHousingBot/1.0)' } });
    if (!res.ok) throw new Error(`News feed HTTP ${res.status}`);
    const xml = await res.text();
    for (const it of parseItems(xml, feed)) {
      const k = it.title.toLowerCase();
      if (seen.has(k)) continue;
      seen.add(k);
      all.push(it);
    }
  }
  // Keep only the past 30 days (belt-and-suspenders with when:30d).
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - MAX_AGE_DAYS);
  const cutoffIso = cutoff.toISOString().slice(0, 10);
  all = all.filter((it) => !it.published || it.published >= cutoffIso);
  // Restrict to Northern California OR Federal Reserve Board.
  all = all.filter(inScope);
  // Most recent first, then by relevance (Fed, then South Bay / NorCal).
  all.sort((a, b) => (a.published < b.published ? 1 : a.published > b.published ? -1 : 0) || score(b) - score(a));
  if (!all.length) throw new Error('No in-scope news items parsed');
  // Drop the internal region flag from the published output.
  const items = all.slice(0, limit).map(({ region, ...rest }) => rest);
  return { updated: new Date().toISOString(), source: 'Google News RSS + Federal Reserve Board', items };
}
