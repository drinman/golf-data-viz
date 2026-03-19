# Recipient-Optimized Landing Page

**Status**: Spec
**Author**: Product
**Date**: 2026-03-17
**Phase**: 1 (Data-First Share Quality)
**Priority**: 5

---

## 1. Problem Statement

When someone opens a shared round link, they see the sender's results — and then nothing. There is no clear path from "viewing someone else's results" to "trying the tool myself." The viral loop is open: shares go out, but recipients do not convert into new users.

The current shared round page (`/strokes-gained/shared/round/[token]`) displays the sender's SG breakdown and share card but has no call-to-action to start the recipient's own calculation.

### Research Basis

- v2 plan identifies recipient-to-own-calculation conversion as a primary metric (target: >5% of shared_round_viewed).
- The realistic K-factor is 0.05-0.10. Every percentage point of recipient conversion directly impacts the viral coefficient.
- The current conversion rate is unknown because there is no CTA and no tracking of recipient behavior.
- Pre-filling the handicap bracket from the shared round reduces friction: the recipient already knows roughly what bracket they are in because they know their playing partner's level.

### User Stories

**As someone who received a shared round link**, I want to see my friend's results AND a clear way to try the tool myself so I can compare my own game.

**As a golfer who is competitive with my playing partner**, I want to quickly see if my SG numbers are better or worse than theirs so I'm motivated to input my own stats.

**As GolfDataViz**, I want every shared link to be a conversion funnel that turns viewers into users.

---

## 2. Requirements

### Must Have (MVP)

- [ ] **M1**: Add a prominent "How do YOU compare?" CTA on all shared round pages
- [ ] **M2**: CTA links to `/strokes-gained` with pre-filled handicap bracket from the shared round
- [ ] **M3**: The CTA is visually prominent — not buried below the fold
- [ ] **M4**: Track recipient behavior: `shared_round_cta_clicked`, `recipient_started_own_calc`, `recipient_completed_own_calc`
- [ ] **M5**: Add UTM params to all share links: `utm_source=share&utm_medium={channel}&utm_campaign=round_share`
- [ ] **M6**: Apply to both URL-encoded share links (`/strokes-gained?d=`) and saved round share links (`/strokes-gained/shared/round/[token]`)

### Should Have

- [ ] **S1**: Pre-fill the handicap index field with the shared round's handicap (not just the bracket)
- [ ] **S2**: Show a comparison teaser: "Your friend is a 14 handicap. They gained +0.85 strokes putting. Can you beat that?"
- [ ] **S3**: Sticky CTA bar on mobile that remains visible while scrolling through the shared results
- [ ] **S4**: Track full funnel: shared_round_viewed → cta_clicked → form_started → calculation_completed (all with utm_source=share attribution)
- [ ] **S5**: Different CTA copy based on the sender's result sentiment:
  - Positive total SG: "Your friend is beating their peers. Can you?"
  - Negative total SG: "Think you can do better? Find out."
  - Neutral: "How do your stats compare?"

### Won't Have

- **W1**: Side-by-side comparison view (recipient vs sender) — that is the "Challenge a Friend" feature, separate scope
- **W2**: Account creation requirement before trying the tool
- **W3**: Changing the sender's results display (the shared page still shows their full results)
- **W4**: Recipient notification back to the sender ("your friend tried the tool")

---

## 3. Technical Approach

### Shared Round Pages (Two Surfaces)

**Surface 1: URL-encoded links** (`/strokes-gained?d={encoded}`)
- These are the primary share format (copy link on results page)
- Currently: loads the form pre-filled with the shared round's data and shows results
- Change: add a CTA section above or alongside the results

**Surface 2: Saved round share links** (`/strokes-gained/shared/round/[token]`)
- These are the server-side share format (for saved rounds with share tokens)
- Currently: shows the `SharedRoundClient` component with results
- Change: add the same CTA component

### CTA Component

**File**: `src/components/recipient-cta.tsx`

A reusable component that appears on any shared results view:

```typescript
interface RecipientCtaProps {
  senderHandicap: number;
  senderTotalSg: number;
  senderCourseName: string;
  shareSource: "encoded" | "token";
}
```

The component renders:
1. A highlight card with the CTA copy
2. A button linking to `/strokes-gained?bracket={bracket}&utm_source=share&utm_medium=referral`
3. An optional comparison teaser based on the sender's result

### Pre-fill via Query Params

Add support for a `bracket` query parameter on the SG tool page:

```typescript
// In strokes-gained-client.tsx
const searchParams = useSearchParams();
const prefillBracket = searchParams.get("bracket");
// If present, pre-select the handicap index input to the bracket midpoint
```

This is lightweight — just a default value in the form. The user can change it.

### UTM Parameter Strategy

All share links should include UTM params for attribution:

```
/strokes-gained?d={encoded}&utm_source=share&utm_medium=copy_link&utm_campaign=round_share
/strokes-gained/shared/round/{token}?utm_source=share&utm_medium=share_token&utm_campaign=round_share
```

These UTMs flow through to GA4 automatically (GA4 reads standard UTM params from the URL).

Modify the share link generation in `strokes-gained-client.tsx`:
- `handleCopyLink`: append UTM params to the copied URL
- `createShareToken`: ensure the shared page URL includes UTM params

### Conversion Tracking

Define the funnel stages as GA4 events:

1. `shared_round_viewed` (already exists) — recipient opens the shared link
2. `shared_round_cta_clicked` (new) — recipient clicks "How do YOU compare?"
3. `recipient_started_own_calc` (new) — recipient starts filling the form (identified by utm_source=share)
4. `recipient_completed_own_calc` (new) — recipient completes a calculation (identified by utm_source=share)

Stages 3 and 4 can be derived from existing events (`form_started`, `calculation_completed`) filtered by `utm_source=share` — no new events needed for those. But explicit events make the funnel clearer in GA4 reports.

---

## 4. UI/UX Spec

### CTA Placement (Shared Round Page)

The CTA appears between the sender's results summary and the share card:

```
┌──────────────────────────────────────┐
│  [Sender's radar chart + results]    │
│                                      │
│  ┌──────────────────────────────┐    │
│  │  💡 How do YOU compare?      │    │
│  │                              │    │
│  │  Your friend shot 87 as a    │    │
│  │  14-handicapper and gained   │    │
│  │  +0.40 strokes on their      │    │
│  │  peers. Think you can do     │    │
│  │  better?                     │    │
│  │                              │    │
│  │  [  Try the Free Calculator → ]│  │
│  │                              │    │
│  │  Takes 2 minutes · No signup │    │
│  └──────────────────────────────┘    │
│                                      │
│  [Sender's share card]               │
└──────────────────────────────────────┘
```

### CTA Styling

- Card: `rounded-xl border-2 border-accent-500 bg-accent-50 p-6`
- Heading: `text-lg font-bold text-brand-900`
- Body: `text-sm text-neutral-700`
- Button: primary CTA style (`bg-brand-800 text-white rounded-lg px-6 py-3 font-semibold`)
- Subtext: `text-xs text-neutral-500`
- The gold/accent border makes the CTA stand out from the neutral results content

### Sticky Mobile CTA

On mobile (<640px), add a sticky bar at the bottom of the viewport:

```
┌──────────────────────────────────────┐
│  How do your stats compare?          │
│  [  Try Free Calculator →  ]         │
└──────────────────────────────────────┘
```

- `fixed bottom-0 left-0 right-0 bg-white border-t border-cream-200 p-3`
- Appears after scrolling past the inline CTA (Intersection Observer)
- Does not appear if the inline CTA is visible

---

## 5. Success Metrics

| Metric | Baseline | Target (30 days) | How to Measure |
|--------|----------|-------------------|----------------|
| Recipient CTA click rate | N/A (no CTA exists) | >15% of shared_round_viewed | GA4: shared_round_cta_clicked / shared_round_viewed |
| Recipient → own calculation conversion | 0% | >5% of shared_round_viewed | GA4: recipient_completed_own_calc / shared_round_viewed |
| Share link UTM attribution | Not tracked | 100% of share links include UTMs | Code verification |

---

## 6. Kill Criteria

| Signal | Kill If |
|--------|---------|
| Recipient conversion | <3% after 100 shared round views |
| CTA click rate | <8% after 100 shared round views |

---

## 7. Implementation Plan

### File Changes

**New files**:
1. `src/components/recipient-cta.tsx` — CTA component for shared pages

**Modified files**:
2. `src/app/(tools)/strokes-gained/shared/round/[token]/_components/shared-round-client.tsx` — add RecipientCta
3. `src/app/(tools)/strokes-gained/_components/strokes-gained-client.tsx` — add RecipientCta for encoded share links (when `initialInput` is present), add UTM params to share link generation
4. `src/lib/analytics/events.ts` — add recipient events
5. `src/lib/golf/share-codec.ts` — include UTM params in encoded share URLs (or handle in the client)

### Implementation Steps

1. Build the `RecipientCta` component with configurable copy
2. Integrate into `shared-round-client.tsx` (saved round share pages)
3. Integrate into `strokes-gained-client.tsx` (encoded share links — when `initialInput` is present and `utm_source` is absent, meaning the viewer is a recipient, not the sender)
4. Add UTM params to all share link generation paths
5. Add analytics events for the recipient funnel
6. Build the sticky mobile CTA with Intersection Observer
7. Configure a GA4 funnel exploration report for the recipient conversion path
8. Test end-to-end: share a round → open as recipient → see CTA → click → complete own calculation → verify all events fire

---

## 8. Open Questions

1. **Sender vs recipient detection**: When someone opens a `?d=` encoded link, how do we know if they are the sender (returning to their own results) or a recipient? **Recommendation**: Check for `utm_source=share` in the URL. Share links include UTM; direct calculator use does not. If no UTM, assume sender returning and do not show CTA. If UTM present, show CTA.

2. **Pre-fill accuracy**: Pre-filling with the sender's handicap might be wrong for the recipient. **Recommendation**: Pre-fill as a default but make it clearly editable. Add placeholder text: "Enter your handicap index."

3. **CTA on sample results**: Should the CTA appear when viewing sample/demo results? **Recommendation**: No — the CTA is only for shared results from a real user. Sample results should show the normal "Try with your own data" flow.
