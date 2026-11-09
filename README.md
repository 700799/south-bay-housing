# Anna Nguyen — South Bay Real Estate

A single-page website for Anna Nguyen, real estate specialist for the South Bay
(San Jose, Santa Clara, Sunnyvale, Mountain View). Static site for GitHub Pages
with market data that refreshes daily via GitHub Actions.

## Features
- **Hero + About** — branding, bio, and buy/sell calls to action.
- **Market trends** — weekly / monthly / seasonal tabbed views.
- **Factors** affecting South Bay buying & selling.
- **Leading indicators table** — mortgage rates, Treasury yield, Fed funds,
  unemployment, consumer sentiment, inventory, days-on-market (FRED) — *updated daily*.
- **Mortgage rate chart** — 30-yr & 15-yr fixed over the past year (Chart.js).
- **Bay Area housing news** — top headlines pulled daily from news RSS.
- **Featured listings** — photo-card grid of homes for sale, pending, and sold,
  with pill filters by status, city, and property type (OR within a group, AND
  across groups). Curated in `data/listings.json`; optional IDX embed for live
  MLS search.
- **Top 5 books + Top 5 journal/research summaries** on buying/selling a home.
- **Contact CTA** — phone, email, and a contact form.

## How the "daily update" works
GitHub Pages is static, so a scheduled **GitHub Actions** workflow
(`.github/workflows/daily-update.yml`) runs `scripts/fetch-data.mjs` each day,
writes JSON into `data/`, and commits it. The site reads those JSON files at load.
If a fetch fails or no API key is set, it falls back to seed data in
`scripts/seed/` so the site always renders.

- Mortgage rates + indicators: **FRED API** (free key required).
- News: Google News RSS (no key).
- `listings.json`, `books.json`, `journals.json`: **curated** — edit by hand;
  the workflow never overwrites them.

## Managing listings
Listings live in `data/listings.json` — one object per home. The five shipped
entries are flagged `"sample": true` (they render a red **Sample** badge); delete
them and add real homes:

```json
{
  "id": "1234-oak-st",
  "status": "active",            // active | pending | sold
  "price": 1895000,              // sale price when status is "sold"
  "address": "1234 Oak St",
  "city": "Sunnyvale",
  "neighborhood": "Cherry Chase", // optional
  "beds": 3, "baths": 2, "sqft": 1650, "lot": 6000,
  "type": "Single Family",       // Single Family | Townhouse | Condo | Multi-Family
  "year": 1958,                  // optional
  "photo": "assets/img/listings/1234-oak-st.jpg",   // optional; blank shows a placeholder
  "url": "https://...",          // optional MLS / brochure link
  "blurb": "One or two sentences about the home.",
  "date": "2026-11-01"           // list date, or sale date when sold
}
```

Put photos in `assets/img/listings/` (landscape, ~1200×750 works well). Sorting
is for-sale → pending → sold, newest first within each group.

### Live MLS search (IDX)
Active MLS listings can't be copied by hand — they come from a licensed IDX
feed. Get the embed code (widget, iframe, or script) from Coldwell Banker's
agent tools or an IDX vendor, paste it inside `<div id="idxEmbed">` in
`index.html`, and the "Search all South Bay homes" block un-hides itself
automatically beneath the featured listings.

## One-time setup (done in GitHub, not in code)
1. **Enable GitHub Pages**: Settings → Pages → *Deploy from a branch* → `main` / `/root`.
   Site serves at `https://<username>.github.io/south-bay-housing/`.
2. **Add a FRED API key**: get a free key at <https://fred.stlouisfed.org/> →
   repo Settings → *Secrets and variables → Actions* → New secret named `FRED_API_KEY`.
   *(The site works on seed data without it.)*
3. **Allow Actions to commit**: Settings → Actions → General → Workflow permissions
   → *Read and write permissions*.
4. **Set up the contact form**: create a free form at <https://formspree.io>, then
   replace `FORM_ID` in `index.html` with your form ID and confirm the first email.
5. **(Optional) first data run**: Actions → *Daily data update* → *Run workflow*.
   (Scheduled cron only runs from the default branch.)
6. **Headshot**: the hero loads Anna's photo from the self-hosted file
   `assets/img/anna-headshot.jpg` (also used for the Open Graph, Twitter, and
   schema.org images), with an automatic "AN" initials fallback if it ever
   fails to load. To swap the photo, replace that file.

## Local development
`fetch()` cannot read local JSON over `file://`, so use a tiny web server:

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

Test the data fetcher locally:

```bash
FRED_API_KEY=your_key node scripts/fetch-data.mjs   # real data
node scripts/fetch-data.mjs                          # no key -> seed fallback
```

## Structure
```
index.html            css/styles.css        js/{main,render,chart,filters}.js
data/*.json           scripts/fetch-data.mjs + lib/ + seed/
.github/workflows/daily-update.yml
```

Indicators, rates, and news are informational, from public sources, and may not
be real-time. Sold-home listings are representative sample data.
