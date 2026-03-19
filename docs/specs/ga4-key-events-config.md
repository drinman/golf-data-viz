# GA4 Key Events Configuration

**Status**: Spec
**Author**: Product
**Date**: 2026-03-17
**Phase**: 1 (Data-First Share Quality)
**Priority**: 2 (second highest — can't improve what you can't measure)

---

## 1. Problem Statement

The GolfDataViz funnel is currently unmeasured at the event level. While GA4 is integrated and 9+ custom events fire via `trackEvent()`, none of these events are configured as **key events** (formerly "conversions") in GA4. This means:

1. No funnel visualization in GA4 — cannot see dropoff between form_started and calculation_completed
2. No conversion rate reporting — cannot answer "what % of visitors complete a calculation?"
3. No attribution clarity — cannot tell which traffic sources drive actual tool usage vs bounces
4. No share rate measurement — cannot prove sharing features work
5. No basis for kill criteria — the v2 plan's kill thresholds require event-level measurement

This is instrumentation, not a feature. It produces no user-visible change but is prerequisite to evaluating every other spec in the v2 plan.

### Research Basis

- v2 plan: "Can't improve what you can't measure." GA4 key events configuration is priority #2 (after percentile rankings).
- Current state: 58% bounce rate trending up, ~2% estimated share rate, 0% measured retention. All estimates — no funnel data to validate.
- Kill criteria for 6+ features depend on GA4 event ratios (e.g., share rate > 8% after 200 calculations).

---

## 2. Requirements

### Must Have (MVP)

- [ ] **M1**: Configure the following events as GA4 key events:
  - `calculation_completed` — primary conversion (user got value from the tool)
  - `copy_link_clicked` — share action (link sharing)
  - `download_png_clicked` — share action (image sharing)
  - `shared_round_viewed` — viral loop (someone opened a shared link)
  - `round_saved` — retention signal (user created an account and saved data)
- [ ] **M2**: Set up a GA4 funnel exploration report:
  - Step 1: `landing_cta_clicked` or `form_started` (entry)
  - Step 2: `calculation_completed` (value delivered)
  - Step 3: `copy_link_clicked` OR `download_png_clicked` (share attempt)
  - Step 4: `shared_round_viewed` (viral loop closed)
- [ ] **M3**: Verify all events fire correctly with GA4 DebugView on staging
- [ ] **M4**: Create a GA4 custom report for share rate: `(copy_link_clicked + download_png_clicked) / calculation_completed`
- [ ] **M5**: Document the key events and funnel setup for future reference

### Should Have

- [ ] **S1**: Add missing events for recipient conversion tracking:
  - `recipient_started_own_calc` — recipient begins their own calculation (requires recipient-optimized-landing spec)
  - `recipient_completed_own_calc` — recipient finishes their own calculation
- [ ] **S2**: Set up GA4 audience segments:
  - "Engaged calculators" — users with 2+ `calculation_completed` events
  - "Sharers" — users with 1+ share events
  - "From shares" — users arriving via `utm_source=share`
- [ ] **S3**: Configure event parameters for richer reporting:
  - `calculation_completed` → include `handicap_bracket`, `has_course_rating`
  - `shared_round_viewed` → include `referrer`, `utm_source`
- [ ] **S4**: Create a weekly automated email report (GA4 scheduled email) with key metrics

### Won't Have

- **W1**: Google Ads conversion tracking (no paid acquisition planned)
- **W2**: Server-side event sending (GA4 Measurement Protocol) — client-side is sufficient at current volume
- **W3**: Google Tag Manager migration — current direct `gtag` integration is simpler
- **W4**: A/B testing infrastructure (GA4 Experiments) — premature at current volume

---

## 3. Technical Approach

### Current Analytics Architecture

The app uses a dual-sink analytics system:

1. **Vercel Analytics** — automatic pageview tracking via `<Analytics />` in `layout.tsx`
2. **GA4** — custom events via `trackEvent()` in `src/lib/analytics/client.ts`

`trackEvent()` sends to both Vercel Analytics (`track()`) and GA4 (`gtag("event", ...)`) in a single call. GA4 is gated behind the `NEXT_PUBLIC_GA4_MEASUREMENT_ID` environment variable.

**Measurement ID**: `G-NVNDKEZBGX`

### Key Events Configuration (GA4 Admin)

This is a GA4 admin configuration task, not a code change. Steps:

1. Go to GA4 Admin → Events
2. For each target event, toggle "Mark as key event"
3. Events to mark:
   - `calculation_completed`
   - `copy_link_clicked`
   - `download_png_clicked`
   - `shared_round_viewed`
   - `round_saved`

### Funnel Exploration Report

Create in GA4 → Explore → Funnel exploration:

**Funnel: Core User Journey**
```
Step 1: form_started (user begins input)
     ↓
Step 2: calculation_completed (user sees results)
     ↓
Step 3: copy_link_clicked OR download_png_clicked (user shares)
     ↓
Step 4: round_saved (user saves for history)
```

**Funnel: Viral Loop**
```
Step 1: shared_round_viewed (recipient opens shared link)
     ↓
Step 2: form_started with utm_source=share (recipient starts own calc)
     ↓
Step 3: calculation_completed with utm_source=share (recipient completes)
```

### Event Parameter Enrichment

Some events currently fire with minimal payloads. Enrich the following:

**`calculation_completed`** — currently fires with `{ utm_source }`. Add:
```typescript
calculation_completed: {
  utm_source?: string;
  handicap_bracket: string;     // "10-15", "15-20", etc.
  has_course_rating: boolean;
  total_sg: number;             // for segmentation
  methodology_version: string;
};
```

This requires modifying the `trackEvent` call in `strokes-gained-client.tsx` where `calculation_completed` fires.

**`shared_round_viewed`** — currently fires with `{ referrer, utm_source }`. This is already sufficient.

**`copy_link_clicked`** — currently fires with `{ share_type, surface, utm_source, headline_pattern }`. Already sufficient.

### GA4 DebugView Verification

Steps to verify events fire correctly:

1. Install the GA4 DebugView Chrome extension
2. Open the staging site (`staging.golfdataviz.com`)
3. Complete a calculation, copy link, download PNG
4. Verify all events appear in GA4 DebugView with correct parameters
5. Open a shared link, verify `shared_round_viewed` fires
6. Save a round, verify `round_saved` fires

### New Events to Add (Code Changes)

The following new events support the v2 funnel but require code changes:

```typescript
// Add to events.ts
| "download_receipt_clicked"       // For round-receipt spec
| "shared_round_cta_clicked"       // For recipient-optimized-landing spec
| "recipient_started_own_calc"     // Derived: form_started where utm_source=share
| "recipient_completed_own_calc"   // Derived: calculation_completed where utm_source=share
| "probability_calculated"         // For score-probability spec
| "widget_cta_clicked"             // For embeddable-widget spec
| "referral_tier_unlocked"         // For referral-tiers spec
| "pwa_installed"                  // For pwa-install spec
```

These events are defined here for planning but will be implemented alongside their respective features. The GA4 key events config (M1-M5) can be done immediately with existing events.

---

## 4. Custom Reports to Create

### Report 1: Share Rate Dashboard

**Metrics**:
- Share rate = (copy_link_clicked + download_png_clicked) / calculation_completed
- Daily trend
- Breakdown by share type (link vs PNG)

**Dimensions**: Date, device category, utm_source

### Report 2: Funnel Conversion Rates

**Metrics**:
- Landing → Calculation: form_started → calculation_completed
- Calculation → Share: calculation_completed → any share event
- Share → Viral: shared_round_viewed events

**Dimensions**: Date, traffic source

### Report 3: Traffic Source Quality

**Metrics**:
- Calculations per session by traffic source
- Share rate by traffic source
- Bounce rate by traffic source

**Dimensions**: Source/medium, landing page

---

## 5. Success Metrics

This spec's success is measured by whether it enables measurement of other specs:

| Metric | Target | How to Verify |
|--------|--------|---------------|
| All 5 key events firing in GA4 | 100% accuracy | GA4 DebugView + Realtime report |
| Funnel report created and showing data | Report exists with >0 data | GA4 Explore |
| Share rate baseline established | Have a number (any number) | Custom report |
| Recipient conversion baseline established | Have a number | Funnel report |

---

## 6. Implementation Plan

### Tasks

1. **GA4 Admin configuration** (no code):
   - Mark 5 events as key events
   - Create funnel exploration report
   - Create custom share rate report
   - Verify in DebugView

2. **Code: Enrich `calculation_completed` event** (small code change):
   - Add `handicap_bracket`, `has_course_rating`, `total_sg`, `methodology_version` to the event payload
   - Modify the `trackEvent("calculation_completed", ...)` call in `strokes-gained-client.tsx`
   - Update `AnalyticsEventProps` type in `events.ts`

3. **Code: Add placeholder events for v2 features** (type definitions only):
   - Add new event types to `events.ts` for features in other specs
   - No firing logic yet — just type definitions so other spec implementations can reference them

4. **Documentation**:
   - Document the key events, funnel structure, and custom reports in a `docs/analytics-setup.md` file

### Dependencies

- GA4 admin access (Google Analytics account)
- Staging environment with `NEXT_PUBLIC_GA4_MEASUREMENT_ID` set
- GA4 DebugView Chrome extension for verification

---

## 7. Risks

### Risk 1: Event volume too low for meaningful funnel analysis

**Severity**: Medium
**Likelihood**: High (current volume is ~45 calculations/month)
**Mitigation**: The funnel reports will have small sample sizes initially. This is expected. The goal is to have the infrastructure in place so that as traffic grows (via SEO, sharing, and other v2 features), the data starts flowing immediately. Do not delay instrumentation waiting for volume.

### Risk 2: GA4 processing delay

**Severity**: Low
**Likelihood**: High (GA4 has 24-48 hour processing delay for exploration reports)
**Mitigation**: Use GA4 Realtime report for immediate verification. Use DebugView during development. Accept that exploration reports lag by 1-2 days.

---

## 8. Open Questions

1. **GA4 vs Vercel Analytics for funnel**: Vercel Analytics shows pageviews and web vitals but does not support custom funnels. GA4 is the correct tool for funnel analysis. Should we phase out Vercel Analytics? **Recommendation**: Keep both. Vercel Analytics is zero-config and shows web vitals. GA4 handles custom events and funnels. They serve different purposes.

2. **Enhanced measurement**: GA4's enhanced measurement auto-tracks outbound clicks, scroll depth, site search, and file downloads. Should we enable these? **Recommendation**: Yes — enable all enhanced measurement in GA4 settings. It is zero-effort and adds useful signals (especially scroll depth on learn/SEO pages).

3. **Data retention**: GA4 free tier retains event-level data for 14 months. Is this sufficient? **Recommendation**: Yes for current stage. If longer retention is needed, export to BigQuery (free for GA4 data).
