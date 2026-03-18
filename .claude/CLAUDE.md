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
- When renaming user-facing strings, updating benchmark data, or changing UI labels, update the corresponding e2e tests in `tests/e2e/` in the same PR. Run `npx playwright test --project=functional` before marking done.

## Commands
- `npm run dev` — Start dev server (Turbopack)
- `npm run build` — Production build
- `npm run lint` — ESLint
- `npm run seed:staging:manual` — Reset QA accounts on staging (requires staging env vars)

## Environments (SDLC)

| Environment | Vercel | Supabase | Sentry |
|-------------|--------|----------|--------|
| **Local** | `localhost:3000` | N/A (uses staging or local Supabase) | N/A |
| **Staging** | `staging` branch → `staging.golfdataviz.com` | `uxelgkeagzjnwmjspcda` (`golf-data-viz-staging`) | `javascript-nextjs` (shared) |
| **Prod** | Production deploy on `main` — `golfdataviz.com` | `wxlqnetdidreumtyzorz` (`golf-data-viz-prod`) | `javascript-nextjs` (shared) |

- **Flow**: Local → Staging (`staging` branch) → Prod (merge to `main`)
- **Staging CI**: pushes to `staging` trigger `.github/workflows/staging-smoke.yml` (remote smoke + OAuth claim handoff)
- **Vercel prod domains**: `golfdataviz.com`, `www.golfdataviz.com`, `golf-data-viz.vercel.app`
- **Sentry**: Single project `javascript-nextjs` in org `dallas-inman` covers both staging and prod
- **When verifying a deploy**: always match the environment — use staging Supabase ref for staging deploys, prod ref for prod deploys

## MCP Servers (Live Infrastructure Access)

Three MCP servers are connected for direct infrastructure interaction:

### Supabase (`mcp__supabase__*`)
- **Production**: `wxlqnetdidreumtyzorz` (golf-data-viz-prod)
- **Staging**: `uxelgkeagzjnwmjspcda` (golf-data-viz-staging)
- Capabilities: execute SQL, apply migrations, list tables/extensions, get logs, manage branches, generate TypeScript types
- Use `mcp__supabase__execute_sql` for ad-hoc queries (rounds counts, bracket distributions, debugging)
- Use `mcp__supabase__list_tables` / `mcp__supabase__get_logs` for schema and runtime inspection
- Use `mcp__supabase__apply_migration` to apply new migrations

### Vercel (`mcp__vercel__*`)
- **Project**: `golf-data-viz` (`prj_JEOpUisLp4LxNSF0o1qvuxR2QJl1`)
- **Team**: `team_AusQ5gpKE0lhKnMzvHXNp29m`
- Capabilities: list/get deployments, view build & runtime logs, check project config, fetch deployment URLs
- Use `mcp__vercel__list_deployments` to check recent deploy status
- Use `mcp__vercel__get_deployment_build_logs` / `mcp__vercel__get_runtime_logs` to debug production issues

### Sentry (`mcp__sentry__*`)
- **Org**: `dallas-inman` (regionUrl: `https://us.sentry.io`)
- Capabilities: search issues/events, get issue details, view traces, find releases, analyze with Seer
- Use `mcp__sentry__search_issues` to find production errors
- Use `mcp__sentry__get_issue_details` / `mcp__sentry__search_events` for root cause analysis
- Always pass `organizationSlug: "dallas-inman"` and `regionUrl: "https://us.sentry.io"`
- **Sentry project slug**: `javascript-nextjs`

### MCP Usage Rules
- **Prefer MCP tools over curl/CLI** for Supabase, Vercel, and Sentry — no auth setup needed
- **Before writing migrations**: run `mcp__supabase__list_tables` (verbose) to confirm current schema
- **After deploying**: check `mcp__vercel__list_deployments` for READY state, then `mcp__sentry__search_issues` for new errors
- **Bug reports**: search Sentry first (`search_issues` → `get_issue_details`) before reading code
- **"Check analytics" / "how's the app doing"**: run Supabase round counts + Vercel deploy status + Sentry error check in parallel (see MEMORY.md for full procedure)
- **Default to production** (`wxlqnetdidreumtyzorz`) unless explicitly told to use staging

## Workflow Orchestration

### 1. Plan Mode Default
- Enter plan mode for ANY non-trivial task (3+ steps or architectural decisions)
- If something goes sideways, STOP and re-plan immediately — don't keep pushing
- Use plan mode for verification steps, not just building
- Write detailed specs upfront to reduce ambiguity

### 2. Subagent Strategy
- Use subagents liberally to keep main context window clean
- Offload research, exploration, and parallel analysis to subagents
- For complex problems, throw more compute at it via subagents
- One task per subagent for focused execution

### 3. Self-Improvement Loop
- After ANY correction from the user: update `tasks/lessons.md` with the pattern
- Write rules for yourself that prevent the same mistake
- Ruthlessly iterate on these lessons until mistake rate drops
- Review lessons at session start for relevant project

### 4. Verification Before Done
- Never mark a task complete without proving it works
- Diff behavior between main and your changes when relevant
- Ask yourself: "Would a staff engineer approve this?"
- Run tests, check logs, demonstrate correctness

### 5. Demand Elegance (Balanced)
- For non-trivial changes: pause and ask "is there a more elegant way?"
- If a fix feels hacky: "Knowing everything I know now, implement the elegant solution"
- Skip this for simple, obvious fixes — don't over-engineer
- Challenge your own work before presenting it

### 6. Autonomous Bug Fixing
- When given a bug report: just fix it. Don't ask for hand-holding
- Point at logs, errors, failing tests — then resolve them
- Zero context switching required from the user
- Go fix failing CI tests without being told how

## Task Management

1. **Plan First**: Write plan to `tasks/todo.md` with checkable items
2. **Verify Plan**: Check in before starting implementation
3. **Track Progress**: Mark items complete as you go
4. **Explain Changes**: High-level summary at each step
5. **Document Results**: Add review section to `tasks/todo.md`
6. **Capture Lessons**: Update `tasks/lessons.md` after corrections

## Core Principles

- **Simplicity First**: Make every change as simple as possible. Impact minimal code.
- **No Laziness**: Find root causes. No temporary fixes. Senior developer standards.
- **Minimal Impact**: Changes should only touch what's necessary. Avoid introducing bugs.
