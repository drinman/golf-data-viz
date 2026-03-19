# PWA Install Capabilities

**Status**: Spec
**Author**: Product
**Date**: 2026-03-17
**Phase**: 2 (Multi-Tool + Distribution)
**Priority**: 7

---

## 1. Problem Statement

GolfDataViz is a web app that golfers use after every round (20-30 times per year). Between rounds, there is no presence on the user's device — no home screen icon, no offline access, no re-engagement mechanism. Users must remember the URL or find it in browser history.

A PWA install converts "I'll check that site after my round" into a permanent home screen icon that creates habitual use.

### Research Basis

- Rakuten 24: 450% retention increase after PWA install.
- Flipkart: home screen users = 60% of visits.
- PWA install is low implementation effort with outsized retention impact for weekly-use tools.
- v2 plan explicitly recommends PWA capabilities as a Phase 2 addition.
- The app is already responsive and works well on mobile — PWA is an incremental enhancement, not a rewrite.

### User Stories

**As a golfer who uses the tool after every round**, I want an icon on my home screen so I can open it instantly without typing a URL.

**As a golfer at the course with spotty cell signal**, I want the benchmark data to be available offline so I can input my stats even if the connection is weak.

**As GolfDataViz**, I want to be able to send push notifications in the future so I can re-engage users with weekly digests or new tool announcements.

---

## 2. Requirements

### Must Have (MVP)

- [ ] **M1**: `manifest.json` with app name, icons, theme color, display mode
- [ ] **M2**: Service worker that caches static assets and benchmark data for offline use
- [ ] **M3**: App icons at required sizes (192x192, 512x512, maskable variants)
- [ ] **M4**: `display: "standalone"` for native app-like experience when installed
- [ ] **M5**: Theme color and background color matching brand (`#1a5632` green, `#faf8f5` cream)
- [ ] **M6**: Install prompt shown after 2+ completed calculations (not on first visit)
- [ ] **M7**: Install prompt is dismissible and does not re-appear for 30 days after dismissal

### Should Have

- [ ] **S1**: Offline fallback page: "You're offline — benchmark data is cached, but you'll need a connection for full results"
- [ ] **S2**: Cache the benchmark JSON (`handicap-brackets.json`) for offline SG calculation
- [ ] **S3**: Service worker pre-caches the main tool page (`/strokes-gained`) and its critical JS bundles
- [ ] **S4**: Push notification permission request (deferred — request only when a notification-worthy feature ships, e.g., weekly digest)
- [ ] **S5**: "Install App" button in the site header/menu for users who haven't seen the prompt

### Won't Have

- **W1**: Full offline SG calculation (requires too much client-side logic caching)
- **W2**: Background sync for saving rounds while offline
- **W3**: Push notifications in MVP (infrastructure only — no notification-sending feature yet)
- **W4**: Native app wrapper (Capacitor, TWA) — pure PWA only

---

## 3. Technical Approach

### Web App Manifest

**File**: `public/manifest.json`

```json
{
  "name": "Golf Data Viz",
  "short_name": "GolfDataViz",
  "description": "Free strokes gained calculator — compare your golf game to handicap peers",
  "start_url": "/strokes-gained?utm_source=pwa",
  "display": "standalone",
  "background_color": "#faf8f5",
  "theme_color": "#1a5632",
  "icons": [
    {
      "src": "/icons/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-maskable-192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "maskable"
    },
    {
      "src": "/icons/icon-maskable-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "maskable"
    }
  ],
  "screenshots": [
    {
      "src": "/screenshots/pwa-wide.png",
      "sizes": "1280x720",
      "type": "image/png",
      "form_factor": "wide"
    },
    {
      "src": "/screenshots/pwa-narrow.png",
      "sizes": "750x1334",
      "type": "image/png",
      "form_factor": "narrow"
    }
  ]
}
```

### Manifest Link

Add to `src/app/layout.tsx`:
```html
<link rel="manifest" href="/manifest.json" />
<meta name="theme-color" content="#1a5632" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="default" />
<link rel="apple-touch-icon" href="/icons/icon-192.png" />
```

### Service Worker

**File**: `public/sw.js`

Use a minimal, hand-written service worker (not Workbox — too heavy for the caching requirements).

**Caching strategy**:
- **App shell** (cache-first): Main page HTML, critical CSS/JS bundles
- **Benchmark data** (cache-first with background update): `handicap-brackets.json`
- **API routes** (network-only): `/api/*` routes are never cached
- **Images/fonts** (cache-first): Static assets
- **Navigation** (network-first with offline fallback): If network fails, serve cached page or offline fallback

```javascript
const CACHE_NAME = 'gdv-v1';
const PRECACHE_URLS = [
  '/',
  '/strokes-gained',
  '/offline',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE_URLS))
  );
});

self.addEventListener('fetch', (event) => {
  // Network-first for navigation, cache-first for assets
  // Skip API routes entirely
});
```

### Service Worker Registration

Register in `src/app/layout.tsx` or a dedicated client component:

```typescript
useEffect(() => {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js');
  }
}, []);
```

### Install Prompt

**Hook**: `src/hooks/use-pwa-install.ts`

```typescript
export function usePwaInstall() {
  const [canInstall, setCanInstall] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  // Listen for beforeinstallprompt
  // Check calculation count (localStorage) >= 2
  // Check dismissal timestamp (localStorage) for 30-day cooldown
  // Expose: canInstall, promptInstall(), dismiss()
}
```

**Prompt component**: `src/components/pwa-install-prompt.tsx`

A dismissible banner that appears at the bottom of the results page:

```
┌──────────────────────────────────────────────────────┐
│  Add Golf Data Viz to your home screen for           │
│  instant access after every round.                   │
│                                                      │
│  [Add to Home Screen]              [Maybe Later]     │
└──────────────────────────────────────────────────────┘
```

- Styled as a sticky bottom banner (`fixed bottom-0`)
- Appears only after 2+ `calculation_completed` events (tracked in localStorage)
- "Maybe Later" sets a 30-day cooldown in localStorage
- "Add to Home Screen" triggers the browser's native install flow

### iOS Considerations

iOS Safari does not support the `beforeinstallprompt` event. For iOS users, show a manual instruction card:

```
Add to Home Screen:
1. Tap the Share button (□↑)
2. Scroll down and tap "Add to Home Screen"
```

Detect iOS via user agent and show this instruction instead of the programmatic prompt.

---

## 4. App Icons

Generate icons from the existing contour mark logo. Required sizes:
- `icon-192.png` (192x192)
- `icon-512.png` (512x512)
- `icon-maskable-192.png` (192x192, with safe area padding for maskable icon)
- `icon-maskable-512.png` (512x512, with safe area padding)
- `apple-touch-icon.png` (180x180)

Place all in `public/icons/`.

---

## 5. Success Metrics

| Metric | Baseline | Target (60 days) | How to Measure |
|--------|----------|-------------------|----------------|
| PWA install rate | N/A | >5% of users with 2+ calculations | `pwa_installed` event |
| Returning PWA users | 0 | >30% of installed users return within 14 days | GA4 returning users with utm_source=pwa |
| Install prompt shown | N/A | Track impressions | `pwa_prompt_shown` event |
| Install prompt dismissals | N/A | <70% dismissal rate | `pwa_prompt_dismissed` event |

### Analytics Events to Add

```typescript
| "pwa_prompt_shown"      // Install prompt displayed to user
| "pwa_prompt_dismissed"  // User clicked "Maybe Later"
| "pwa_installed"         // User completed install flow
```

---

## 6. Kill Criteria

| Signal | Kill If |
|--------|---------|
| Install rate | <2% of eligible users (those with 2+ calculations) after 60 days |
| Retention impact | No measurable difference in return rate between PWA and non-PWA users |

---

## 7. Implementation Plan

### File Changes

**New files**:
1. `public/manifest.json` — web app manifest
2. `public/sw.js` — service worker
3. `public/icons/` — app icons (4-5 files)
4. `public/screenshots/` — PWA install screenshots (2 files)
5. `src/hooks/use-pwa-install.ts` — install prompt logic
6. `src/components/pwa-install-prompt.tsx` — install banner component
7. `src/app/offline/page.tsx` — offline fallback page

**Modified files**:
8. `src/app/layout.tsx` — add manifest link, theme-color meta, SW registration
9. `src/lib/analytics/events.ts` — add PWA events

### Implementation Steps

1. Create app icons from existing logo
2. Write `manifest.json` with all required fields
3. Write the service worker with appropriate caching strategies
4. Add manifest link and meta tags to layout
5. Register service worker in layout
6. Build the install prompt hook and component
7. Create the offline fallback page
8. Test install flow on Android Chrome and iOS Safari
9. Verify Lighthouse PWA audit passes
10. Add analytics events

### Testing

- **Lighthouse PWA audit**: Must pass all criteria (installable, service worker, manifest, icons)
- **Android Chrome**: Verify native install prompt appears after 2 calculations
- **iOS Safari**: Verify manual instructions appear instead of native prompt
- **Offline**: Disconnect network, verify cached pages load and offline fallback appears for uncached routes
- **Cache invalidation**: Deploy a new version, verify service worker updates and old cache is cleared

---

## 8. Open Questions

1. **Next.js and service workers**: Next.js does not have built-in service worker support. Should we use `next-pwa` package or hand-write the SW? **Recommendation**: Hand-write. `next-pwa` is heavy and often outdated. The caching requirements are simple enough for a manual SW (~50 lines).

2. **Cache size budget**: How much should we cache? **Recommendation**: Target <5MB total cache. Benchmark JSON is ~3KB. Main page JS bundle is ~200KB. Total precache should be well under 1MB.

3. **Push notification infrastructure**: Should we set up the push notification backend now (even without a feature that sends notifications)? **Recommendation**: No. Register the SW for caching only. Add push subscription when a notification-worthy feature ships (e.g., weekly digest newsletter). Premature push permission requests have a high deny rate and cannot be re-requested.
