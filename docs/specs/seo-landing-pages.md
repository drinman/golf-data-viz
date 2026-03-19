# SEO Landing Pages

**Status**: Spec
**Author**: Product
**Date**: 2026-03-17
**Phase**: 1 (Data-First Share Quality + SEO Foundation)
**Priority**: 3

---

## 1. Problem Statement

GolfDataViz has virtually zero organic search traffic. Of 151 sessions in the last 7 days, 134 are direct traffic. The site has no content pages that target search queries, no schema markup, and no Google Search Console setup.

Meanwhile, the tool sits on unique benchmark data (Shot Scope-sourced handicap statistics across 7 brackets) that no other free site surfaces in a structured, queryable format.

### Research Basis

- OmniCalculator grew to 17.35M monthly visits through pure SEO — no viral loops. Each calculator is a landing page.
- TDEECalculator gets 1M+ monthly visitors from a single page targeting one keyword cluster.
- For calculator/utility tools, SEO consistently outperforms virality for sustained growth.
- v2 plan elevated SEO to co-primary growth channel (co-equal with sharing from day one).
- Keyword targets: "strokes gained calculator" (low competition, high intent), "average strokes gained by handicap" (unique data), "strokes gained explained" (educational).

### User Stories

**As a golfer googling "strokes gained calculator"**, I want to find a free tool that lets me input my stats and see my SG breakdown so I don't have to do spreadsheet math.

**As a golfer googling "average GIR for 15 handicap"**, I want to see benchmark data for my handicap level so I can set realistic goals.

**As a golf coach**, I want a reference page explaining strokes gained in plain English so I can send it to students who ask "what is strokes gained?"

---

## 2. Requirements

### Must Have (MVP)

- [ ] **M1**: Create `/learn/strokes-gained-calculator` — primary keyword target, internal link to `/strokes-gained`
- [ ] **M2**: Create `/learn/strokes-gained-explained` — educational page explaining SG in plain English
- [ ] **M3**: Create `/learn/average-strokes-gained-by-handicap` — unique data page surfacing benchmark data
- [ ] **M4**: Create `/learn/strokes-gained-putting` — focused page on the most-searched SG subcategory
- [ ] **M5**: Create `/benchmarks/[bracket]` pages — programmatic pages for each handicap bracket (7 pages: 0-5, 5-10, 10-15, 15-20, 20-25, 25-30, 30-plus)
- [ ] **M6**: Schema markup on all pages: `WebApplication` on calculator pages, `HowTo` on educational pages, `Dataset` on benchmark pages
- [ ] **M7**: Google Search Console verification and sitemap submission
- [ ] **M8**: Internal linking: every page links to the calculator CTA ("Try the free calculator")
- [ ] **M9**: Pages are server-rendered (RSC) — no client-side-only content
- [ ] **M10**: Proper `<title>`, `<meta description>`, and OG tags on every page

### Should Have

- [ ] **S1**: `/benchmarks` index page listing all brackets with summary stats
- [ ] **S2**: Table of contents / anchor links on longer educational pages
- [ ] **S3**: Embedded sample radar chart on educational pages (static SVG, not interactive)
- [ ] **S4**: FAQ section with `FAQPage` schema markup
- [ ] **S5**: Breadcrumb navigation with `BreadcrumbList` schema markup
- [ ] **S6**: `/learn` index page listing all educational articles

### Won't Have

- **W1**: Blog or regularly updated content — these are evergreen reference pages
- **W2**: User-generated content on SEO pages
- **W3**: Gated content (email wall, signup required) — all pages fully accessible
- **W4**: Programmatic pages for every handicap index (only bracket-level pages)

---

## 3. Technical Approach

### Route Structure

```
src/app/
  learn/
    page.tsx                              → /learn (index)
    strokes-gained-calculator/
      page.tsx                            → /learn/strokes-gained-calculator
    strokes-gained-explained/
      page.tsx                            → /learn/strokes-gained-explained
    average-strokes-gained-by-handicap/
      page.tsx                            → /learn/average-strokes-gained-by-handicap
    strokes-gained-putting/
      page.tsx                            → /learn/strokes-gained-putting
  benchmarks/
    page.tsx                              → /benchmarks (index)
    [bracket]/
      page.tsx                            → /benchmarks/0-5, /benchmarks/10-15, etc.
```

All pages are React Server Components. No `"use client"` directive. Data comes from the static benchmark JSON (`handicap-brackets.json`) at build time.

### Benchmark Pages (Programmatic)

Use `generateStaticParams` to pre-render all 7 bracket pages at build time:

```typescript
export function generateStaticParams() {
  return [
    { bracket: "0-5" },
    { bracket: "5-10" },
    { bracket: "10-15" },
    { bracket: "15-20" },
    { bracket: "20-25" },
    { bracket: "25-30" },
    { bracket: "30-plus" },
  ];
}
```

URL slug uses `30-plus` (not `30+`) for URL safety. The page maps the slug back to the bracket key.

Each benchmark page displays:
- Average score, FIR%, GIR%, putts/round, up-and-down%, penalties/round
- Scoring distribution (eagles through triple+)
- Comparison to adjacent brackets ("vs 5-10 HCP" and "vs 15-20 HCP")
- CTA: "See where you stand — try the free Strokes Gained calculator"
- Data sourced from `handicap-brackets.json` — no additional data fetching

### Schema Markup

Implement via `<script type="application/ld+json">` in each page's metadata export.

**Calculator page** (`/learn/strokes-gained-calculator`):
```json
{
  "@context": "https://schema.org",
  "@type": "WebApplication",
  "name": "Strokes Gained Calculator",
  "url": "https://golfdataviz.com/strokes-gained",
  "applicationCategory": "Sports",
  "operatingSystem": "Web",
  "offers": { "@type": "Offer", "price": "0" }
}
```

**Educational pages** (`/learn/strokes-gained-explained`):
```json
{
  "@context": "https://schema.org",
  "@type": "HowTo",
  "name": "How to Calculate Strokes Gained from Your Scorecard",
  "step": [...]
}
```

**Benchmark pages** (`/benchmarks/[bracket]`):
```json
{
  "@context": "https://schema.org",
  "@type": "Dataset",
  "name": "Golf Statistics for 10-15 Handicap Golfers",
  "description": "Average scoring, fairways, greens in regulation, and putting statistics...",
  "creator": { "@type": "Organization", "name": "Golf Data Viz" }
}
```

### Sitemap

Add a `sitemap.ts` file at `src/app/sitemap.ts` (Next.js App Router convention):

```typescript
export default function sitemap(): MetadataRoute.Sitemap {
  const brackets = ["0-5", "5-10", "10-15", "15-20", "20-25", "25-30", "30-plus"];
  return [
    { url: "https://golfdataviz.com", changeFrequency: "weekly", priority: 1.0 },
    { url: "https://golfdataviz.com/strokes-gained", changeFrequency: "weekly", priority: 0.9 },
    ...brackets.map(b => ({
      url: `https://golfdataviz.com/benchmarks/${b}`,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
    // learn pages...
  ];
}
```

### Google Search Console

Manual setup steps (not automated):
1. Add property for `golfdataviz.com` in Google Search Console
2. Verify via DNS TXT record or HTML meta tag
3. Submit sitemap URL
4. Request indexing for priority pages

---

## 4. Content Spec (Page-by-Page)

### /learn/strokes-gained-calculator

**Title**: Free Strokes Gained Calculator — Compare Your Game to Handicap Peers
**H1**: Strokes Gained Calculator
**Word count**: 800-1200 words
**Content**:
- What is strokes gained (2-3 sentences)
- How this calculator works (input your stats, see SG vs peers)
- What you'll learn from the results
- Embedded CTA button to `/strokes-gained`
- FAQ section: "Is this free?", "What data do I need?", "How accurate is it?", "What is strokes gained putting?"

### /learn/strokes-gained-explained

**Title**: Strokes Gained Explained — A Simple Guide for Recreational Golfers
**H1**: Strokes Gained Explained
**Word count**: 1500-2000 words
**Content**:
- The problem SG solves (why traditional stats lie)
- The 4 SG categories explained with examples
- How peer benchmarking works (not Tour pros)
- Common misconceptions
- How to use SG to improve (without being coaching advice)
- CTA to calculator

### /learn/average-strokes-gained-by-handicap

**Title**: Average Strokes Gained by Handicap — 2026 Benchmark Data
**H1**: Average Strokes Gained by Handicap
**Word count**: 1000-1500 words
**Content**:
- Summary table of all brackets (average score, FIR%, GIR%, putts, etc.)
- Key insights (e.g., "GIR drops dramatically from scratch to 15 HCP")
- Visual: embedded bar chart or table comparing brackets
- Links to individual bracket pages for deeper data
- CTA to calculator

### /learn/strokes-gained-putting

**Title**: Strokes Gained Putting — What Your Putting Stats Really Mean
**H1**: Strokes Gained Putting
**Word count**: 1000-1500 words
**Content**:
- Why putting is the most misunderstood SG category
- How putting SG is calculated from scorecard data
- Average putts per round by handicap (from benchmark data)
- When "32 putts" is actually good (GIR-adjusted context)
- CTA to calculator

### /benchmarks/[bracket] (e.g., /benchmarks/10-15)

**Title**: 10-15 Handicap Golf Statistics — Average Scores, Fairways, GIR & More
**H1**: 10-15 Handicap Golfer Statistics
**Word count**: 500-800 words
**Content**:
- All benchmark metrics for this bracket in a styled table
- Comparison to adjacent brackets
- "What this means" interpretation paragraph
- Scoring distribution breakdown
- CTA to calculator

---

## 5. Success Metrics

| Metric | Baseline | Target (45 days) | Target (90 days) | How to Measure |
|--------|----------|-------------------|-------------------|----------------|
| Organic search impressions | 0 | 1,000 | 10,000 | Google Search Console |
| Organic search clicks | 0 | 50 | 500 | Google Search Console |
| SEO page → calculator conversion | N/A | >5% | >8% | GA4 (page_view on /learn/* → calculation_completed) |
| Pages indexed | 0 | 12 (all pages) | 12 | Google Search Console |

---

## 6. Kill Criteria

| Signal | Kill If |
|--------|---------|
| SEO pages not indexed | Zero Google impressions after 60 days |
| No organic clicks | Zero non-brand clicks after 45 days of indexing |

---

## 7. Implementation Plan

### File Changes

**New files**:
1. `src/app/learn/page.tsx` — learn index
2. `src/app/learn/strokes-gained-calculator/page.tsx`
3. `src/app/learn/strokes-gained-explained/page.tsx`
4. `src/app/learn/average-strokes-gained-by-handicap/page.tsx`
5. `src/app/learn/strokes-gained-putting/page.tsx`
6. `src/app/benchmarks/page.tsx` — benchmarks index
7. `src/app/benchmarks/[bracket]/page.tsx` — programmatic bracket pages
8. `src/app/sitemap.ts` — dynamic sitemap generation

**Modified files**:
9. `src/app/layout.tsx` — add Google Search Console verification meta tag (if HTML method chosen)
10. Navigation components — add /learn and /benchmarks links

### Implementation Steps

1. Set up route structure and create all page shells with metadata exports
2. Write content for each learn page (can be AI-assisted, must be reviewed for accuracy)
3. Build benchmark bracket page template with `generateStaticParams`
4. Add schema markup to all pages
5. Create sitemap.ts
6. Add internal linking (learn pages → calculator CTA, cross-links between pages)
7. Set up Google Search Console, verify, submit sitemap
8. Verify all pages render correctly as RSC (no hydration errors)
9. Check Lighthouse SEO score on each page (target: 100)

---

## 8. Open Questions

1. **robots.txt**: The project may not have a robots.txt yet. Need to create one allowing all crawlers, pointing to sitemap. **Recommendation**: Add `src/app/robots.ts` using Next.js convention.

2. **Canonical URLs**: Should benchmark pages have canonical URLs to prevent duplicate content issues with query params? **Recommendation**: Yes — set canonical in metadata export for every page.

3. **Content authoring**: Should learn page content be stored as MDX files for easier editing, or inline JSX? **Recommendation**: Inline JSX for MVP. Content is small enough (4 pages) that MDX infrastructure is overkill. Revisit if page count grows beyond 10.
