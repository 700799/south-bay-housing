// Dependency-free RSS fetch + parse for Bay Area real-estate news.
// Runs in GitHub Actions (server-side) to avoid browser CORS limits on RSS.

// `when:56d` restricts Google News results to the past 8 weeks.
const FEEDS = [
  'https://news.google.com/rss/search?q=(South+Bay+OR+%22San+Jose%22)+housing+market+real+estate+when:56d&hl=en-US&gl=US&ceid=US:en',
  'https://news.google.com/rss/search?q=(%22Santa+Clara+County%22+OR+Sunnyvale+OR+%22Mountain+View%22)+home+prices+when:56d&hl=en-US&gl=US&ceid=US:en',
];

// Drop anything older than this many days (belt-and-suspenders with when:56d).
const MAX_AGE_DAYS = 56;

const PRIORITY = ['san jose', 'santa clara', 'sunnyvale', 'mountain view', 'bay area', 'silicon valley', 'south bay'];

// A relevant title must contain at least one Bay Area anchor...
const ANCHORS = [
  'san jose', 'santa clara', 'sunnyvale', 'mountain view', 'silicon valley', 'bay area',
  'south bay', 'palo alto', 'cupertino', 'campbell', 'milpitas', 'saratoga', 'los gatos',
  'morgan hill', 'gilroy',
];
// ...and none of these false-positive markers (SoCal "South Bay", other states, non-news).
// Guards against e.g. SpaceX/SoCal luxury stories, "Mountain View Ave, Los Angeles",
// "Sunnyvale, TX" obituaries, "Home Prices in Hawaii", and encyclopedia entries.
const EXCLUDE = [
  'spacex', 'socal', 'southern california', 'los angeles', 'texas', ' tx', 'hawaii',
  'obituary', 'encyclopedia', 'britannica', 'arizona', 'tucson', 'new mexico', 'florida', 'nevada',
];
const relevant = (it) => {
  const t = it.title.toLowerCase();
  if (EXCLUDE.some((x) => t.includes(x))) return false;
  return ANCHORS.some((x) => t.includes(x));
};

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

function parseItems(xml) {
  const items = [];
  const blocks = xml.split(/<item>/i).slice(1);
  for (const b of blocks) {
    const block = b.split(/<\/item>/i)[0];
    const title = clean(tag(block, 'title'));
    const linkRaw = tag(block, 'link');
    const link = clean(linkRaw) || linkRaw;
    if (!title || !link) continue;
    const pub = tag(block, 'pubDate');
    const source = clean(tag(block, 'source')) || 'Google News';
    const date = pub ? new Date(pub).toISOString().slice(0, 10) : '';
    // Intentionally omit the RSS description: Google News descriptions are just
    // link dumps to related coverage, not useful summaries.
    items.push({ title, link, source, published: date });
  }
  return items;
}

const score = (it) => {
  const t = it.title.toLowerCase();
  return PRIORITY.reduce((n, k) => (t.includes(k) ? n + 1 : n), 0);
};

export async function fetchNews(limit = 12) {
  const seen = new Set();
  let all = [];
  for (const feed of FEEDS) {
    const res = await fetch(feed, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SouthBayHousingBot/1.0)' } });
    if (!res.ok) throw new Error(`News feed HTTP ${res.status}`);
    const xml = await res.text();
    for (const it of parseItems(xml)) {
      const k = it.title.toLowerCase();
      if (seen.has(k)) continue;
      seen.add(k);
      all.push(it);
    }
  }
  // Drop off-topic matches (SoCal / other states / non-news), keep genuine South Bay items.
  all = all.filter(relevant);
  // Keep only the past 8 weeks.
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - MAX_AGE_DAYS);
  const cutoffIso = cutoff.toISOString().slice(0, 10);
  all = all.filter((it) => !it.published || it.published >= cutoffIso);
  // Most South Bay-relevant first, then most recent.
  all.sort((a, b) => (score(b) - score(a)) || (a.published < b.published ? 1 : a.published > b.published ? -1 : 0));
  if (!all.length) throw new Error('No news items parsed');
  return { updated: new Date().toISOString(), source: 'Google News RSS', items: all.slice(0, limit) };
}
