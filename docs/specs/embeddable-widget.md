# Embeddable Mini-SG Widget

**Status**: Spec
**Author**: Product
**Date**: 2026-03-17
**Phase**: 2 (Multi-Tool + Distribution)
**Priority**: 9

---

## 1. Problem Statement

GolfDataViz has zero inbound links from golf content sites. The sharing mechanism relies entirely on users voluntarily posting share cards. There is no passive distribution channel that generates backlinks and new user acquisition without per-instance effort.

Golf instruction blogs (Practical Golf, The DIY Golfer, MyGolfSpy, Me And My Golf) regularly publish content about performance statistics but link to generic USGA resources or Arccos marketing pages. An embeddable widget gives these sites a free, interactive tool to enhance their content while generating backlinks and user acquisition for GolfDataViz.

### Research Basis

- Mortgage calculator embed playbook: Bankrate and NerdWallet grew through widget distribution. Each embed = backlink + user acquisition.
- OmniCalculator embeds drive discovery across thousands of sites.
- v2 plan identifies embeds as one of four growth engines (secondary channel).
- Each widget embed is a permanent backlink that improves domain authority for SEO.

### User Stories

**As a golf blog editor**, I want to embed a strokes gained mini-calculator in my article about "understanding strokes gained" so my readers can try it without leaving my site.

**As a blog reader**, I want to quickly input my handicap and basic stats to see a SG preview so I can decide if the full tool is worth using.

**As GolfDataViz**, I want every embedded widget to funnel users to the full analysis so I acquire users through content distribution.

---

## 2. Requirements

### Must Have (MVP)

- [ ] **M1**: Embeddable via a single `<script>` tag that renders the widget in an iframe
- [ ] **M2**: Compact form: handicap index, fairways hit (of 14), greens in regulation (of 18), total putts — 4 fields
- [ ] **M3**: Quick result: simplified radar chart preview showing 4 SG categories as a small spider diagram
- [ ] **M4**: Prominent CTA: "Get Full Analysis at GolfDataViz.com" linking to `/strokes-gained` with pre-filled form data via `?d=` param
- [ ] **M5**: Widget dimensions: max 400px wide, responsive to container width, ~500px tall
- [ ] **M6**: Self-contained: no external CSS leakage in or out (iframe isolation)
- [ ] **M7**: Loads asynchronously — does not block host page rendering
- [ ] **M8**: Works on mobile-responsive host sites

### Should Have

- [ ] **S1**: Theming: configurable primary color via `data-` attribute on the script tag for brand matching
- [ ] **S2**: "Powered by Golf Data Viz" footer with link
- [ ] **S3**: Loading state while the iframe initializes
- [ ] **S4**: Dark mode support via `data-theme="dark"` attribute
- [ ] **S5**: Widget referral tracking — UTM params on all outbound links (`utm_source=widget&utm_medium=embed&utm_campaign={host-domain}`)

### Won't Have

- **W1**: Full SG analysis within the widget — the widget is a teaser, not the complete tool
- **W2**: Round saving or account features within the widget
- **W3**: Share card generation within the widget
- **W4**: Historical data or trending within the widget

---

## 3. Technical Approach

### Architecture

```
Host site:
  <script src="https://golfdataviz.com/embed/widget.js" data-color="#1a5632"></script>

widget.js:
  1. Creates an iframe pointing to /embed/strokes-gained
  2. Sets iframe dimensions based on container
  3. Handles postMessage resize events from iframe

/embed/strokes-gained (Next.js page):
  1. Minimal page with form + mini radar chart
  2. No header, footer, or navigation
  3. Runs SG calculation client-side
  4. All outbound links open in _parent (escape iframe)
  5. Sends postMessage to parent for resize events
```

### Route Structure

```
src/app/
  embed/
    strokes-gained/
      page.tsx          → /embed/strokes-gained (the iframe page)
    widget.js/
      route.ts          → /embed/widget.js (serves the embed script)
```

### Embed Script (`/embed/widget.js`)

A small (~2KB) vanilla JS file that:
1. Finds the `<script>` tag by `src` attribute
2. Creates an iframe element adjacent to the script tag
3. Sets `src` to `https://golfdataviz.com/embed/strokes-gained?color={color}&host={location.hostname}`
4. Listens for `postMessage` events from the iframe to auto-resize height
5. Applies responsive width (100% of container, max 400px)

```javascript
(function() {
  const script = document.currentScript;
  const color = script.getAttribute('data-color') || '#1a5632';
  const theme = script.getAttribute('data-theme') || 'light';
  const iframe = document.createElement('iframe');
  iframe.src = `https://golfdataviz.com/embed/strokes-gained?color=${encodeURIComponent(color)}&theme=${theme}&host=${location.hostname}`;
  iframe.style.width = '100%';
  iframe.style.maxWidth = '400px';
  iframe.style.border = 'none';
  iframe.style.borderRadius = '12px';
  iframe.style.overflow = 'hidden';
  iframe.loading = 'lazy';
  script.parentNode.insertBefore(iframe, script.nextSibling);
  window.addEventListener('message', function(e) {
    if (e.source === iframe.contentWindow && e.data.type === 'gdv-resize') {
      iframe.style.height = e.data.height + 'px';
    }
  });
})();
```

### Iframe Page (`/embed/strokes-gained`)

A minimal Next.js page with:
- **No site header/footer** — uses a separate layout or `layout.tsx` in the embed directory
- **Compact form**: 4 fields in a 2x2 grid (handicap + FIR on row 1, GIR + putts on row 2)
- **Mini radar chart**: Smaller version of the existing `RadarChart` component (200px height)
- **Simplified SG calculation**: Uses `calculateStrokesGainedV3` with default values for missing inputs (penalty strokes = 0, scoring distribution = estimated from score)
- **CTA button**: Opens `/strokes-gained?d={encoded}&utm_source=widget&utm_medium=embed&utm_campaign={host}` in `_parent` frame

### Simplified Calculation

The widget only collects 4 inputs (handicap, FIR, GIR, putts). The full SG calculation requires more fields. The widget approach:

1. Set `score` = benchmark average score for the handicap bracket (from `handicap-brackets.json`)
2. Set `penaltyStrokes` = 0
3. Set `fairwayAttempts` = 14
4. Estimate scoring distribution from the bracket benchmarks
5. Run `calculateStrokesGainedV3` with these defaults
6. Display result with a caveat: "Simplified estimate — get your full analysis with all your round stats"

This produces a directionally correct preview without requiring the user to fill out the complete form.

### CORS and Security

- The iframe page sets `X-Frame-Options: ALLOWALL` (or uses CSP `frame-ancestors *`)
- The embed script is served with CORS headers (`Access-Control-Allow-Origin: *`)
- The iframe page does not access cookies or authentication
- No user data is sent to or stored by the widget — all calculation is client-side

---

## 4. UI/UX Spec

### Widget Layout (400x~500px)

```
┌──────────────────────────────┐
│  ⛳ Strokes Gained Preview   │
│                              │
│  Handicap [14  ]  FIR [8/14]│
│  GIR      [8/18]  Putts [32]│
│                              │
│  [  See My Strokes Gained  ] │
│                              │
│  ┌────────────────────────┐  │
│  │   Mini radar chart     │  │
│  │   (200px height)       │  │
│  └────────────────────────┘  │
│                              │
│  OTT: +0.42  App: -1.15     │
│  ATG: +0.28  Putt: +0.85    │
│                              │
│  Simplified estimate         │
│  [Get Full Analysis →]       │
│                              │
│  Powered by Golf Data Viz    │
└──────────────────────────────┘
```

### Styling

- Matches the GolfDataViz design system (rounded corners, cream backgrounds, brand green accents)
- Configurable primary color via query param (for host site brand matching)
- Font: system font stack (avoids loading custom fonts in the embed for performance)
- Responsive: scales down gracefully to 300px width

---

## 5. Success Metrics

| Metric | Baseline | Target (90 days) | How to Measure |
|--------|----------|-------------------|----------------|
| Widget embeds on external sites | 0 | 3-5 | Manual tracking + referrer logs |
| Monthly visits from embedded widgets | 0 | 50+ | GA4 utm_source=widget |
| Widget → full analysis conversion | N/A | >15% of widget interactions | GA4 funnel |
| Backlinks from widget hosts | 0 | 3-5 | Google Search Console |

### Analytics

The widget page fires analytics events with `utm_source=widget` to distinguish widget-originated traffic from direct visits.

Events within the widget iframe:
```typescript
| "widget_loaded"           // Widget iframe initialized
| "widget_calculated"       // User submitted the mini form
| "widget_cta_clicked"      // User clicked "Get Full Analysis"
```

These fire via a lightweight analytics snippet in the iframe page (not the full GA4 setup — minimal payload).

---

## 6. Kill Criteria

| Signal | Kill If |
|--------|---------|
| Widget adoption | Zero embeds after outreach to 10 blogs |
| Widget traffic | <50 visits/month from embedded sources after 3 months |

---

## 7. Implementation Plan

### Implementation Steps

1. Create the embed directory structure and layout (no site chrome)
2. Build the compact 4-field form
3. Implement simplified SG calculation with defaults for missing inputs
4. Integrate mini radar chart (reuse existing `RadarChart` with smaller dimensions)
5. Build the CTA with proper UTM params and `target="_parent"`
6. Create the embed script (`widget.js` route) with iframe injection and resize messaging
7. Set up CORS headers and frame policy
8. Test on a local HTML page simulating a blog embed
9. Create an `/embed` documentation page explaining how to embed the widget (for outreach)
10. Outreach to target blogs: Practical Golf, The DIY Golfer, MyGolfSpy, Me And My Golf, Golf Sidekick

### Outreach Template

Prepare a brief pitch email:
- "Free interactive strokes gained calculator for your readers"
- One-line embed code
- Preview screenshot
- "No cost, no account required, enhances your content"

---

## 8. Open Questions

1. **Simplified vs full calculation**: Should the widget show all 4 SG categories or just a total SG number with "see full breakdown" CTA? **Recommendation**: Show all 4 categories — the radar chart is the visual hook that makes users want the full analysis.

2. **Widget versioning**: If the calculation methodology changes, embedded widgets on external sites will update automatically (they load from our server). Is this a problem? **Recommendation**: No — auto-updating is a feature. If a breaking change is needed, version the embed URL (`/embed/v1/strokes-gained`).

3. **Rate limiting**: Should the widget iframe page be rate-limited? **Recommendation**: No rate limiting on the widget page itself (it is public content). The widget does not call any API — all calculation is client-side. If abuse occurs, add Cloudflare-level protection.
