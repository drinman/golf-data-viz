# Tool #2: Score Probability Calculator

**Status**: Spec
**Author**: Product
**Date**: 2026-03-17
**Phase**: 2 (Multi-Tool + Distribution)
**Priority**: 8

---

## 1. Problem Statement

GolfDataViz is a single-tool product. A 14-handicap golfer plays 20-30 rounds per year — that is 20-30 uses max. Between rounds, there is no reason to visit. The site needs additional tools that:

1. Target different search queries (new SEO entry points)
2. Produce shareable output (feed the sharing engine)
3. Cross-link to existing tools (build domain authority)
4. Require minimal or no round data (lower barrier to entry)

"What are the odds I break 80?" is one of the most common questions in recreational golf. It has strong search intent, requires only a handicap index as input, and produces a result that golfers immediately want to share or debate.

### Research Basis

- v2 plan: Multi-tool strategy over single-tool deepening. OmniCalculator grew to 17M monthly visits with 3,700+ simple tools. Each tool is a separate SEO entry point.
- The retention math does not work for a single tool used 20-30 times per year.
- Score probability is grounded in well-understood USGA handicap math: a golfer's scoring distribution approximates a normal distribution around their expected score.

### User Stories

**As a 14-handicap golfer**, I want to know the probability I break 80 the next time I play so I can set realistic expectations.

**As a golfer in a group chat**, I want to share "I have a 12% chance of breaking 80" because it starts an argument about whose odds are better.

**As a golfer googling "what are the odds I break 80"**, I want to find a tool that answers this question instantly.

---

## 2. Requirements

### Must Have (MVP)

- [ ] **M1**: Input: handicap index (single field, same validation as SG tool: -5 to 54)
- [ ] **M2**: Optional input: course rating and slope (if provided, adjusts expected score for course difficulty)
- [ ] **M3**: Output: probability chart showing likelihood of shooting various score ranges
- [ ] **M4**: Key probabilities displayed prominently: P(break 80), P(break 90), P(break 100), P(match or beat handicap differential)
- [ ] **M5**: Shareable result card (PNG, similar quality to SG share card)
- [ ] **M6**: Copy link functionality with encoded result
- [ ] **M7**: Lives at `/score-probability` route
- [ ] **M8**: Server-rendered OG image at `/score-probability/og?hcp={index}`
- [ ] **M9**: Cross-link to SG Benchmarker: "Want to know WHERE you gain and lose strokes? Try the Strokes Gained Calculator"
- [ ] **M10**: All calculation logic in `src/lib/golf/` as pure functions, fully tested

### Should Have

- [ ] **S1**: Visual probability chart — bar chart or bell curve showing the scoring distribution with colored zones for score milestones
- [ ] **S2**: "Your most likely score" callout — the mode/median of the distribution
- [ ] **S3**: Course-adjusted mode: "On this course (CR 72.1, Slope 134), your odds of breaking 80 are X%"
- [ ] **S4**: Comparison callout: "A 10-handicapper has a 28% chance of breaking 80 on this course"
- [ ] **S5**: Mobile-optimized input form (single field, large tap targets, instant results)

### Won't Have

- **W1**: Per-hole probability modeling — this is aggregate scoring distribution only
- **W2**: Integration with the SG Benchmarker results (these are independent tools)
- **W3**: Historical tracking of actual vs predicted scores
- **W4**: Weather or conditions adjustments

---

## 3. Technical Approach

### Scoring Distribution Model

The USGA handicap system is built on the assumption that a golfer's scores follow an approximately normal distribution. The key parameters:

**Expected score** = Course Rating + (Handicap Index x Slope Rating / 113)

For a 14.0 HCP on a course with CR 72.1, Slope 131:
- Expected score = 72.1 + (14.0 x 131 / 113) = 72.1 + 16.2 = 88.3

**Standard deviation**: Research (Lou Stagner, Mark Broadie) suggests amateur scoring SD is approximately 3.5-4.5 strokes for mid-handicappers, increasing slightly for higher handicaps. Model:

| Handicap Range | Scoring SD |
|---------------|-----------|
| Plus to 5 | 3.0 |
| 5-10 | 3.5 |
| 10-15 | 4.0 |
| 15-20 | 4.5 |
| 20-25 | 5.0 |
| 25-30 | 5.5 |
| 30+ | 6.0 |

**Probability calculation**: P(score < X) = normalCDF((X - expectedScore) / SD)

Uses the same normal CDF approximation as the percentile feature (Abramowitz & Stegun).

### New Files

```
src/
  app/
    (tools)/
      score-probability/
        page.tsx                    → main page (RSC wrapper)
        _components/
          score-probability-client.tsx  → client component (form + results)
          probability-share-card.tsx    → share card for PNG export
        og/
          route.tsx                 → OG image generation
  lib/
    golf/
      score-probability.ts          → pure calculation functions
```

### Calculation Module

**File**: `src/lib/golf/score-probability.ts`

```typescript
export interface ScoreProbabilityInput {
  handicapIndex: number;
  courseRating?: number;  // defaults to 72.0
  slopeRating?: number;  // defaults to 113
}

export interface ScoreProbabilityResult {
  expectedScore: number;
  standardDeviation: number;
  probabilities: {
    breakEighty: number;   // P(score < 80)
    breakNinety: number;   // P(score < 90)
    breakHundred: number;  // P(score < 100)
    matchHandicap: number; // P(score <= expectedScore)
  };
  distribution: Array<{
    score: number;
    probability: number;
  }>;
}

export function calculateScoreProbability(
  input: ScoreProbabilityInput
): ScoreProbabilityResult;
```

The `distribution` array provides probability density for each integer score from (expected - 4*SD) to (expected + 4*SD), used to render the bar chart.

### Share Card Design

600x600 PNG (matches SG card dimensions for consistency):

```
┌──────────────────────────────┐
│  Dark green header           │
│  14.0 Handicap Index         │
│  CR 72.1 / Slope 131         │
│                              │
│  Most Likely Score: 88       │
│                              │
├──────────────────────────────┤
│  White body                  │
│                              │
│  [Bar chart: scoring dist]   │
│                              │
│  Break 80:  12%              │
│  Break 90:  62%              │
│  Break 100: 97%              │
│                              │
│  golfdataviz.com             │
└──────────────────────────────┘
```

### URL Encoding

Results are shareable via query parameter: `/score-probability?hcp=14&cr=72.1&slope=131`

No complex encoding needed — three numeric parameters. The page reads from URL params and calculates on load (same pattern as SG tool's `?d=` parameter).

---

## 4. UI/UX Spec

### Input Form

Minimal form — one required field, two optional:

```
┌──────────────────────────────────────┐
│  What's the probability you          │
│  break your target score?            │
│                                      │
│  Handicap Index  [  14.0  ]          │
│                                      │
│  ▼ Course details (optional)         │
│    Course Rating  [  72.1  ]         │
│    Slope Rating   [  131   ]         │
│                                      │
│  [  Calculate My Odds  ]             │
└──────────────────────────────────────┘
```

- Course details collapsed by default (disclosure triangle)
- Same input validation and styling as SG form fields
- Instant calculation on submit (no server call — all client-side math)

### Results Display

```
┌──────────────────────────────────────┐
│  Your Scoring Odds                   │
│  14.0 handicap on a CR 72.1 course   │
│                                      │
│  [========= Bar chart =========]     │
│  Score distribution (bell curve)     │
│                                      │
│  Most likely score: 88               │
│                                      │
│  ┌──────────┬────────────────────┐   │
│  │ Break 80 │ 12% chance         │   │
│  │ Break 90 │ 62% chance         │   │
│  │ Break 100│ 97% chance         │   │
│  └──────────┴────────────────────┘   │
│                                      │
│  [Download PNG]  [Copy Link]         │
│                                      │
│  Want to know WHERE you gain and     │
│  lose strokes? Try the Strokes       │
│  Gained Calculator →                 │
└──────────────────────────────────────┘
```

### Bar Chart

Use Nivo `@nivo/bar` (already a project dependency via `@nivo/radar`). The chart shows probability density for each integer score, with colored zones:
- Green zone: scores below 80
- Yellow zone: scores 80-89
- Orange zone: scores 90-99
- Red zone: scores 100+

The user's expected score is marked with a vertical line.

---

## 5. Success Metrics

| Metric | Baseline | Target (30 days) | How to Measure |
|--------|----------|-------------------|----------------|
| Tool #2 traffic relative to Tool #1 | N/A | >30% of SG calculator traffic | GA4 page_view comparison |
| Score probability calculations | 0 | 50+/week | GA4 custom event |
| Cross-tool navigation (probability → SG) | N/A | >10% of probability users | GA4 navigation events |
| Organic search clicks to /score-probability | 0 | Any within 45 days | Google Search Console |
| Share rate | N/A | >5% of calculations | GA4 event ratio |

### Analytics Events to Add

```typescript
| "probability_calculated"      // User submitted the form
| "probability_png_downloaded"  // User downloaded share card
| "probability_link_copied"     // User copied share link
| "probability_cross_tool_clicked" // User clicked CTA to SG calculator
```

---

## 6. Kill Criteria

| Signal | Kill If |
|--------|---------|
| Tool #2 relative traffic | <10% of Tool #1 traffic within 30 days of launch |
| No organic search traction | Zero search impressions after 45 days |
| Share rate | <3% after 100 calculations |

---

## 7. Implementation Plan

### Implementation Steps

1. Build `score-probability.ts` with pure calculation functions
2. Write comprehensive unit tests (edge cases: plus handicap, 36+ handicap, no course data, par-3 course rating)
3. Create the page route structure at `/score-probability`
4. Build the client component with form and results display
5. Integrate Nivo bar chart for the distribution visualization
6. Build the share card component
7. Build the OG image route
8. Add cross-linking CTA to the SG Benchmarker
9. Add analytics events
10. Add `/score-probability` to sitemap
11. Add SEO metadata and schema markup (`WebApplication`)

### Dependencies

- Nivo `@nivo/bar` — check if already installed or if additional package needed
- Normal CDF function — reuse from percentile feature (or shared `src/lib/golf/math.ts`)
- Share card capture — reuse existing `captureElementAsPng` from `src/lib/capture.ts`
- Share link encoding — simple query params, no codec needed

---

## 8. Open Questions

1. **Bar chart library**: Should the distribution chart use Nivo `@nivo/bar` or a simpler custom SVG? Nivo adds consistency with the existing radar chart. Custom SVG is lighter. **Recommendation**: Use Nivo for consistency — the dependency already exists.

2. **Score milestones**: The spec assumes 80/90/100 as universal milestones. Should these be dynamic based on handicap? A 5-handicapper cares about breaking 75, not 100. **Recommendation**: Show all milestones where probability is between 1% and 99%. A 5-HCP would see "Break 75: 22%, Break 80: 78%" while a 25-HCP would see "Break 90: 8%, Break 100: 52%."

3. **Course database**: Should we offer course lookup (like the SG form)? **Recommendation**: Not for MVP. Manual entry of CR/slope is fine. Course database integration is a separate feature that would benefit both tools.
