# Round Receipt Share Format

**Status**: Spec
**Author**: Product
**Date**: 2026-03-17
**Phase**: 1 (Data-First Share Quality)
**Priority**: 4

---

## 1. Problem Statement

The existing share card (600x600 spider chart PNG) works well for visual platforms but has limitations:

1. **Format fatigue**: Every analytics tool outputs charts. A chart screenshot in a group chat looks like "data" — it doesn't look fun or novel.
2. **Stories format mismatch**: The 600x600 card is square. Instagram Stories and TikTok are 9:16 (1080x1920). Users must crop or frame the card to share in stories.
3. **Missed viral format**: Receiptify (Spotify data as grocery receipts) hit 1M+ uses with zero marketing. Ariana Grande shared it. The receipt metaphor is universally readable, perfectly sized for vertical sharing, and completely novel in golf.

### Research Basis

- Receiptify solo developer built a web app turning Spotify data into receipt-styled PNGs. Over 1M uses in first months, celebrity shares, zero marketing budget.
- Receipt format works because: universally recognizable, scannable top-to-bottom, feels tangible/real, naturally vertical (Stories-native), monospace font carries "data printout" credibility.
- No golf tool produces receipt-style output — first-mover advantage.

### User Stories

**As a golfer who shares rounds on Instagram Stories**, I want a vertical receipt-style card so I can post it without cropping or adding a background.

**As a golfer in a group chat**, I want a fun, novel format that looks different from every other golf app screenshot so my friends actually look at it.

**As a golfer comparing rounds**, I want a clean line-item breakdown that's instantly scannable without needing to understand radar charts.

---

## 2. Requirements

### Must Have (MVP)

- [ ] **M1**: Generate a receipt-styled PNG at 1080x1920 (9:16 aspect ratio, Stories-native)
- [ ] **M2**: Receipt layout: course name header, date, SG categories as line items with +/- values, subtotal (SG Total), QR code linking to the full analysis
- [ ] **M3**: Monospace font for all data lines (receipt aesthetic)
- [ ] **M4**: Render server-side via the same `html-to-image` / Satori pipeline used by existing share cards
- [ ] **M5**: "Download Receipt" button on results page alongside existing "Download PNG" button
- [ ] **M6**: Receipt includes handicap index, bracket label, and score
- [ ] **M7**: QR code encodes the shareable round URL (`/strokes-gained?d={encoded}`)

### Should Have

- [ ] **S1**: Dashed-line separators between sections (mimicking thermal receipt paper)
- [ ] **S2**: "Thank you for playing" footer text with golfdataviz.com attribution
- [ ] **S3**: Scoring breakdown line items (birdies, pars, bogeys, doubles, triples) below SG section
- [ ] **S4**: Familiar stats line (FIR%, GIR, Putts) as a secondary section
- [ ] **S5**: Receipt "paper" texture — off-white background with slight noise, slight paper curl shadow at bottom
- [ ] **S6**: Percentile rankings next to each SG line item (depends on peer-percentile-rankings spec)

### Could Have

- [ ] **C1**: Animated receipt "printing" effect on the preview (CSS animation, not in the exported PNG)
- [ ] **C2**: Dark-mode receipt variant (inverted colors — black background, white text)
- [ ] **C3**: Customizable course logo area at the top (future, requires logo database)

### Won't Have

- **W1**: Replace the existing spider chart card — this is an additional format, not a replacement
- **W2**: Print-to-physical-receipt support — PNG export only
- **W3**: Receipt for saved round detail pages (MVP targets fresh calculation results only)

---

## 3. Technical Approach

### Rendering Pipeline

The receipt card uses the same server-side rendering approach as the OG image cards: **Satori** (from `next/og`) for JSX-to-SVG conversion, then PNG export.

**New API route**: `src/app/api/receipt/route.tsx`

This is an Edge route that:
1. Accepts the encoded round data (`?d={encoded}`) via query parameter
2. Decodes and recalculates SG server-side (same pattern as `/strokes-gained/og`)
3. Renders the receipt layout via Satori's `ImageResponse`
4. Returns a 1080x1920 PNG

### Font

**Monospace font**: Use `JetBrains Mono` or `IBM Plex Mono` — both are open-source and available as web fonts. Load the font file in the Edge route (same pattern as existing OG routes loading DM Sans/DM Serif Display).

**Header font**: Use `DM Serif Display` for the course name (matches brand).

### QR Code

Generate the QR code server-side using a lightweight library. Options:
- `qrcode` npm package (server-side SVG generation)
- Inline SVG QR generation (no dependency — QR encoding is ~200 lines)

**Recommendation**: Use the `qrcode` package for reliability. The QR encodes the full shareable URL: `https://golfdataviz.com/strokes-gained?d={encodedRound}`.

QR code size: 120x120px in the receipt layout. Positioned at bottom center, above the footer text.

### Receipt Layout (1080x1920)

```
┌──────────────────────────────────────┐
│                                      │
│          ══════════════════           │  ← decorative top border
│          GOLF DATA VIZ               │  ← brand name, monospace
│          ══════════════════           │
│                                      │
│  Torrey Pines South                  │  ← course name (DM Serif)
│  March 17, 2026                      │  ← date
│  14.2 Index · 10-15 HCP Bracket     │  ← handicap context
│                                      │
│  ──────────────────────────────────  │  ← dashed separator
│                                      │
│  SCORE                          87   │  ← score hero
│                                      │
│  ──────────────────────────────────  │
│                                      │
│  STROKES GAINED vs PEERS             │  ← section header
│                                      │
│  Off the Tee          +0.42   78%    │  ← category line items
│  Approach             -1.15   22%    │
│  Around the Green     +0.28   62%    │
│  Putting              +0.85   88%    │
│                       ──────         │
│  TOTAL                +0.40          │  ← total
│                                      │
│  ──────────────────────────────────  │
│                                      │
│  7/14 FIR · 8/18 GIR · 32 Putts    │  ← familiar stats
│  0E · 1B · 6P · 7Bo · 3D · 1T+     │  ← scoring distribution
│                                      │
│  ──────────────────────────────────  │
│                                      │
│           ┌──────────┐               │
│           │  QR CODE │               │  ← QR to full analysis
│           └──────────┘               │
│    Scan for full analysis            │
│                                      │
│  ──────────────────────────────────  │
│                                      │
│       THANK YOU FOR PLAYING          │
│       golfdataviz.com                │
│       Scorecard SG · v1.1.0         │
│                                      │
│          ══════════════════           │  ← decorative bottom border
│                                      │
└──────────────────────────────────────┘
```

### Client Integration

**Download button**: Add a "Download Receipt" button next to the existing "Download PNG" button on the results page. The button:
1. Fetches `/api/receipt?d={encodedRound}`
2. Converts the response to a blob
3. Triggers a download as `golf-receipt-{courseName}-{date}.png`

Alternatively, render the receipt client-side using `html-to-image` for the same capture-and-download pattern as the existing share card. This avoids a network round-trip but requires loading the monospace font client-side.

**Recommendation**: Client-side rendering via a hidden `ReceiptCard` component (same pattern as `ShareCard`) captured with `html-to-image`. This is consistent with the existing architecture and avoids a new API route for the MVP.

---

## 4. UI/UX Spec

### Results Page Button Placement

Current:
```
[Download PNG]  [Copy Link]
```

New:
```
[Download PNG]  [Download Receipt]  [Copy Link]
```

- "Download Receipt" button: same styling as "Download PNG" but with a receipt icon (use `Receipt` from lucide-react)
- On mobile: buttons stack vertically, full width

### Receipt Preview

No on-page preview of the receipt in MVP. The receipt is generated and downloaded on button click. A future iteration could show a receipt preview modal.

---

## 5. Success Metrics

| Metric | Baseline | Target (4 weeks) | How to Measure |
|--------|----------|-------------------|----------------|
| Receipt download rate | N/A | >5% of calculations | `download_receipt_clicked` / `calculation_completed` |
| Receipt downloads vs PNG downloads | N/A | >30% of PNG downloads | `download_receipt_clicked` / `download_png_clicked` |
| Instagram Stories shares (qualitative) | 0 | Any receipt sightings | Manual monitoring, social search |

### Analytics Events to Add

```typescript
| "download_receipt_clicked"  // User clicked Download Receipt
```

Payload:
```typescript
download_receipt_clicked: { has_share_param: boolean; utm_source?: string };
```

---

## 6. Kill Criteria

| Signal | Kill If |
|--------|---------|
| Receipt format is not used | <3% download rate after 200 calculations |
| Users prefer existing PNG exclusively | Receipt downloads < 10% of PNG downloads after 4 weeks |

---

## 7. Implementation Plan

### File Changes

**New files**:
1. `src/app/(tools)/strokes-gained/_components/receipt-card.tsx` — receipt layout component (hidden, for capture)
2. `src/assets/fonts/JetBrainsMono-Regular.ttf` — monospace font file

**Modified files**:
3. `src/app/(tools)/strokes-gained/_components/strokes-gained-client.tsx` — add receipt download button and capture logic
4. `src/lib/analytics/events.ts` — add `download_receipt_clicked` event

### Implementation Steps

1. Design the receipt layout component at 1080x1920 with monospace font
2. Add QR code generation (inline SVG or `qrcode` package)
3. Integrate receipt capture into the results page download flow
4. Add analytics event for receipt downloads
5. Visual verification: export receipt PNG, verify readability at thumbnail size (Instagram Stories preview is ~100px wide)
6. Test on iOS Safari (primary Stories sharing flow: download PNG, open Instagram, add to story)

---

## 8. Open Questions

1. **Font licensing**: JetBrains Mono is Apache 2.0 licensed — free for commercial use. IBM Plex Mono is SIL OFL — also free. Either works. **Recommendation**: JetBrains Mono — more recognizable "code" aesthetic.

2. **QR code content**: Should the QR encode the shareable URL with `?d=` encoded round data (full analysis without server lookup) or a short URL via a redirect? **Recommendation**: Encode the `?d=` URL directly — no server dependency, works offline, consistent with existing share link behavior.

3. **Receipt dimensions**: 1080x1920 is optimal for Instagram Stories. Should we also generate a 1080x1350 variant for Instagram feed posts (4:5)? **Recommendation**: Ship 1080x1920 only. Instagram auto-crops Stories cards in feed. Revisit if users request feed-specific format.
