# Golf Data Viz — Project Context

## What This Is
Golf data visualization platform for mid-handicap golfers. First tool: **Strokes Gained Benchmarker** — input round stats, see where you gain/lose strokes vs handicap peers (not Tour pros). Produces shareable spider diagrams and heat maps.

## Target User
14-handicap golfers (the median male golfer). The builder IS the target audience.

## Stack
- **Framework**: Next.js 16 (App Router, Server Components, Turbopack)
- **Visualization**: Nivo (`@nivo/radar`, `@nivo/heatmap`, etc.) — SSR/HTTP rendering for shareable images
- **Styling**: Tailwind CSS v4 (CSS-first config) + shadcn/ui
- **Database + Auth**: Supabase (Postgres + Auth + Storage)
- **Deployment**: Vercel
- **Language**: TypeScript (strict mode)
- **Design Tool**: Paper.design (MCP integration for UI generation, not app foundation)

## Architecture
```
src/
  app/              → Next.js App Router pages
    (tools)/        → Route group for tool pages (no URL segment)
      strokes-gained/ → Tool #1: SG Benchmarker
  components/
    ui/             → shadcn/ui components
    charts/         → Nivo chart wrappers
  lib/
    golf/           → Golf domain logic (SG calculations, benchmarks, types)
    supabase/       → Supabase client helpers
  data/
    benchmarks/     → Static benchmark JSON by handicap bracket
  hooks/            → Custom React hooks
```

## Key Decisions
- Manual round input first, Arccos API integration later
- Benchmark against handicap peers, never Tour pros
- Shareable outputs are the growth mechanism (screenshots → r/golf, group chats)
- Nivo server-side SVG rendering for OG images and social sharing
- No monorepo — single Next.js project until complexity demands it

## Coding Conventions
- Use `@/*` import alias (maps to `src/*`)
- Colocate page-specific components in `_components/` subdirs
- Keep golf calculation logic in `src/lib/golf/` — pure functions, fully tested
- Use Supabase Row Level Security for per-user data isolation

## Commands
- `npm run dev` — Start dev server (Turbopack)
- `npm run build` — Production build
- `npm run lint` — ESLint
