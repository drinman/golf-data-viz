# PRD: Strokes Gained Benchmarker

| | |
|---|---|
| **Status** | Draft |
| **Last updated** | 2026-02-26 |
| **Engineering status** | Scaffolded — types, seed data, route structure exist. No implementation. |
| **Spec** | `docs/prd-strokes-gained.md` |
| **Roadmap** | `docs/roadmap.md` → Now phase, Milestones 1–3 |
| **Schema** | `docs/supabase-schema.md` + `docs/supabase-schema.sql` |

---

## 1. Problem Statement

Mid-handicap golfers (10–20 HCP) know their score but not **where** they lose strokes. The feeling after a round is vague: "my putting was bad" or "I hit it in the water twice." But they can't quantify it against golfers like them.

Existing tools fail this audience:

| Tool | Problem |
|------|---------|
| **Roundabout** (free) | Benchmarks against PGA Tour only — useless for a 15-handicap |
| **Arccos** ($155/yr + $300 sensors) | Great SG analysis, but cost prohibitive and requires dedicated hardware |
| **Shot Scope** ($180 hardware) | Coarse handicap brackets, requires their sensors |
| **Clippd** ($8/mo + Garmin/Arccos) | "I still struggle with Strokes Gained... I find the insights a little tricky to interpret" — Golf Monthly |
| **DECADE Golf** ($100/yr) | Targets competitive players, manual entry, no visualizations |

**The gap:** No free, quick tool lets a golfer input their round stats and instantly see a visual breakdown of where they gain and lose strokes *compared to their handicap peers*.

---

## 2. Target User

### "Weekend Warrior" — 14-Handicap Male Golfer

| Attribute | Detail |
|-----------|--------|
| Handicap | 10–20 (average male: 14.2) |
| Rounds/week | 1–2 |
| Typical score | 86–92 |
| Stats awareness | Knows FIR%, GIR%, putts from scorecard app (18Birdies, Grint, GHIN) |
| Pain | Vague sense of weaknesses, no data-backed diagnosis |
| Community | Active on r/golf, shares screenshots in group chats |
| Spending | Won't pay $200+/year for Arccos, WILL spend 3 minutes entering stats |
| Device | iPhone primarily, entering data after a round or at 19th hole |

### What they want
> "Show me, in 30 seconds, what's actually holding me back."

### What they'll share
A visual that makes them look data-savvy to their golf buddies. A shareable image they text to the group chat or post to r/golf.

---

## 3. Success Metrics

### Primary: Shareability (the binary validation signal)

Do people share the output? This is the only metric that matters for v1.

| Metric | Target | How to Measure |
|--------|--------|---------------|
| Organic shares from r/golf launch post | 3+ screenshots/reshares within 48hrs | Monitor r/golf, search for tool mentions |
| Image download rate | >10% of completed calculations | Track "Download PNG" clicks |
| Link shares with chart preview | Any organic occurrence | UTM tracking on shareable URLs, referral analytics |

### Secondary: Usage quality

| Metric | Target | How to Measure |
|--------|--------|---------------|
| Time to first chart | <90 seconds from page load | Analytics: page load → "Calculate" click |
| Form completion rate | >60% of users who start the form | Analytics: form start → form submit |
| Return rate | >5% return within 7 days | Analytics: unique return visits |
| Mobile completion rate | Within 20% of desktop | Segment analytics by device |

### Non-goals for MVP

- User accounts or authentication (optional, not measured)
- Revenue or conversion
- Multi-round retention
- Data import volume

---

## 4. User Flow

### Happy Path

```
1. LAND        User arrives at /strokes-gained (from r/golf, link, or homepage)
                → See headline: "Where do you actually gain and lose strokes?"
                → See CTA: enter your handicap to start

2. HANDICAP    User enters handicap index (e.g., 14.3)
                → Auto-selects peer bracket (10-15)
                → Shows: "You'll be compared to 10-15 handicap golfers"

3. BASIC STATS User fills in core round stats
                → Score, course name, date, course/slope rating
                → Fairways hit/attempted, GIR, total putts, penalties
                → Scoring distribution (eagles through triple+)

4. OPTIONAL    User optionally expands "More Stats" section
                → Up-and-down attempts/converted
                → Sand saves/attempts
                → Three-putts

5. VALIDATE    Inline validation as user types
                → Scoring distribution must sum to 18
                → fairwaysHit <= fairwayAttempts
                → upAndDownConverted <= upAndDownAttempts

6. CALCULATE   User clicks "See My Strokes Gained"
                → Brief loading state (< 200ms, all client-side)
                → Scrolls to results

7. VIEW        Results section appears:
                → Radar chart: player performance vs peer average (4 axes)
                → Textual summary: "You gain +1.2 putting but lose -3.4 on approach"
                → Biggest strength and weakness highlighted
                → Peer bracket label: "Compared to 10-15 handicap golfers"

8. SHARE       User shares the result:
                → "Download as PNG" → branded image saves to device
                → "Copy Link" → shareable URL that recreates the chart
                → Screenshot the radar chart directly (designed for this)

9. (OPTIONAL)  User creates account to save round
SAVE           → Magic link or Google OAuth
                → Round saved to their profile for future multi-round analysis
```

### Edge Cases

| Scenario | Handling |
|----------|----------|
| Scoring distribution doesn't sum to 18 | Inline error: "Your scoring breakdown adds up to {N}. It should total 18 holes." |
| Handicap at bracket boundary (e.g., exactly 10.0) | Assign to lower bracket (10-15). Display: "Compared to 10-15 handicap golfers" |
| Handicap > 36 (very high) | Use 30+ bracket. Display: "Compared to 30+ handicap golfers" |
| Optional fields left empty | Calculate with available data. Gray out the SG category that can't be computed (e.g., no up-and-down data → ATG category shows as "insufficient data") |
| User enters 0 fairway attempts (par-3 course) | Skip SG: Off-the-Tee, note "Par-3 course detected — OTT category skipped" |
| Implausible data (e.g., 18 GIR but score of 100) | Warning (not error): "Your stats seem unusual. Double-check your inputs?" Allow submission anyway. |

---

## 5. Functional Requirements

### 5.1 Round Input Form

Built with react-hook-form + Zod schema. All fields derive from the `RoundInput` type in `src/lib/golf/types.ts`.

#### Required Fields

| Field | Type | Default | Validation | Maps to `RoundInput.` |
|-------|------|---------|------------|----------------------|
| Handicap Index | number (1 decimal) | — | 0.0–54.0 | `handicapIndex` |
| Course Name | text | — | Non-empty, max 100 chars | `course` |
| Date Played | date | Today | Not in the future | `date` |
| Score | integer | — | 50–150 | `score` |
| Course Rating | number (1 decimal) | — | 60.0–80.0 | `courseRating` |
| Slope Rating | integer | — | 55–155 | `slopeRating` |
| Fairways Hit | integer | — | 0–14 | `fairwaysHit` |
| Fairway Attempts | integer | 14 | 0–14, >= fairwaysHit | `fairwayAttempts` |
| Greens in Regulation | integer | — | 0–18 | `greensInRegulation` |
| Total Putts | integer | — | 18–60 | `totalPutts` |
| Penalty Strokes | integer | 0 | 0–20 | `penaltyStrokes` |
| Eagles | integer | 0 | 0–18 | `eagles` |
| Birdies | integer | 0 | 0–18 | `birdies` |
| Pars | integer | — | 0–18 | `pars` |
| Bogeys | integer | — | 0–18 | `bogeys` |
| Double Bogeys | integer | 0 | 0–18 | `doubleBogeys` |
| Triple Bogey+ | integer | 0 | 0–18 | `triplePlus` |

#### Optional Fields (behind "More Stats" expand)

| Field | Type | Default | Validation | Maps to `RoundInput.` |
|-------|------|---------|------------|----------------------|
| Up & Down Attempts | integer | — | 0–18 | `upAndDownAttempts` |
| Up & Downs Made | integer | — | 0–attempts | `upAndDownConverted` |
| Sand Save Attempts | integer | — | 0–18 | `sandSaveAttempts` |
| Sand Saves Made | integer | — | 0–attempts | `sandSaves` |
| Three-Putts | integer | — | 0–18 | `threePutts` |

#### Cross-Field Validation Rules

| Rule | Error Message |
|------|---------------|
| eagles + birdies + pars + bogeys + doubleBogeys + triplePlus = 18 | "Scoring breakdown must total 18 holes (currently {N})" |
| fairwaysHit <= fairwayAttempts | "Fairways hit can't exceed fairway attempts" |
| upAndDownConverted <= upAndDownAttempts | "Up & downs made can't exceed attempts" |
| sandSaves <= sandSaveAttempts | "Sand saves can't exceed attempts" |
| threePutts <= totalPutts | "Three-putts can't exceed total putts" |
| Implied: score should be roughly consistent with scoring distribution | Soft warning only, not blocking |

#### Form UX Requirements

- **Progressive disclosure:** Basic stats visible by default. "More Stats" button reveals optional fields.
- **Smart defaults:** Date = today, Fairway Attempts = 14, Penalties = 0, Eagles = 0, Doubles = 0, Triple+ = 0.
- **Mobile-first layout:** Single column, large touch targets, numeric keyboards for number fields.
- **Sticky "Calculate" button** on mobile (visible without scrolling past the form).
- **Auto-bracket display:** After handicap index is entered, show "You'll be compared to {bracket} golfers" immediately.

### 5.2 Strokes Gained Calculation Engine

**Location:** `src/lib/golf/strokes-gained.ts`

The SG calculation adapts the standard Tour SG methodology for aggregate amateur stats. Without shot-level data, we estimate SG per category using stat differentials against the peer bracket benchmark.

#### Methodology

For each SG category, compute the player's performance delta vs their peer bracket, then weight it by the category's typical impact on total score. The approach uses **proxy metrics** since we don't have shot-level SG data:

**SG: Off-the-Tee**
```
playerFIR% = fairwaysHit / fairwayAttempts
peerFIR% = bracket.fairwayPercentage / 100
firDelta = playerFIR% - peerFIR%

penaltyDelta = bracket.penaltiesPerRound - penaltyStrokes  (positive = player is better)

sgOTT = (firDelta * OTT_FIR_WEIGHT) + (penaltyDelta * OTT_PENALTY_WEIGHT)
```

**SG: Approach**
```
playerGIR% = greensInRegulation / 18
peerGIR% = bracket.girPercentage / 100
girDelta = playerGIR% - peerGIR%

sgApproach = girDelta * APPROACH_WEIGHT
```

**SG: Around-the-Green**
```
If upAndDownAttempts provided:
  playerUpDown% = upAndDownConverted / upAndDownAttempts
  peerUpDown% = bracket.upAndDownPercentage / 100
  sgATG = (playerUpDown% - peerUpDown%) * ATG_WEIGHT

If not provided:
  Estimate from GIR and scoring pattern (missed greens that resulted in par vs bogey+)
  sgATG = estimated or null
```

**SG: Putting**
```
playerPuttsPerGIR = totalPutts / max(greensInRegulation, 1)  (avoid div/0)
peerPuttsPerRound = bracket.puttsPerRound
peerPuttsPerGIR = peerPuttsPerRound / max(bracket.girPercentage / 100 * 18, 1)

If threePutts provided:
  peerThreePutts = estimated from bracket data
  threePuttDelta = peerThreePutts - threePutts

sgPutting = (peerPuttsPerGIR - playerPuttsPerGIR) * PUTTING_WEIGHT + threePuttBonus
```

**SG: Total**
```
sgTotal = sgOTT + sgApproach + sgATG + sgPutting

Cross-check: sgTotal should roughly equal (bracket.averageScore - score) adjusted for course difficulty
Adjustment = (courseRating - bracket.averageScore) * slopeAdjustment
```

#### Weights (to be calibrated)

Approximate starting weights based on Tour SG distribution and amateur skill patterns:

| Constant | Starting Value | Rationale |
|----------|---------------|-----------|
| OTT_FIR_WEIGHT | 6.0 | ~14 fairway holes, FIR worth ~0.4 strokes each |
| OTT_PENALTY_WEIGHT | 0.8 | Each penalty costs ~0.8 strokes net |
| APPROACH_WEIGHT | 8.0 | GIR is the highest-leverage stat for mid-handicappers |
| ATG_WEIGHT | 5.0 | Scramble opportunities, ~6 missed greens per round for mid-HCP |
| PUTTING_WEIGHT | 4.0 | Putting variance is lower for amateurs than approach |

These weights should be calibrated so that sgTotal ≈ (bracket.averageScore - score) for typical rounds. Document the calibration process and results.

#### Implementation Requirements

- Pure functions, no side effects
- All functions in `src/lib/golf/strokes-gained.ts`
- Return `StrokesGainedResult` type (defined in `src/lib/golf/types.ts`)
- Handle missing optional fields gracefully (return null for incalculable categories)
- Unit tested with at least 5 representative rounds spanning different brackets
- Edge case tests: perfect round, terrible round, par-3 course (0 fairway attempts), all optional fields missing

### 5.3 Benchmark Data Loader

**Location:** `src/lib/golf/benchmarks.ts`

| Function | Purpose |
|----------|---------|
| `loadBrackets()` | Import and parse `handicap-brackets.json`, return typed `BracketBenchmark[]` |
| `getBracketForHandicap(index: number)` | Return the correct `BracketBenchmark` for a given handicap index |

**Bracket assignment logic (v1 — snap to nearest):**
- 0.0–4.9 → "0-5"
- 5.0–9.9 → "5-10"
- 10.0–14.9 → "10-15"
- 15.0–19.9 → "15-20"
- 20.0–24.9 → "20-25"
- 25.0–29.9 → "25-30"
- 30.0+ → "30+"

**Future (v2):** Interpolate between adjacent brackets for smoother comparison (e.g., a 12.5 handicap gets a weighted blend of 10-15 and 15-20 brackets).

### 5.4 Radar Chart

**Location:** `src/components/charts/radar-chart.tsx`

| Spec | Detail |
|------|--------|
| Library | `@nivo/radar` (`ResponsiveRadar`) |
| Axes | 4: Off-the-Tee, Approach, Around-the-Green, Putting |
| Data series | Player (filled) vs Peer Average (outline/dashed) |
| Data shape | `RadarChartDatum[]` from `src/lib/golf/types.ts` |
| Colors | Green shades for areas where player beats peer, red/orange where they trail |
| Responsive | Works from 320px (mobile) to 1440px (desktop) |
| Accessibility | Labeled axes, tooltips, color-blind safe palette |
| Animation | Subtle enter animation when results first appear |

**Design priority:** This chart will be screenshotted. It must look premium, clean, and branded even when captured as an image out of context. No browser chrome, no UI clutter around the chart area.

### 5.5 Results Summary

**Location:** `src/app/(tools)/strokes-gained/_components/results-summary.tsx`

| Element | Content |
|---------|---------|
| Headline | "Your Strokes Gained Breakdown" |
| Bracket label | "Compared to {bracket} handicap golfers" |
| Biggest strength | "Your best area: {category} (+{value} strokes)" with brief explanation |
| Biggest weakness | "Where you lose the most: {category} ({value} strokes)" with brief tip |
| Per-category table | 4 rows: category name, SG value, +/- indicator, one-line interpretation |
| Total SG | "Overall: {sgTotal} strokes vs your peers" |

### 5.6 Shareable Output

#### PNG Download

| Spec | Detail |
|------|--------|
| Library | `html-to-image` or `html2canvas` |
| Content | Radar chart + key stats + peer bracket label + subtle branding watermark |
| Resolution | 2x for retina quality |
| Dimensions | 1200x630 (OG image standard, also good for social) + 1080x1080 (square for Instagram) |
| File name | `strokes-gained-{date}.png` |

#### Shareable URL

| Spec | Detail |
|------|--------|
| Format | `/strokes-gained?data={base64-encoded-round-data}` |
| Behavior | Pre-fills form and auto-calculates when URL contains data param |
| Length | Keep URL under 2000 chars (base64 of RoundInput is well under this) |
| Alternative | If URL-too-long: generate short ID via Supabase, store round data, link as `/strokes-gained/{id}` |

#### OG Image (Server-Side)

| Spec | Detail |
|------|--------|
| Route | `/api/og` (Next.js Route Handler) |
| Method | Render Nivo SVG server-side, convert to PNG |
| Meta tags | `og:image`, `og:title` ("My Strokes Gained Breakdown"), `og:description` (summary line), `twitter:card` = summary_large_image |
| Caching | Cache generated images (Vercel Edge Cache or Supabase Storage) |

---

## 6. Non-Functional Requirements

| Requirement | Target | Rationale |
|-------------|--------|-----------|
| Mobile-first design | Usable at 375px width, touch-friendly | Primary use: phone after a round |
| Page load | <2s on 4G connection | Fast first impression |
| Calculation speed | <200ms client-side | All calculation is local JS, no API round-trip |
| Screenshot-friendly | Chart area has no UI chrome overlap | The screenshot IS the product |
| No account required | Full tool works without auth | Zero friction for first use |
| Offline-capable | Form + calculation work after initial load | Client-side only for core flow |
| Accessible | WCAG 2.1 AA for form, labeled chart axes | Broad usability |

---

## 7. Data Model

### Existing Types

All domain types are defined in `src/lib/golf/types.ts`:
- `RoundInput` — form data (21 fields)
- `StrokesGainedResult` — calculation output (total + 4 categories + bracket ref)
- `BracketBenchmark` — peer bracket data (14 fields)
- `HandicapBracket` — bracket label union type
- `RadarChartDatum` — chart-ready shape

### Database Schema

See `docs/supabase-schema.md` for full schema design.

Key design decisions:
- `user_id` is nullable → anonymous use without auth for MVP
- SG results stored alongside raw input → no re-calculation needed for history views
- `benchmark_bracket` recorded → tracks which comparison was used (survives benchmark data updates)
- Schema supports future multi-round analysis, community aggregation

### Benchmark Data

Static JSON at `src/data/benchmarks/handicap-brackets.json`. Currently provisional seed data — see `docs/benchmark-validation-plan.md` for validation process. Must be validated before public launch.

---

## 8. MVP Scope

### IN for MVP

- [x] TypeScript domain types (already built)
- [x] Seed benchmark data (already built, needs validation)
- [x] Route structure (already built)
- [ ] Manual round input form (all `RoundInput` fields)
- [ ] SG calculation engine (4 categories)
- [ ] Benchmark data loader
- [ ] Radar chart (player vs peer)
- [ ] Text results summary
- [ ] Download-as-PNG
- [ ] Shareable URL (query params)
- [ ] OG image generation
- [ ] Mobile responsive
- [ ] Landing page (simple hero + CTA)
- [ ] Supabase auth (optional, for saving rounds)
- [ ] Deploy to Vercel

### OUT for MVP

| Feature | Why it's cut | When to revisit |
|---------|-------------|----------------|
| Arccos/Garmin import | Adds complexity, manual input validates the core value | After launch if users request it |
| Heat map visualization | Radar chart first; add heat map as second viz option | Next phase |
| Multi-round trends | Requires round history; single-round validates the core | Next phase |
| Bracket interpolation | Snap-to-nearest is good enough for v1 | After calibrating SG weights |
| AI-generated narrative | Tool #2, gated on shareability validation | Next phase |
| Practice recommendations | Tool #5, requires deep data | Later phase |
| Community features | Requires user base | Later phase |
| Payment/premium tier | No revenue until validation | Later phase |

---

## 9. Acceptance Criteria

### Round Input Form
- [ ] All required fields render with correct input types (number, text, date)
- [ ] Numeric fields use numeric keyboard on mobile
- [ ] Cross-field validation fires on blur and on submit
- [ ] Error messages are specific and helpful (not just "invalid input")
- [ ] "More Stats" expand/collapse works and preserves entered values
- [ ] Smart defaults pre-fill: date=today, fairwayAttempts=14, penalties=0, eagles=0, doubles=0, triple+=0
- [ ] Handicap entry immediately shows peer bracket label
- [ ] Form is completable in <90 seconds on mobile (test with real user)
- [ ] Form renders correctly at 375px width

### SG Calculation Engine
- [ ] Returns correct `StrokesGainedResult` for 5+ test rounds across different brackets
- [ ] Handles missing optional fields (returns null for incalculable categories, not errors)
- [ ] Pure functions — no side effects, no state mutations
- [ ] sgTotal is directionally consistent with (bracket.averageScore - score)
- [ ] Edge cases tested: par-3 course (0 fairway attempts), perfect round, worst-case round

### Radar Chart
- [ ] Renders 4-axis radar with correct data from `RadarChartDatum[]`
- [ ] Two visually distinct series: player (filled) vs peer (outline)
- [ ] Responsive from 320px to 1440px without breaking
- [ ] Axes labeled and readable at all sizes
- [ ] Looks premium as a standalone screenshot (no surrounding UI clutter)
- [ ] Color-blind safe palette

### Results Summary
- [ ] Shows correct SG values per category with +/- indicators
- [ ] Correctly identifies biggest strength and biggest weakness
- [ ] Shows peer bracket label
- [ ] One-line interpretation per category is helpful, not just numbers

### Shareable Output
- [ ] "Download as PNG" produces clean 1200x630 image
- [ ] Image includes: radar chart, key stats, peer bracket, branding
- [ ] Image is retina-quality (2x rendering)
- [ ] Shareable URL recreates exact chart when opened
- [ ] OG meta tags produce correct preview image on: Twitter/X, iMessage, Discord
- [ ] Share/download buttons are obvious and easy to tap on mobile

### End-to-End
- [ ] Full flow (land → input → calculate → view → share) works on mobile Safari
- [ ] Full flow works on desktop Chrome
- [ ] Page loads in <2s on simulated 4G
- [ ] No console errors in production build

---

## 10. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| **Benchmark data inaccuracy** — provisional seed data may produce misleading SG values | High | High | Validate against Arccos + Shot Scope before launch. See `docs/benchmark-validation-plan.md`. |
| **SG methodology too simplified** — aggregate stats → per-category SG is an approximation | Medium | Medium | Document limitations ("directionally correct, not precise"). Label as "estimated SG." Iterate with feedback. |
| **Users don't share** — the core growth thesis fails | Medium | Critical | Design share output first. Test with 5 golfers pre-launch. If it fails, diagnose and pivot visualization style. |
| **Form too long on mobile** — users abandon before completing | Medium | High | Progressive disclosure. Smart defaults. Minimize required fields. Test completion rate. |
| **SG weights need calibration** — initial weights may produce unintuitive results | Medium | Medium | Test against known rounds. Ensure sgTotal ≈ score differential. Adjust weights iteratively. |
| **Nivo SSR complexity** — server-side rendering for OG images may be hard | Low | Low | Client-side first. OG images are nice-to-have for MVP. Can use static fallback OG image. |

---

## 11. Open Questions

| Question | Impact | How to Resolve |
|----------|--------|---------------|
| What SG weights produce the most intuitive results? | Core calculation accuracy | Build engine → test against 10+ real rounds → calibrate |
| Should the radar chart show raw SG values or normalized (0–100) scale? | Chart readability | Prototype both, test with users |
| Is base64-encoded URL the right sharing mechanism, or should we generate short IDs? | Share UX | Start with base64 (simpler), add short IDs if URLs get too long |
| How to handle the "around-the-green" category when up-and-down data is missing? | Completeness of output | Option A: estimate from scoring pattern. Option B: show 3-category chart. Prototype both. |
| What branding/watermark goes on the shareable image? | Brand recognition | Design during Milestone 2 |

---

## Appendix: Reference Files

| File | Contents |
|------|----------|
| `src/lib/golf/types.ts` | All TypeScript domain types |
| `src/data/benchmarks/handicap-brackets.json` | Seed benchmark data (provisional) |
| `src/lib/golf/strokes-gained.ts` | SG engine (stub — to implement) |
| `src/lib/golf/benchmarks.ts` | Benchmark loader (stub — to implement) |
| `src/app/(tools)/strokes-gained/page.tsx` | Page route (stub — to implement) |
| `src/app/(tools)/strokes-gained/_components/` | Colocated components (empty) |
| `src/components/charts/` | Chart wrappers (empty) |
| `src/lib/utils.ts` | `cn()` utility (shadcn/ui pattern) |
| `docs/roadmap.md` | Product roadmap |
| `docs/supabase-schema.md` | Database schema spec |
| `docs/benchmark-validation-plan.md` | Data validation plan |
