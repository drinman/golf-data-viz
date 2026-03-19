# Peer Percentile Rankings

**Status**: Spec
**Author**: Product
**Date**: 2026-03-17
**Phase**: 1 (Data-First Share Quality)
**Priority**: 1 (highest — primary share hook)

---

## 1. Problem Statement

The SG Benchmarker currently shows raw strokes gained values (+0.42, -1.15) that require golf analytics literacy to interpret. Most 14-handicap golfers cannot intuit what "+0.42 Off the Tee" means relative to their peers. This creates two problems:

1. **Interpretation gap**: Users see numbers but don't feel the comparative context. "+0.42" is abstract; "better than 78% of your peers" is visceral.
2. **Share hook gap**: Raw SG values don't provoke conversation in a group chat. Percentile rankings do — "I'm in the 82nd percentile for approach play" is inherently brag-worthy or debate-starting.

### Research Basis

- The v2 growth plan demoted archetypes after Spotify Wrapped 2024 showed personality labels backfire (brand sentiment dropped 9 points). Hard data outperforms gimmicky labels.
- Peer percentile is the replacement headline: concrete, credible, conversation-starting.
- Clippd charges $25/mo and does not surface peer percentile comparisons — this is a free differentiator.

### User Stories

**As a 14-handicap golfer**, I want to know where I rank among golfers at my level so I understand whether "+0.42 Off the Tee" is impressive or average.

**As a golfer sharing results**, I want a concrete stat like "better than 82% of 14-handicappers" to post in my group chat because it starts a conversation.

**As a returning user**, I want to see if my percentile ranking changes round to round to track whether I'm actually improving relative to peers.

---

## 2. Requirements

### Must Have (MVP)

- [ ] **M1**: For each non-skipped SG category, display a percentile ranking (0-99th) relative to the user's handicap bracket
- [ ] **M2**: Percentile appears on the results page in the `ResultsSummary` component, next to each category's SG value
- [ ] **M3**: Percentile appears on the `ShareCard` (600px PNG) next to each category row
- [ ] **M4**: Percentile appears on the OG image (`/strokes-gained/og` and `/strokes-gained/shared/round/[token]/og`)
- [ ] **M5**: Display format: "Better than 82% of [bracket] golfers" or "Top 18%" — whichever fits the surface
- [ ] **M6**: Derive percentiles from existing benchmark data without external API calls
- [ ] **M7**: Percentiles are computed in `src/lib/golf/` as pure functions, fully testable

### Should Have

- [ ] **S1**: Color-coded percentile badges (green for top 25%, neutral for 25-75%, red for bottom 25%)
- [ ] **S2**: A "standout" callout for the user's highest percentile category — "Your approach is your superpower"
- [ ] **S3**: Percentile displayed on saved round detail pages (`/strokes-gained/rounds/[id]`)
- [ ] **S4**: Percentile included in the share headline text (used in OG description and clipboard copy)

### Won't Have

- **W1**: Cross-bracket percentile (comparing a 14 HCP to all golfers) — always compare within bracket
- **W2**: Percentile history tracking — defer to trend visualization feature
- **W3**: Percentile on the lesson prep report — separate feature scope

---

## 3. Technical Approach

### Percentile Derivation

The benchmark data in `handicap-brackets.json` provides anchor points at discrete handicap levels (0, 5, 10, 15, 20, 25, 30). The existing interpolation system (`getInterpolatedBenchmark`) produces exact-index benchmarks for any handicap.

Percentile derivation uses the **normal distribution approximation**:

1. For each SG category, the user's value represents a deviation from the bracket mean (which is always 0 by definition — SG is relative to the benchmark).
2. Estimate standard deviation per category per bracket from the benchmark anchor spread. The distance between adjacent bracket benchmarks provides a proxy for within-bracket variance.
3. Convert the user's SG value to a percentile using the standard normal CDF.

**New file**: `src/lib/golf/percentile.ts`

```typescript
export interface PercentileResult {
  category: StrokesGainedCategory;
  percentile: number; // 0-99, integer
  label: string; // "Better than 78% of 10-15 HCP golfers"
  tier: "top" | "above-average" | "average" | "below-average" | "bottom";
}

export function calculatePercentiles(
  result: StrokesGainedResult,
): Record<StrokesGainedCategory, PercentileResult>;
```

**Standard deviation estimation approach**:

Use empirical SG standard deviations derived from the benchmark data spread. For each category, the range of SG values across brackets gives us a distribution width. Within a single bracket, typical amateur SG standard deviations are approximately:

| Category | Estimated SD (strokes) |
|----------|----------------------|
| Off the Tee | 1.2 |
| Approach | 1.5 |
| Around the Green | 1.0 |
| Putting | 0.8 |

These are initial estimates based on published amateur SG distributions (Lou Stagner, Shot Scope aggregate data). They should be validated against actual user data once volume permits (100+ rounds per bracket).

**CDF implementation**: Use the Abramowitz & Stegun rational approximation for the normal CDF — no external math library needed. This is ~10 lines of code and accurate to 4 decimal places.

### Integration Points

1. **`ResultsSummary` component** — add percentile below each SG value
2. **`ShareCard` component** — add percentile text in each category row
3. **`og/route.tsx`** — include percentile in OG image category display
4. **`share-headline.ts`** — incorporate highest percentile into headline generation
5. **`StrokesGainedResult` type** — add optional `percentiles` field (computed at render time, not stored)

### Where Computation Happens

Percentiles are computed client-side from the `StrokesGainedResult`. They are a **display transform**, not a calculation that needs server validation. The function is pure and deterministic — same SG values always produce the same percentiles.

For OG images (server-rendered), the same function runs in the Edge runtime.

---

## 4. UI/UX Spec

### Results Page (ResultsSummary)

Each category row currently shows:
```
Off the Tee    [confidence badge]  +0.42
```

New layout:
```
Off the Tee    [confidence badge]  +0.42
               Better than 78% of 10-15 HCP golfers
```

- Percentile text: `text-xs text-neutral-500`
- For top-25% categories: `text-xs font-medium text-data-positive`
- For bottom-25% categories: `text-xs text-data-negative`

### Share Card (600px PNG)

Add percentile as secondary text under each category value:
```
Off the Tee         +0.42  78th %ile
Approach            -1.15  22nd %ile
```

- Compact format to fit within existing card width
- Use `text-[10px]` for percentile to avoid crowding

### OG Image (1200x630)

Add percentile to the category rows in the OG card. Same compact format as share card.

### Standout Callout (S2)

Below the category breakdown, if the user's highest percentile is >= 75th:
```
Your approach play is your superpower — better than 82% of your peers.
```

Styled as a highlight card with a subtle green-tinted background.

---

## 5. Success Metrics

| Metric | Baseline | Target (4 weeks) | How to Measure |
|--------|----------|-------------------|----------------|
| Share rate (copy_link + download_png / calculation_completed) | ~2% | >8% | GA4 event ratio |
| Qualitative: share card screenshots on r/golf mentioning percentile | 0 | Any | Manual monitoring |

---

## 6. Kill Criteria

| Signal | Kill If |
|--------|---------|
| Share rate does not increase after 200 calculations with percentiles | Share rate < 5% after 4 weeks |
| User feedback indicates percentiles feel inaccurate or misleading | Multiple reports of "this doesn't match my experience" |

---

## 7. Implementation Plan

### File Changes

**New files**:
1. `src/lib/golf/percentile.ts` — percentile calculation (pure functions)
2. `tests/unit/percentile.test.ts` — unit tests for percentile derivation

**Modified files**:
3. `src/app/(tools)/strokes-gained/_components/results-summary.tsx` — add percentile display
4. `src/app/(tools)/strokes-gained/_components/share-card.tsx` — add percentile to card
5. `src/app/(tools)/strokes-gained/og/route.tsx` — add percentile to OG image
6. `src/app/(tools)/strokes-gained/shared/round/[token]/og/route.tsx` — add percentile to shared OG image
7. `src/lib/golf/share-headline.ts` — incorporate top percentile into headline

### Implementation Steps

1. Build `percentile.ts` with `calculatePercentiles()` and the normal CDF approximation
2. Write unit tests covering: typical round, extreme values, skipped categories, plus handicap
3. Integrate into `ResultsSummary` — display below each category value
4. Integrate into `ShareCard` — compact format next to SG value
5. Integrate into both OG routes — include in category rows
6. Update share headline to mention top percentile category
7. Visual verification via Playwright screenshot comparison

---

## 8. Open Questions

1. **SD calibration**: The initial standard deviations are estimates. Should we add a mechanism to update them from aggregated user data once we reach 100+ rounds per bracket? **Recommendation**: Ship with estimates, add a `TODO` to revisit after reaching volume threshold.

2. **Skipped categories**: If a category is skipped (e.g., no fairway data), should we show "N/A" for percentile or hide it? **Recommendation**: Hide it — same behavior as the current SG display.

3. **Edge case: SG = 0.00**: A user exactly at the benchmark mean is at the 50th percentile. Display as "Better than 50% of peers" which reads correctly.
