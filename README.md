# Golf Data Viz

Interactive golf analytics tools for mid-handicap players.

Initial product focus:
- Strokes Gained Benchmarker (manual round input)
- Peer handicap benchmarking (not PGA Tour baselines)
- Shareable chart outputs

## Tech Stack

- Next.js 16 (App Router)
- React 19 + TypeScript (strict)
- Tailwind CSS v4
- Planned: Nivo/Recharts for data visualization
- Planned: Supabase for auth/data storage

## Project Status

- App scaffolding and route structure are in place
- Core golf domain types exist in `src/lib/golf/types.ts`
- Benchmark and strokes gained engines are scaffolded with TODOs
- Strokes gained tool route exists at `/strokes-gained`

## Directory Layout

```text
src/
  app/
    (tools)/
      strokes-gained/
        _components/
        page.tsx
    layout.tsx
    page.tsx
  components/
    charts/
    ui/
  data/
    benchmarks/
      handicap-brackets.json
  hooks/
  lib/
    golf/
      benchmarks.ts
      strokes-gained.ts
      types.ts
    supabase/
      client.ts
      server.ts
```

## Structure Conventions

- `src/app`: routes, layouts, and route-local UI.
- `src/app/(tools)`: feature route group for tool pages.
- `src/lib/golf`: domain logic and golf-specific types/calculations.
- `src/lib/supabase`: server/browser client setup and auth wiring.
- `src/data/benchmarks`: static benchmark seed and source notes.
- `src/components/charts`: reusable chart wrappers.
- `src/components/ui`: reusable UI primitives.
- `src/hooks`: shared React hooks.

## Local Development

```bash
npm ci
npm run dev
```

Open `http://localhost:3000`.

## Environment Variables

Copy `.env.example` and set:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Scripts

- `npm run dev`: start development server
- `npm run lint`: run ESLint
- `npm run build`: production build
- `npm run start`: run built app

## Immediate Next Steps

- Implement benchmark loader in `src/lib/golf/benchmarks.ts`
- Implement SG calculations in `src/lib/golf/strokes-gained.ts`
- Build the MVP form and chart components for `/strokes-gained`
