# 9:16 Story Card Export

**Status**: Spec
**Author**: Product
**Date**: 2026-03-17
**Phase**: 1 (Data-First Share Quality)
**Priority**: 6

---

## 1. Problem Statement

The existing share card is 600x600 pixels (1:1 square). Instagram Stories, TikTok, Snapchat, and WhatsApp Status are all 9:16 vertical (1080x1920). When a user downloads the current card and posts it to Stories, it appears small and centered with large blank bars above and below — reducing visual impact and readability at thumbnail size.

The receipt format (separate spec) solves this for one format, but users who prefer the spider chart radar visualization also need a vertical option.

### Research Basis

- Instagram Stories: 500M+ daily active users. 9:16 is the dominant mobile share format.
- v2 plan: "9:16 Story Card Export — Vertical format for Instagram Stories alongside the existing 600px card."
- The spider chart is the product's visual signature. A vertical story card preserves this identity while fitting the dominant share format.
- Golf influencer content on Instagram is Stories-heavy — this is where golf discussion happens on Instagram.

### User Stories

**As a golfer who posts rounds on Instagram Stories**, I want a vertical share card that fills the entire Stories frame so my results look polished and professional.

**As a golfer sharing in a WhatsApp group**, I want a tall card that displays well in the vertical chat view so it is easy to read without tapping to expand.

**As a golfer who prefers the radar chart over the receipt format**, I want a vertical version of the radar chart card so I can share on Stories without cropping.

---

## 2. Requirements

### Must Have (MVP)

- [ ] **M1**: Generate a 1080x1920 (9:16) vertical PNG share card
- [ ] **M2**: Card includes: course name, score, SG total, radar chart, category breakdown, attribution
- [ ] **M3**: Layout optimized for vertical reading — elements stacked, not side-by-side
- [ ] **M4**: Text readable at Stories thumbnail size (minimum 32px effective font size for key numbers)
- [ ] **M5**: "Download Story Card" button on results page alongside existing download options
- [ ] **M6**: Bold, high-contrast colors that pop on Instagram's dark viewing background

### Should Have

- [ ] **S1**: Score hero section at the top (largest element — the first thing visible at thumbnail)
- [ ] **S2**: Radar chart at larger size than the 600px card (at least 400px diameter)
- [ ] **S3**: Peer percentile rankings in each category row (depends on peer-percentile-rankings spec)
- [ ] **S4**: Familiar stats row (FIR, GIR, Putts) below the category breakdown
- [ ] **S5**: Share headline text (sentiment-colored, same as current card)
- [ ] **S6**: Brand watermark at the bottom (contour mark + golfdataviz.com)

### Won't Have

- **W1**: Video or animated Stories export — PNG only
- **W2**: Instagram API direct posting — user downloads PNG and posts manually
- **W3**: Different layouts for different SG results (one layout fits all)
- **W4**: User-customizable layout or element positioning

---

## 3. Technical Approach

### Rendering

Use the same client-side capture approach as the existing 600px share card:
1. Render a hidden `StoryCard` component at 1080x1920
2. Use `html-to-image` (via the existing `captureElementAsPng` utility in `src/lib/capture.ts`) to convert to PNG
3. Trigger download

No new API route needed — this follows the exact same pattern as the existing card.

### Component

**File**: `src/app/(tools)/strokes-gained/_components/story-card.tsx`

A `forwardRef` component (same pattern as `ShareCard`) at fixed 1080x1920 dimensions, rendered off-screen for capture.

### Layout (1080x1920)

The vertical format redistributes the same data as the 600x600 card into a taller, more spacious layout:

```
┌──────────────────────────────────────┐  0px
│                                      │
│  DARK GREEN HEADER BAND              │
│                                      │
│          Torrey Pines South          │  ← course name (DM Serif, centered)
│          March 17, 2026              │
│                                      │
│             ┌─────┐                  │
│             │ 87  │                  │  ← score hero (72px+ font, centered)
│             └─────┘                  │
│              SCORE                   │
│                                      │
│         ┌──────────────┐             │
│         │  +0.40 SG    │             │  ← SG total badge (large, colored)
│         └──────────────┘             │
│     vs 10-15 HCP peers              │
│                                      │
│  14.2 index · Course-Adjusted        │
│                                      │
│  ─── Gold headline text ───          │  ← share headline
│                                      │
├──────────────────────────────────────┤  ~480px
│                                      │
│  WHITE BODY                          │
│                                      │
│       ┌────────────────────┐         │
│       │                    │         │
│       │   RADAR CHART      │         │  ← radar chart (500px height)
│       │   (large)          │         │
│       │                    │         │
│       └────────────────────┘         │
│                                      │
│  + = better · − = room to grow      │
│                                      │
│  ┌────────────────────────────┐      │  ~1100px
│  │ Off the Tee    +0.42  78% │      │  ← category rows (larger text)
│  │ Approach       -1.15  22% │      │
│  │ Around Green   +0.28  62% │      │
│  │ Putting        +0.85  88% │      │
│  └────────────────────────────┘      │
│                                      │
│  7/14 FIR · 8/18 GIR · 32 Putts    │  ← familiar stats
│  0E · 1B · 6P · 7Bo · 3D · 1T+     │  ← scoring breakdown
│                                      │
│                                      │
│  ─── Attribution + watermark ───     │  ~1800px
│                                      │
│  ⛳ Golf Data Viz                    │
│  golfdataviz.com/strokes-gained      │
│  Scorecard SG · v1.1.0              │
│                                      │
└──────────────────────────────────────┘  1920px
```

### Key Design Decisions

**Font sizes** (larger than 600px card for readability):
- Course name: 36px (DM Serif Display)
- Score: 72px (DM Sans Bold)
- SG Total: 48px (mono, bold)
- Category labels: 24px
- Category values: 28px (mono, bold)
- Familiar stats: 20px
- Attribution: 16px

**Colors**:
- Header band: `brand-900` (#0a2f1a) — same dark green as existing card
- Score text: white
- SG badge: `data-positive` green or `data-negative` red based on sign
- Body: white background
- Category rows: alternating white / `cream-50`
- Category value colors: `data-positive` / `data-negative` per sign

**Radar chart sizing**: The chart gets 500px height in the story card (vs 300px in the 600px card). This makes the spider diagram the dominant visual element — it should be immediately recognizable at thumbnail size.

### Capture and Download

Reuse the existing capture infrastructure:

```typescript
const storyCardRef = useRef<HTMLDivElement>(null);

async function handleDownloadStory() {
  if (!storyCardRef.current) return;
  const blob = await captureElementAsPng(storyCardRef.current, {
    pixelRatio: 1, // already at target resolution
    quality: 0.95,
  });
  downloadBlob(blob, `golf-story-${courseName}-${date}.png`);
  trackEvent("download_story_clicked", { ... });
}
```

---

## 4. UI/UX Spec

### Results Page Button Placement

The story card download button joins the existing share actions:

Current (after receipt spec):
```
[Download PNG]  [Download Receipt]  [Copy Link]
```

New:
```
[Download PNG]  [Download Story]  [Download Receipt]  [Copy Link]
```

On mobile (stacked):
```
[Download PNG]
[Download Story]
[Download Receipt]
[Copy Link]
```

- "Download Story" button: same styling as other download buttons, with a `Smartphone` icon from lucide-react
- Tooltip: "9:16 vertical format for Instagram Stories"

### Button Ordering Rationale

"Download PNG" remains first (the original, most familiar format). "Download Story" is second (vertical radar chart — related to PNG). "Download Receipt" is third (alternate format). "Copy Link" remains last (different action type — link vs image).

---

## 5. Success Metrics

| Metric | Baseline | Target (4 weeks) | How to Measure |
|--------|----------|-------------------|----------------|
| Story card download rate | N/A | >3% of calculations | `download_story_clicked` / `calculation_completed` |
| Story downloads vs PNG downloads | N/A | >20% of PNG downloads | `download_story_clicked` / `download_png_clicked` |
| Total share card downloads (all formats) | ~2% | >6% | Sum of all download events / `calculation_completed` |

### Analytics Events to Add

```typescript
| "download_story_clicked"  // User downloaded the 9:16 story card
```

Payload:
```typescript
download_story_clicked: { has_share_param: boolean; utm_source?: string; headline_pattern?: string | null };
```

---

## 6. Kill Criteria

| Signal | Kill If |
|--------|---------|
| Story format not used | <2% download rate after 200 calculations |
| Users only use existing PNG format | Story downloads < 10% of PNG downloads after 4 weeks |

---

## 7. Implementation Plan

### File Changes

**New files**:
1. `src/app/(tools)/strokes-gained/_components/story-card.tsx` — 1080x1920 story card component

**Modified files**:
2. `src/app/(tools)/strokes-gained/_components/strokes-gained-client.tsx` — add story card ref, download handler, button
3. `src/lib/analytics/events.ts` — add `download_story_clicked` event

### Implementation Steps

1. Build the `StoryCard` component at 1080x1920 with the vertical layout
2. Integrate the existing `RadarChart` component at larger dimensions (500px)
3. Apply typography scaling for large-format readability
4. Add the hidden story card to the results page (same off-screen pattern as `ShareCard`)
5. Add the download handler using existing `captureElementAsPng`
6. Add the "Download Story" button to the share actions row
7. Add analytics event
8. Visual verification: download the PNG, verify it looks correct at 1080x1920
9. Test readability at Instagram Stories thumbnail size (~100px wide in the Stories tray)
10. Test on mobile Safari (most common Stories posting flow)

### Dependencies

- `RadarChart` component — already exists, just needs to render at larger dimensions
- `captureElementAsPng` from `src/lib/capture.ts` — already exists
- `downloadBlob` from `src/lib/capture.ts` — already exists
- Peer percentile rankings (optional S3) — can ship story card without percentiles and add later

---

## 8. Open Questions

1. **Radar chart at large size**: The existing `RadarChart` is designed for ~300px height. At 500px, does it scale correctly or need layout adjustments? **Recommendation**: Test the Nivo radar chart at 500px — Nivo charts are responsive by default and should scale. If axis labels or grid lines need adjustment, pass custom theme props.

2. **Device pixel ratio**: Should we render at 1x (1080x1920 actual pixels) or 2x (2160x3840 for retina)? **Recommendation**: 1x. Instagram Stories are displayed at 1080x1920. Higher resolution increases file size without visible benefit (Stories are compressed by Instagram anyway).

3. **Background color**: Should the story card have a solid white body or a subtle gradient? **Recommendation**: Solid white for MVP. Gradients can be added as a theme option via the referral tiers system (Tier 2: custom themes).
