# Golf Data Viz — Product Roadmap (v3)

> **Supersedes v2 roadmap.** Updated 2026-03-20 based on analytics deep research spike (157 users, 19 saved rounds, 14-day behavioral data).

## Thesis

**GolfDataViz is the free golf analytics website** — a collection of fast, shareable golf tools that golfers find through search and share through group chats. Not a dashboard. Not a single calculator. A site where every output is designed to travel.

Four growth engines, not one:
1. **SEO** — each tool and benchmark page is a landing page
2. **Sharing** — every output is a shareable artifact
3. **Embeds** — widget distribution through golf blogs
4. **Community** — Reddit + newsletter (supplementary, not primary)

## Strategic Shifts From v2

| v2 Assumption | v3 Position | Why (Evidence) |
|---------------|-------------|----------------|
| Ship features to grow | Fix the funnel before adding features | 73% of visitors never see results; 91% drop at save. New features reach only the 27% who complete the form. |
| "Quick mode" with fewer fields reduces friction | UX improvements on existing fields, not fewer fields | Field sensitivity analysis: only 3 of 23 fields have zero calc impact — all in the collapsed optional section. Removing them doesn't reduce visible form length. |
| Save failures are server bugs | Save failures were client-side Turnstile/adblocker (resolved: Turnstile removed, replaced with honeypot + fail-open rate limiting) | Sentry showed 5 Turnstile events vs GA4's ~9 failures. Fix: removed Turnstile entirely, added honeypot field, made rate limiter fail-open. |
| Narrative AI is a value-add | Narrative AI is a trust risk at 40% failure rate | 64% of users who request narratives experience at least one failure. Needs reliability fix before promotion. |
| Viral loop needs features (receipt, story card) | Viral loop needs measurement first | `recipient_completed_own_calc` fires on ALL calculations, not just recipients. We literally cannot evaluate the viral loop kill criterion. |

---

## What's Already Shipped

SG Benchmarker launched 2026-03-06. Since then: round history + trends, Stripe billing, lesson prep reports, saved round sharing, score-first share cards, plus handicap support, proxy SG 2.0, trust scoring, GA4 analytics (70+ events), benchmark interpolation, share UX overhaul (two-tier iOS-native), SEO content pages, and more. Full list in git history.

**Current state (2026-03-20):**
- 157 users (28d), 109 WAU, 225 pageviews/week (-58% WoW from launch spike)
- 19 saved rounds, 2 authenticated users
- 73% mobile, 71% iOS, 96% US+CA
- 58% of rounds from 10-14.9 bracket (target audience)
- Viral loop active: 22 users viewed shared rounds (14% of traffic)
- Organic search: 1 click in 3 months (sitemap submitted Mar 19)
- Form: 49% start rate, 27% completion rate
- Save: ~57% failure rate (was Turnstile/adblocker — Turnstile removed 2026-03-23, replaced with honeypot)
- Narrative: ~40% failure rate (undiagnosed, instrumentation shipping)

---

## Phase 0 (Now): Fix the Funnel

**Goal: Stop losing users to preventable failures. Instrument everything we can't currently measure.**

> Research spike completed 2026-03-20. Instrumentation PR ready to ship. Data collection begins immediately, analysis at +2 weeks.

| # | Feature | Status | Notes |
|---|---------|--------|-------|
| 0a | Analytics instrumentation spike (R1-R4) | **Spec ready** | Field-level abandonment, viral loop tracking, save/narrative failure enrichment. See `docs/specs/analytics-instrumentation-spike.md`. |
| 0b | Share-codec handicap clamp | Ready to ship | Fix RangeError for plus handicaps >9.9 in shared links. Two Sentry errors confirmed. |
| 0c | Remove dead form fields (sandSaves, onePutts) | Ready to ship | Zero calculation impact confirmed by field sensitivity analysis. Reduces optional section noise. |
| 0d | Save reliability decision gate | **Blocked on R3 data** | After 1-2 weeks of R3 data: if anonymous save failure >30%, gate save behind auth. See `docs/specs/save-auth-gate.md`. |
| 0e | Narrative reliability fix | **Blocked on R4 data** | After 1-2 weeks of R4 data: fix based on root cause (timeout → increase/stream, rate limit → raise cap, prompt → fix prompt). |
| 0f | Form UX optimization | **Blocked on R1 data** | After 2 weeks of R1 data: fix the specific field causing dropout. See `docs/specs/form-ux-optimization.md`. |

**Phase 0 exit criteria:** Save failure rate <10%, narrative failure rate <15%, field-level abandonment data collected, viral loop conversion rate baselined.

---

## Phase 1 (Weeks 1-3 post-Phase 0): Data-First Share Quality + SEO Foundation

**Goal: Make results worth sharing AND findable.**

| # | Feature | Status | Notes |
|---|---------|--------|-------|
| 1 | Peer percentile rankings on results | **Done** | "Your putting is better than 82% of 14-handicappers." Primary share hook. See `docs/specs/peer-percentile-rankings.md`. |
| 2 | GA4 key events configuration | **Done** | Shipped with analytics spike. 70+ events tracked, dual-sink to Vercel + GA4. |
| 3 | SEO landing pages (`/learn/` + `/benchmarks/`) | **Done** | Shipped. 17 pages discovered by GSC. Monitoring indexing. |
| 4 | Round Receipt share format | Spec ready | Receipt-style PNG, Instagram/iMessage-native. See `docs/specs/round-receipt-share-format.md`. |
| 5 | Recipient-optimized shared link landing | **Spec updated** | "How do YOU compare?" CTA. Now gated on R2 viral loop baseline data. See `docs/specs/recipient-optimized-landing.md`. |
| ~~6~~ | ~~9:16 story card export~~ | **Cut** | Story card component deleted in share UX overhaul. Native share sheet + receipt format covers the use case. |

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
| 12 | Reddit seeding | Launch channel, not sustained engine. 2-3 weeks of genuine r/golf participation, data insight posts, one launch post. Plan for one-time traffic bump. Launch package ready: `docs/reddit-launch.md`. |
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

| Bet | Success Signal | Kill If | Status |
|-----|---------------|---------|--------|
| Share cards (receipts + percentiles) | >12% share rate on `calculation_completed` | <8% after 200 calculations | **Borderline ~12%** (copy_link only, receipt not shipped) |
| SEO pages | First non-brand clicks within 45 days | Zero impressions after 60 days | **Too early** — sitemap submitted Mar 19, check Apr 15 |
| Recipient conversion | >5% of `shared_round_viewed` → own calculation | <3% after 100 shared views | **Not measurable** — R2 instrumentation shipping |
| Multi-tool expansion | Tool #2 gets >30% of Tool #1 traffic within 30 days | <10% relative traffic | Not started |
| Embeddable widget | >50 visits/month from embedded sources | Zero adoptions after outreach to 10 blogs | Not started |
| Referral tiers | >10% of users trigger first referral tier | <5% after 30 days | Not started |

---

## Success Metrics

| Metric | Baseline (Mar 20) | 30-Day Target | 90-Day Target |
|--------|-------------------|---------------|---------------|
| Weekly active users | 109 | 250 | 800 |
| Organic search visitors | ~0 | 50 | 500+ |
| Form start rate | 49% | 55% | 65% |
| Form completion rate | 27% | 35% | 45% |
| Save failure rate | ~57% | <10% | <5% |
| Narrative failure rate | ~40% | <15% | <5% |
| Share-to-visit rate (viral loop) | unknown | measure baseline | 10%+ |
| Recipient-to-own-calc conversion | unknown | measure baseline | 5%+ |
| Rounds saved (total) | 19 | 75 | 300 |
| Authenticated users | 2 | 15 | 50 |
| Bounce rate | 58% | 50% | 42% |
| Number of golf tools | 1 | 1 | 2-3 |

---

## What NOT to Build

- **"Quick mode" / reduced-field form.** Research spike killed this — only 3 fields have zero impact, all in collapsed section. Removing them doesn't reduce visible form length.
- **Target-handicap platform.** Clippd already has this with Garmin API distribution. Racing to second place.
- **Coach CRM.** Clippd has multi-year head start with coach seats and college packages.
- **Shot-by-shot tracking.** Round-level summary input is the competitive advantage.
- **Social network/feed.** GolfLync and similar social golf apps have not gained traction. Share on existing platforms.
- **Tour analytics or betting tools.** Data Golf owns it.
- **Public-by-default results.** Vanity handicap culture means private-first, share-by-choice.
- **Personality labels as the headline.** Spotify proved this backfires without brand equity. Data first, always.
- **Native mobile app.** Web-first is the advantage vs. Clippd/Arccos/Sportsbox. PWA handles the install case.
- **Session recording tools.** R1-R4 instrumentation answers the immediate questions. Revisit if behavioral data is insufficient.

---

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| SEO takes 3-6 months to compound | No organic traffic short-term | Sharing + Reddit provide bridge traffic while SEO builds. Sitemap submitted; check Apr 15. |
| Realistic K-factor (0.05-0.15) means slow viral growth | Can't depend on sharing alone | Four-engine model; SEO is the workhorse |
| Phase 0 fixes take too long, traffic flatlines | Lose the launch cohort | Time-box Phase 0 to 2 weeks of data collection + 1 week of fixes. Reddit launch provides bridge. |
| Multi-tool dilutes focus | Mediocre tools that don't convert | Kill criteria on each tool; only expand if Tool #1 funnel is healthy (Phase 0 exit criteria met) |
| Clippd gets Garmin distribution moat | Hardware-connected users never discover free alternatives | Win on zero-friction: free, instant, no signup, no hardware |
| Golfers won't share weaknesses | Share rate stays low | Private-by-default; share cards emphasize strengths; receipt format is novel enough to share for the format itself |
| Benchmark data accuracy questioned | Credibility hit on r/golf | Document methodology transparently; iterate on feedback |
| Ad blockers permanently break anonymous save | Anonymous users can never save | **Resolved 2026-03-23**: Turnstile removed, replaced with honeypot + fail-open rate limiting |
