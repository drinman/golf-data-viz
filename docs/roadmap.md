# Golf Data Viz — Product Roadmap (v2)

> **Supersedes previous roadmap.** Based on 2-round research sprint completed 2026-03-17.

## Thesis

**GolfDataViz is the free golf analytics website** — a collection of fast, shareable golf tools that golfers find through search and share through group chats. Not a dashboard. Not a single calculator. A site where every output is designed to travel.

Four growth engines, not one:
1. **SEO** — each tool and benchmark page is a landing page
2. **Sharing** — every output is a shareable artifact
3. **Embeds** — widget distribution through golf blogs
4. **Community** — Reddit + newsletter (supplementary, not primary)

## Strategic Shifts From v1

| v1 Assumption | v2 Position | Why |
|---------------|-------------|-----|
| Archetypes as headline share hook | Lead with peer percentiles and hard data | Spotify Wrapped 2024 proved personality labels backfire without brand equity |
| Sharing as sole growth engine | SEO + sharing as co-equal channels | OmniCalculator hit 17M/mo through pure SEO; realistic K-factor is 0.05-0.15, not 0.3 |
| Deepen single tool | Multi-tool strategy (3-5 tools) | 14-handicapper plays 20-30 rounds/year = 20-30 uses max; each tool is a new SEO entry point |
| Results public by default | Private by default, share by choice | "Vanity handicap" culture; Strava's public-default caused backlash |
| Build target-handicap platform | Don't compete on depth | Clippd already has this + Garmin API distribution; win on free/instant/shareable/zero-setup |

---

## What's Already Shipped

SG Benchmarker launched 2026-03-06. Since then: round history + trends, Stripe billing, lesson prep reports, saved round sharing, score-first share cards, plus handicap support, proxy SG 2.0, trust scoring, GA4 analytics (57+ events), benchmark interpolation, and more. Full list in git history.

**Current state (2026-03-17):** 105 WAU, 73 visitors, 355 page views/week. 134/151 sessions are direct traffic — virtually zero organic search. Sharing features just shipped; viral loop hasn't had time to compound. Pre-flywheel.

---

## Phase 1 (Weeks 1-3): Data-First Share Quality + SEO Foundation

**Goal: Make results worth sharing AND findable.**

| # | Feature | Notes |
|---|---------|-------|
| 1 | Peer percentile rankings on results | "Your putting is better than 82% of 14-handicappers." Primary share hook — concrete, credible, conversation-starting. Replaces archetype-first approach. |
| 2 | GA4 key events configuration | Mark key events: `calculation_completed`, `copy_link_clicked`, `download_png_clicked`, `shared_round_viewed`, `round_saved`. Can't improve what you can't measure. |
| 3 | SEO landing pages (`/learn/` + `/benchmarks/`) | `/learn/strokes-gained-calculator`, `/learn/strokes-gained-explained`, `/learn/average-strokes-gained-by-handicap`, programmatic `/benchmarks/{bracket}` pages. Schema markup, GSC, sitemap. |
| 4 | Round Receipt share format | Receipt-style PNG: course name at top, SG categories as line items, total at bottom, QR code. Instagram/iMessage-native. Inspired by Receiptify (1M+ uses, zero marketing). |
| 5 | Recipient-optimized shared link landing | Shared link shows results + "How do YOU compare?" CTA with pre-filled handicap. Closes the viral loop. Track conversion obsessively. |
| 6 | 9:16 story card export | Vertical format for Instagram Stories alongside existing 600px card. |

## Phase 2 (Weeks 3-6): Multi-Tool + Distribution

**Goal: Multiple entry points, multiple reasons to visit.**

| # | Feature | Notes |
|---|---------|-------|
| 7 | Tool #2: Golf Score Probability Calculator | "Given your handicap, what's the probability you break 80/90/100?" Simple input, shareable output, strong search intent. Weekend build. |
| 8 | Tool #3: "Am I Good at Golf?" Quiz/Benchmark | Input handicap + a few stats, get a report card. Leverages existing benchmark data. Strong search intent. Shareable grade format. |
| 9 | Embeddable Mini-SG Widget | `<script>` tag for golf blogs. Compact form, quick radar chart, CTA to full analysis. Target: Practical Golf, The DIY Golfer, MyGolfSpy. Each embed = backlink + acquisition. |
| 10 | Tiered Referral System | Share 1 round = receipt format. Share 3 = custom themes. Share 5 = archetype analysis. Zero marginal cost. Referral CTA on every results page. |
| 11 | PWA Capabilities | manifest.json + service worker. Install prompt after 2+ submissions. Low effort, outsized retention. |

## Phase 3 (Weeks 5-8): Community + Retention

**Goal: Establish presence, build return behavior.**

| # | Feature | Notes |
|---|---------|-------|
| 12 | Reddit seeding | Launch channel, not sustained engine. 2-3 weeks of genuine r/golf participation, data insight posts, one launch post. Plan for one-time traffic bump. |
| 13 | "Golf Data Brief" newsletter | Weekly email with anonymized aggregate data insights. Cross-promote via beehiiv Recommendations. Each issue drives tool traffic. |
| 14 | Challenge a Friend flow | Async 1v1 SG comparison. Friend enters their stats, sees side-by-side. Social pressure drives account creation. |
| 15 | Achievement badges | 5-8 badges: "First Round Logged," "Category Killer," "Improvement Arc," "Bracket Buster." Drives repeat usage. |
| 16 | Trend visualization for saved rounds | For users with 3+ saved rounds, show improvement trends. The reason to come back and the upsell to saving rounds. |

## Phase 4 (Before October): Season Wrapped + Monetization Signal

**Goal: Capture annual moment, validate willingness to pay.**

| # | Feature | Notes |
|---|---------|-------|
| 17 | Season Wrapped | Table stakes, not differentiator. GHIN Rewind and Golf Canada already do year-in-review. Still worth building for retention + sharing. |
| 18 | Archetypes as optional fun layer | If demand exists, add "Your Golf Archetype" as secondary share card. Names: "The Surgeon," "The Closer," "The Grinder." Dessert, not main course. |
| 19 | Early paid tier ($3-5/mo) | Unlimited saved rounds, trend tracking, custom share themes. Not to generate revenue — to validate that golfers will pay. |

---

## Kill Criteria

Every bet has a threshold. If it doesn't hit, cut it and move on.

| Bet | Success Signal | Kill If |
|-----|---------------|---------|
| Share cards (receipts + percentiles) | >12% share rate on `calculation_completed` | <8% after 200 calculations |
| SEO pages | First non-brand clicks within 45 days | Zero impressions after 60 days |
| Recipient conversion | >5% of `shared_round_viewed` -> own calculation | <3% after 100 shared views |
| Multi-tool expansion | Tool #2 gets >30% of Tool #1 traffic within 30 days | <10% relative traffic |
| Embeddable widget | >50 visits/month from embedded sources | Zero adoptions after outreach to 10 blogs |
| Referral tiers | >10% of users trigger first referral tier | <5% after 30 days |

---

## Success Metrics

| Metric | Now | 30-Day Target | 90-Day Target |
|--------|-----|---------------|---------------|
| Weekly active users | 105 | 250 | 800 |
| Organic search visitors | ~0 | 100 | 500+ |
| Share-to-visit rate | unknown | measure baseline | 10%+ |
| Recipient-to-own-calc conversion | unknown | measure baseline | 5%+ |
| r/golf referral visitors | 0 | 50 (one-time) | maintain |
| Rounds saved (accounts) | ~low | 50 | 200 |
| Bounce rate | 58% | 50% | 42% |
| Number of golf tools | 1 | 2 | 3-4 |
| Embeds on external sites | 0 | 0 | 3-5 |

---

## What NOT to Build

- **Target-handicap platform.** Clippd already has this with Garmin API distribution. Racing to second place.
- **Coach CRM.** Clippd has multi-year head start with coach seats and college packages.
- **Shot-by-shot tracking.** Round-level summary input is the competitive advantage.
- **Social network/feed.** GolfLync and similar social golf apps have not gained traction. Share on existing platforms.
- **Tour analytics or betting tools.** Data Golf owns it.
- **Public-by-default results.** Vanity handicap culture means private-first, share-by-choice.
- **Personality labels as the headline.** Spotify proved this backfires without brand equity. Data first, always.
- **Native mobile app.** Web-first is the advantage vs. Clippd/Arccos/Sportsbox. PWA handles the install case.

---

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| SEO takes 3-6 months to compound | No organic traffic short-term | Sharing + Reddit provide bridge traffic while SEO builds |
| Realistic K-factor (0.05-0.15) means slow viral growth | Can't depend on sharing alone | Four-engine model; SEO is the workhorse |
| Multi-tool dilutes focus | Mediocre tools that don't convert | Kill criteria on each tool; only expand if Tool #1 share quality is proven |
| Clippd gets Garmin distribution moat | Hardware-connected users never discover free alternatives | Win on zero-friction: free, instant, no signup, no hardware |
| Golfers won't share weaknesses | Share rate stays low | Private-by-default; share cards emphasize strengths; receipt format is novel enough to share for the format itself |
| Benchmark data accuracy questioned | Credibility hit on r/golf | Document methodology transparently; iterate on feedback |
