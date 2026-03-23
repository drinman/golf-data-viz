# Golf Data Viz

Golf Data Viz is a public beta for post-round golf analytics. The current
product is a strokes gained benchmarker that turns manual scorecard stats into
a peer-handicap comparison.

## Current Product

- Working strokes gained benchmarker at `/strokes-gained`
- Peer comparison by handicap bracket instead of PGA Tour baselines
- Nivo radar chart plus per-category summary and shareable result links
- Optional anonymous round saves backed by Supabase
- Methodology and privacy pages published in-app

## Stack

- Next.js 16
- React 19 + TypeScript
- Tailwind CSS v4
- Nivo radar charts
- Supabase
- Vercel Analytics and optional GA4

## Local Development

```bash
npm ci
npm run dev
```

Open `http://localhost:3000`.

## Environment

Copy `.env.example` and set the variables you need for the features you want to
exercise locally.

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

## Scripts

- `npm run dev`
- `npm run build`
- `npm run start`
- `npm run lint`
- `npm run test`
- `npm run test:e2e`

## Notes

- Benchmarks are still provisional and documented in
  `src/data/benchmarks/handicap-brackets.json`.
- Shared links recreate a round from encoded scorecard data.
- Anonymous round saves are opt-in and intended to improve future benchmarks.
