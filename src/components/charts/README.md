# Chart Components

Nivo chart wrappers for golf data visualization.

## Planned Components
- `radar-chart.tsx` — Strokes gained spider diagram (player vs peer average)
- `heatmap-chart.tsx` — Shot dispersion / scoring heat map
- `share-wrapper.tsx` — Wrapper that adds export-to-image capability

## Design Principles
- Each chart component accepts typed golf data (from `@/lib/golf/types`)
- Server-side rendering support via Nivo's HTTP API for OG images
- Every chart produces a shareable output (PNG/SVG export)
- Consistent theming via shared Nivo theme config
