# Golf Data Viz — Engineering Task Tracker

> Derived from `docs/prd-strokes-gained.md`. Each item scoped to 1–4 hours.
> Mark items `[x]` as completed. Update this file as work progresses.

---

## Sprint 1: Foundation (Weeks 1–2)

### Setup & Dependencies

- [ ] Install Nivo: `@nivo/radar` and `@nivo/core`
- [ ] Install Supabase: `@supabase/supabase-js` and `@supabase/ssr`
- [ ] Initialize shadcn/ui (`npx shadcn@latest init`) and install components: button, input, label, card, form, select, separator, badge
- [ ] Install form libraries: `react-hook-form`, `@hookform/resolvers`, `zod`
- [ ] Install image export: `html-to-image`
- [ ] Create Supabase project, add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` to `.env.local`
- [ ] Implement Supabase browser client (`src/lib/supabase/client.ts`)
- [ ] Implement Supabase server client (`src/lib/supabase/server.ts`)

### Benchmark Data Loader (`src/lib/golf/benchmarks.ts`)

- [ ] Implement `loadBrackets()` — import and parse `handicap-brackets.json`, return typed `BracketBenchmark[]`
- [ ] Implement `getBracketForHandicap(index: number)` — snap-to-nearest bracket lookup
- [ ] Write unit tests: boundary cases (0.0, 4.9, 5.0, 14.9, 15.0, 30.0, 54.0)
- [ ] Write unit tests: invalid input (negative, > 54, NaN)

### SG Calculation Engine (`src/lib/golf/strokes-gained.ts`)

- [ ] Define and document SG calculation methodology in code comments (reference PRD Section 5.2)
- [ ] Define weight constants (OTT_FIR_WEIGHT, OTT_PENALTY_WEIGHT, APPROACH_WEIGHT, ATG_WEIGHT, PUTTING_WEIGHT)
- [ ] Implement `calculateStrokesGained(input: RoundInput, benchmark: BracketBenchmark): StrokesGainedResult`
- [ ] Implement per-category calculations: SG Off-the-Tee (FIR delta + penalty delta)
- [ ] Implement per-category calculations: SG Approach (GIR delta)
- [ ] Implement per-category calculations: SG Around-the-Green (up-and-down delta, with fallback for missing data)
- [ ] Implement per-category calculations: SG Putting (putts-per-GIR delta + three-putt bonus)
- [ ] Implement `toRadarChartData(result: StrokesGainedResult, benchmark: BracketBenchmark): RadarChartDatum[]`
- [ ] Write unit tests: 5+ representative rounds across different brackets (scratch, 10-HCP, 15-HCP, 20-HCP, 30-HCP)
- [ ] Write unit tests: edge cases (par-3 course with 0 fairway attempts, all optional fields missing, perfect round, worst-case round)
- [ ] Calibration pass: verify sgTotal ≈ (bracket.averageScore - score) for test rounds, adjust weights

---

## Sprint 2: Core UI (Weeks 2–3)

### Zod Validation Schema

- [ ] Create Zod schema for `RoundInput` with all field validations (range checks, types)
- [ ] Add cross-field validation rules (scoring sums to 18, fairwaysHit <= fairwayAttempts, etc.)
- [ ] Add custom error messages per rule (user-friendly, not technical)

### Round Input Form (`src/app/(tools)/strokes-gained/_components/round-input-form.tsx`)

- [ ] Build form component with react-hook-form + Zod resolver
- [ ] Layout: handicap index field at top with immediate bracket display ("Compared to 10-15 HCP golfers")
- [ ] Layout: course metadata section (name, date, course rating, slope rating)
- [ ] Layout: core stats section (score, FIR, GIR, putts, penalties)
- [ ] Layout: scoring distribution section (eagles through triple+) with running total indicator
- [ ] Layout: "More Stats" expandable section (up-and-down, sand saves, three-putts)
- [ ] Smart defaults: date=today, fairwayAttempts=14, penalties=0, eagles=0, doubleBogeys=0, triplePlus=0
- [ ] Inline validation errors on blur and submit
- [ ] Use `inputMode="decimal"` / `inputMode="numeric"` for number fields on mobile
- [ ] Test at 375px width — single column, large touch targets, sticky submit button

### Radar Chart (`src/components/charts/radar-chart.tsx`)

- [ ] Build Nivo `ResponsiveRadar` wrapper component
- [ ] Accept `RadarChartDatum[]` as prop
- [ ] Configure: 4 axes (Off-the-Tee, Approach, Around-the-Green, Putting)
- [ ] Configure: two series — Player (filled) vs Peer Average (outline/dashed)
- [ ] Design color scheme: green-leaning for gain areas, red/orange for loss areas
- [ ] Ensure color-blind safe palette
- [ ] Test responsive behavior: 320px, 375px, 768px, 1024px, 1440px
- [ ] Add subtle enter animation on first render

### Results Summary (`src/app/(tools)/strokes-gained/_components/results-summary.tsx`)

- [ ] Build component: headline + peer bracket label
- [ ] Build per-category breakdown: category name, SG value, +/- indicator, one-line interpretation
- [ ] Build "biggest strength" and "biggest weakness" callout cards
- [ ] Build total SG summary line

### Page Integration (`src/app/(tools)/strokes-gained/page.tsx`)

- [ ] Wire up: form submit → `calculateStrokesGained()` → `toRadarChartData()` → display results
- [ ] Add state management: form data, calculation results, loading/error states
- [ ] Results section appears below form after calculation (smooth scroll to results)
- [ ] Handle error states: invalid input (show form errors), calculation failure (show error message)
- [ ] Verify full end-to-end flow works locally

---

## Sprint 3: Shareable Output (Weeks 3–5)

### PNG Export

- [ ] Build `ShareableCard` component — radar chart + key stats + peer bracket + branding watermark
- [ ] Design card layout for 1200x630 (landscape, OG standard) dimensions
- [ ] Implement "Download as PNG" using `html-to-image` with 2x pixel ratio (retina)
- [ ] Add "Download as PNG" button to results section
- [ ] Test output quality on retina and non-retina displays
- [ ] Verify downloaded image looks good when shared in iMessage, Discord, etc.

### Shareable URL

- [ ] Implement URL encoding: serialize `RoundInput` to base64, append as `?data=` query param
- [ ] Implement URL decoding: on page load, check for `?data=` param, pre-fill form and auto-calculate
- [ ] Add "Copy Link" button that copies shareable URL to clipboard
- [ ] Test: shared URL correctly recreates the exact chart
- [ ] Verify URL length stays under 2000 characters

### OG Image & Social Meta Tags

- [ ] Create `/api/og` route handler for dynamic OG image generation
- [ ] Implement server-side Nivo SVG rendering (or fallback: static branded OG image)
- [ ] Add meta tags to strokes-gained page: `og:image`, `og:title`, `og:description`, `twitter:card`
- [ ] Dynamic meta tags based on `?data=` param (show user's actual results in preview)
- [ ] Test link previews: Twitter/X, iMessage, Discord, Reddit, Slack

### Supabase Round Save (Optional Auth)

- [ ] Run `docs/supabase-schema.sql` in Supabase SQL Editor to create `rounds` table
- [ ] Implement `saveRound()` function — inserts raw input + calculated SG into `rounds` table
- [ ] Add "Save Round" button (visible after calculation)
- [ ] If user not authenticated: prompt to sign in/up (magic link or Google OAuth)
- [ ] Implement basic auth flow (Supabase Auth with `@supabase/ssr`)
- [ ] After auth: auto-save the pending round, redirect back to results
- [ ] Verify RLS: user can only see their own saved rounds

---

## Sprint 4: Polish & Launch (Weeks 5–8)

### Landing Page (`src/app/page.tsx`)

- [ ] Replace Next.js boilerplate with project landing page
- [ ] Hero section: headline + one-sentence value prop + CTA button → `/strokes-gained`
- [ ] Brief "how it works" section (3 steps: enter stats → see breakdown → share)
- [ ] Responsive: works at all breakpoints
- [ ] Fast: no heavy images or animations

### Layout & Navigation

- [ ] Update `src/app/layout.tsx` metadata (title, description, favicon)
- [ ] Add minimal header/nav (logo/name + link to tool)
- [ ] Consistent footer (attribution, links)

### Responsive & Accessibility Audit

- [ ] Test full flow on mobile Safari (iPhone)
- [ ] Test full flow on mobile Chrome (Android)
- [ ] Test full flow on desktop Chrome, Firefox, Safari
- [ ] Keyboard navigation works for all form fields and buttons
- [ ] Screen reader labels on form inputs and chart
- [ ] Verify no horizontal scrolling at any breakpoint

### Performance

- [ ] Run Lighthouse audit — target 90+ performance score
- [ ] Verify page load <2s on simulated 4G (Chrome DevTools)
- [ ] Check bundle size — no unnecessary dependencies
- [ ] Add loading states for any async operations

### Deploy & Launch

- [ ] Deploy to Vercel (connect GitHub repo)
- [ ] Configure custom domain (if ready)
- [ ] Set up analytics (Vercel Analytics or Plausible)
- [ ] Verify production build works end-to-end
- [ ] Write r/golf launch post (frame as free tool, not self-promotion)
- [ ] Post to r/golf
- [ ] Monitor engagement: upvotes, comments, shares, image downloads
- [ ] Document launch results below

---

## Backlog (Post-Launch)

### Near-term (based on validation results)
- [ ] Bracket interpolation — smooth blending between adjacent brackets
- [ ] Heat map visualization (`@nivo/heatmap`) as alternative to radar chart
- [ ] Second PNG format: 1080x1080 square for Instagram
- [ ] "Copy to Clipboard" for image (in addition to download)
- [ ] Multi-round comparison (requires auth + saved rounds)

### Tool #2: AI Round Analyzer (gated on shareability validation)
- [ ] Claude API integration for narrative round analysis
- [ ] Shareable "round recap" card design
- [ ] Natural language SG explanations

### Tool #3: Blow-Up Hole Eliminator (gated on shareability validation)
- [ ] Multi-round pattern analysis engine
- [ ] Blow-up hole identification algorithm
- [ ] Visual pattern display

### Platform
- [ ] Arccos API integration (apply for access, implement auto-import)
- [ ] Garmin Golf CSV import parser
- [ ] Round history dashboard (trends over time)
- [ ] Community benchmark computation from aggregated rounds

---

## Launch Results

_Record results here after r/golf launch._

| Metric | Target | Actual | Date |
|--------|--------|--------|------|
| Organic shares within 48hrs | 3+ | — | — |
| Image download rate | >10% | — | — |
| Return visits within 7 days | >5% | — | — |
| r/golf post upvotes | — | — | — |
| Form completion rate | >60% | — | — |

---

## Review Notes

_Add review notes and corrections here as implementation progresses._
