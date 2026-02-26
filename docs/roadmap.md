# Golf Data Viz — Product Roadmap

## Vision

Shareable golf analytics tools for the 14-handicap golfer. Build the visual language of amateur golf data — the way Kirk Goldsberry's shot charts became the visual language of basketball.

## Strategic Principles

1. **Ship shareable output first, features second.** The shareable image IS the growth engine. Design for screenshotting before designing for UX completeness.
2. **Don't build Tool #2 until Tool #1 validates shareability.** The binary signal: do people organically screenshot and share the radar chart output?
3. **Benchmark against peers, never Tour pros.** A 14-handicap comparing themselves to Scottie Scheffler is useless. Every visualization benchmarks against the user's handicap bracket.
4. **Design the data layer for round history from day one.** The Blow-Up Hole Eliminator and Practice-Play Bridge require multi-round data. Schema supports this even if the MVP is single-round.
5. **Use r/golf as the validation channel.** Nearly 1M subscribers, hostile to self-promo, receptive to genuinely useful tools. Organic sharing there is the signal.
6. **Build tools that make content, not content about tools.** Users generate shareable visual content by using the tool. The tool output *is* the marketing.

---

## Now (Weeks 1–8): Strokes Gained Benchmarker → r/golf Validation

The goal of this phase is a single thing: **ship a free web tool that produces a shareable visual showing where a golfer gains and loses strokes vs their handicap peers.**

### Milestone 1: Working Calculator (Weeks 1–3)

| Item | Description |
|------|-------------|
| SG calculation engine | Pure functions in `src/lib/golf/strokes-gained.ts`. Derive 4-category SG (OTT, approach, ATG, putting) from aggregate round stats + peer bracket benchmarks. Fully unit tested. |
| Benchmark data loader | Load bracket JSON, look up correct bracket by handicap index. Snap-to-nearest for v1 (interpolation later). |
| Round input form | Mobile-first form. All `RoundInput` fields. Progressive disclosure: basic stats first, "More Stats" expands optional fields. Zod validation with cross-field constraints (scoring must sum to 18, etc.). |
| Radar chart | Nivo `@nivo/radar` wrapper. 4 axes. Two series: player vs peer average. Gain/loss color coding. Responsive 320px–1440px. |
| End-to-end pipeline | Form → calculate → display. Working locally. |

**Exit criteria:** A user can input their round, see a radar chart comparing them to their handicap peers, and understand where they gain/lose strokes.

### Milestone 2: Shareable Output (Weeks 3–5)

| Item | Description |
|------|-------------|
| PNG export | "Download as PNG" button. Clean branded image: radar chart + key stats + subtle watermark. Retina-quality. |
| Summary card | "Spotify Wrapped" style card: radar chart + biggest strength/weakness callout + peer bracket label. Designed to look premium when screenshotted. |
| OG image | Server-side Nivo SVG rendering at `/api/og` route. When someone shares a link, the preview shows their actual chart. |
| Social meta tags | og:image, og:title, og:description, twitter:card for link previews on X, iMessage, Discord, Reddit. |
| Shareable URL | Encode round data in URL params (or generate a short ID via Supabase) so shared links recreate the exact chart. |

**Exit criteria:** A user can download their chart as a PNG, share a link that shows the chart in previews, and the shared output looks professional enough to post publicly.

### Milestone 3: Polish & Launch (Weeks 5–8)

| Item | Description |
|------|-------------|
| Landing page | Replace Next.js boilerplate. Hero + CTA → /strokes-gained. Explain what it does in one sentence. |
| Mobile responsive | Full responsive audit. Primary use case: golfer on their phone after a round. |
| Supabase auth | Optional account creation (magic link or Google OAuth). Save rounds for future multi-round features. Not required to use the tool. |
| Deploy | Vercel deployment. Custom domain if ready. Basic analytics (Vercel Analytics or Plausible). |
| r/golf launch | Write and post to r/golf. Not self-promotional — frame as "I built this free thing, here's my output, try it with your stats." |

**Exit criteria:** Live on the internet. Posted to r/golf. Monitoring engagement.

### Validation Gate

**Do not proceed to "Next" until this question is answered:**

> Do people organically share the tool output?

Signals to measure:
- **Primary:** 3+ organic shares (screenshots, link shares) on r/golf within 48 hours of launch post
- **Secondary:** Return visits — same users come back with a second round within 7 days
- **Secondary:** Direct image downloads or share button click rate >10% of completed calculations
- **Negative signal:** People use it once and never come back, no one shares the output

If the validation gate fails, diagnose why before building more tools. Possible pivots: different visualization style, different sharing mechanic, different audience framing.

---

## Next (Months 2–4): Expand If Validated

**Conditional: only proceed if Now phase validates shareability.**

### Tool #2: AI Post-Round Narrative Generator

Take round data and generate a natural-language analysis with embedded visualizations. Not "you lost 2.3 strokes on approach" but: *"Your round fell apart on holes 13–15, where approach shots from 150+ yards into the wind cost you 4.2 strokes against a 12-handicap benchmark."*

- Uses Claude API for narrative generation
- Produces a shareable "round recap" card
- Addresses the Clippd review pain point: "I still struggle with Strokes Gained... I find the insights a little tricky to interpret"

### Tool #3: Blow-Up Hole Eliminator

Identify blow-up hole patterns across multiple rounds. *"You make double-or-worse 40% of the time from right rough on approach shots over 150 yards."*

- Requires round history (hence the schema design in Now phase)
- Emotionally resonant — every mid-handicapper feels this problem
- Shareable content: "I've eliminated 3 blow-up holes per round using this tool"

### Platform Features

| Feature | Purpose |
|---------|---------|
| Round history & trends | Multi-round SG trends over time. Visual improvement tracking. |
| Arccos API integration | Auto-import rounds for Arccos users (eliminate manual input friction). |
| Garmin CSV import | Import from Garmin Golf exports for CT10 sensor users. |

---

## Later (Months 4–8): Platform & Community

### Tool #4: Interactive Course Strategy Visualizer

Visual course strategy maps personalized by handicap. Optimal landing zones, danger areas, club selection overlaid on satellite imagery. *"Here's how a 14-handicap should play Pacifica's Sharp Park, hole by hole, with today's wind."*

- Depends on course data API (Golf Intelligence/StrackaLine)
- Highest complexity but highest viral potential
- Arccos AI Strategy requires $300+ hardware and 90 rounds — this would be free

### Tool #5: The Practice-Play Bridge

Converts SG analysis into structured weekly practice plans with time allocations. *"Spend 40% on approaches from 125–150 yards, 30% on lag putting, 20% on driving accuracy, 10% on short game."*

- Closes the "loop" between on-course data and practice
- Natural premium feature (free analysis → paid practice plans)
- Requires deepest data to be useful

### Monetization Exploration

| Model | Price Point | Precedent |
|-------|------------|-----------|
| Premium tier (deeper AI analysis, unlimited reports, course strategy) | $5–8/month | Arccos $155/year, Break X Golf $19/month |
| Community membership (exclusive tools + private Discord) | $60–90/year | NLU Nest $90/year, BTS $60–275/year |
| Free forever: SG Benchmarker basic | $0 | This stays free — it's the top-of-funnel |

**Validation needed before building premium:** WTP survey with actual mid-handicap users. Do not assume the $5–8/month price point.

### Community

- Discord for mid-handicap golfers focused on data-driven improvement
- Opt-in anonymized round data sharing → build community benchmarks
- Weekly community data analyses ("This week, our 500 members averaged 1.8 three-putts per round")
- Identity-based community: "we're the mid-handicap golfers who use data to get better"

---

## Risks & Dependencies

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Benchmark data inaccuracy (seed data is provisional) | High | High | Validate against Arccos/Shot Scope/USGA before launch. See `docs/benchmark-validation-plan.md`. |
| SG methodology too simplified without shot-level data | Medium | Medium | Document limitations clearly. Iterate based on user feedback. "Directionally correct" is the bar for v1. |
| Mid-handicap golfers don't share data visualizations | Medium | Critical | This is THE risk. Ship fast, test on r/golf, pivot if needed. |
| Form too long / too much friction on mobile | Medium | High | Progressive disclosure. Smart defaults. Minimize required fields. |
| Arccos API access denied to indie developer | Medium | Medium | Only needed for "Next" phase. Manual input works for MVP. Apply early to de-risk. |
| Nivo server-side rendering complexity for OG images | Low | Medium | Client-side rendering first. SSR for OG images is a nice-to-have, not a blocker. |
| Someone else ships this first | Low | High | Speed advantage via Claude Code. Ship in weeks, not months. |

---

## Distribution Channels

| Channel | Role | Timing |
|---------|------|--------|
| r/golf | Primary validation + organic growth | Launch day, weekly data posts |
| X/Twitter | Data viz sharing, golf analytics community | Week 2+ |
| Short-form video (TikTok/Shorts) | Screen recordings of tools in action | Month 2+ |
| Discord | Community layer, retention | Month 3+ if validated |
| Email list | Collected from tool users, for updates | From day one (simple signup) |
