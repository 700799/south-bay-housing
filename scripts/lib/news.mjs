// Dependency-free RSS fetch + parse for Bay Area real-estate news.
// Runs in GitHub Actions (server-side) to avoid browser CORS limits on RSS.

const FEEDS = [
  'https://news.google.com/rss/search?q=South+Bay+OR+%22San+Jose%22+housing+market+real+estate&hl=en-US&gl=US&ceid=US:en',
  'https://news.google.com/rss/search?q=%22Santa+Clara+County%22+OR+Sunnyvale+OR+%22Mountain+View%22+home+prices&hl=en-US&gl=US&ceid=US:en',
];

const PRIORITY = ['san jose', 'santa clara', 'sunnyvale', 'mountain view', 'bay area', 'silicon valley', 'south bay'];

const tag = (block, name) => {
  const m = block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, 'i'));
  return m ? m[1].trim() : '';
};

const clean = (s) =>
  s.replace(/<!\[CDATA\[|\]\]>/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ')
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
    const summary = clean(tag(block, 'description')).slice(0, 220);
    items.push({ title, link, source, published: date, summary });
  }
  return items;
}

const score = (it) => {
  const t = (it.title + ' ' + it.summary).toLowerCase();
  return PRIORITY.reduce((n, k) => (t.includes(k) ? n + 1 : n), 0);
};

export async function fetchNews(limit = 6) {
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
  all.sort((a, b) => score(b) - score(a) || (a.published < b.published ? 1 : -1));
  if (!all.length) throw new Error('No news items parsed');
  return { updated: new Date().toISOString(), source: 'Google News RSS', items: all.slice(0, limit) };
}
