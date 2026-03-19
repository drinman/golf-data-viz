# Current-State Funnel Audit

Date: 2026-03-17

## What exists now

Golf Data Viz already ships more than a single calculator.

- The landing page at `/` uses a simple promise, a sample preview, and direct
  CTA handoff into `/strokes-gained`.
- The main benchmarker already includes a notable amount of conversion support:
  `Try with Sample Data`, progressive form entry, results, PNG export, copy
  link, AI narrative, anonymous save, post-save claim, and recipient CTA on
  shared links.
- The repeat-use surfaces already exist: round history, saved round detail,
  shared saved rounds, and lesson prep.
- The premium wedge also already exists: lesson prep reports and entitlements
  are live, which means the product has moved downstream before the top-of-
  funnel loop has been clearly validated.
- The event taxonomy is rich. `src/lib/analytics/events.ts` defines 57+ custom
  events across acquisition, form entry, results, sharing, saving, history,
  premium, lesson prep, and narrative generation. `src/lib/analytics/client.ts`
  dual-sinks those events to Vercel Analytics and GA4.

March 10-16, 2026 analytics baseline from the user-provided GA4 and Vercel
snapshots:

- GA4: `355` page views, `138` session starts, `103` first visits, `68`
  form starts, `105` `results_emphasis_impression` events.
- Channel mix: `134` direct sessions, `13` unassigned, `3` referral, `1`
  organic search.
- Top GA4 pages: `Strokes Gained Benchmarker` `130`, `Home` `109`, `Round History`
  `46`, then shared/saved surfaces in single digits.
- Vercel: `73` visitors, `195` page views, `58%` bounce, with `/`,
  `/strokes-gained`, and `/strokes-gained/history` leading traffic.

Repo-grounded surfaces used in this audit:

- [README.md](/Users/dallas.inman/projects/golf-data-viz/README.md)
- [docs/roadmap.md](/Users/dallas.inman/projects/golf-data-viz/docs/roadmap.md)
- [docs/PROJECT-BIBLE.md](/Users/dallas.inman/projects/golf-data-viz/docs/PROJECT-BIBLE.md)
- [docs/premium-strategy.md](/Users/dallas.inman/projects/golf-data-viz/docs/premium-strategy.md)
- [docs/specs/tool2-ai-narrative.md](/Users/dallas.inman/projects/golf-data-viz/docs/specs/tool2-ai-narrative.md)
- [src/app/page.tsx](/Users/dallas.inman/projects/golf-data-viz/src/app/page.tsx)
- [src/app/(tools)/strokes-gained/_components/strokes-gained-client.tsx](/Users/dallas.inman/projects/golf-data-viz/src/app/(tools)/strokes-gained/_components/strokes-gained-client.tsx)
- [src/lib/analytics/events.ts](/Users/dallas.inman/projects/golf-data-viz/src/lib/analytics/events.ts)

## What’s actually working

- The top of funnel is not dead. `103` first visits in one week is enough to
  say the product is getting curiosity, especially for a niche golf tool.
- Activation is not broken. `68` form starts from `103` first visits is a
  strong early signal that the promise and sample-driven onboarding are
  understandable.
- Results are being reached often enough to matter. `105`
  `results_emphasis_impression` events against `68` form starts implies that
  results are being generated via multiple routes: fresh submissions, sample
  flow, and shared/saved result views.
- The landing page and main tool are doing their job as discovery and action
  surfaces. They dominate both GA4 and Vercel analytics.
- History is not irrelevant. `46` GA4 views on Round History and `28` Vercel
  page views on `/strokes-gained/history` show users are at least probing the
  return-use surface.
- The product already has a meaningful coach-adjacent asset: lesson prep.
  Even if it should not drive acquisition yet, it proves the product can
  generate artifacts downstream of a round.

## What’s been tried and why it stalls

- The product has expanded surface area faster than it has validated the core
  loop. History, premium, sharing variants, saved-round detail, and lesson prep
  are real value, but none of them answer whether the main object is naturally
  spreading.
- Traffic is almost entirely non-compounding. `134` direct sessions and only
  `1` organic-search session means the product is still running on memory,
  links, and launch residue.
- The current analytics snapshot cannot prove whether sharing works. The event
  taxonomy contains `download_png_clicked`, `copy_link_clicked`,
  `shared_round_viewed`, `share_token_created`, and narrative events, but the
  user snapshot exposes none of those. That means the growth object is still
  largely invisible in reporting.
- GA4 key events are not configured. The user’s GA4 home screen shows “No data
  available” under key events even though the app has plenty of conversion
  events. This is a measurement failure, not just a marketing problem.
- Results are still framed primarily as private analysis. Even with share cards,
  the default experience is “your round breakdown,” not “this is a public thing
  worth forwarding.”
- The product promise is still split across too many futures: benchmarking,
  sharing, history, lesson prep, premium, and AI narrative. That breadth is
  impressive, but it blurs the growth object.

## Patterns worth stealing

- Behavior-based unlocks rather than blanket gating. TheGrint’s “10th upload”
  and trial logic are stronger than static upgrade messaging.
- One sharp next step after analysis. Clippd’s “what to work on” is stronger
  than leaving a user with four categories and no hierarchy.
- Artifact-native sharing. Strava and Hevy let users place stats on top of
  their own image or story context instead of forcing a single house-designed
  summary card.
- Public compare surfaces. Golf Insider and Break X turn benchmark questions
  into public landing pages, not just private app states.
- Coach-safe summaries. Oura-style shareable reports and the project’s own
  lesson-prep logic both validate short, read-only artifacts over dashboards.

## Anti-patterns to avoid

- More downstream feature work before the share and return loop is measured.
- Treating “private dashboard depth” as the same thing as product quality.
- Measuring proxies like page views while leaving share, recipient conversion,
  and repeat use effectively unowned.
- Leaning too hard on generic homepage polish while discovery remains direct and
  non-compounding.
- Building premium answers to a top-of-funnel problem.

## Ideas this unlocks for Golf Data Viz

- Reframe the main product around a public round artifact, not a private chart.
- Build share destinations that are legible without prior context: score-first,
  peer benchmark, one sentence of interpretation, and one explicit next action.
- Add a target-handicap compare loop so the product is useful before and after a
  round, not just after.
- Make the shared-round recipient path measurable and deliberate. The current
  recipient CTA is promising, but it needs a tracked conversion chain.
- Turn weekly/monthly return usage into a product surface, not just a history
  page.

## Source links

Accessed 2026-03-17 unless otherwise noted.

- [README.md](/Users/dallas.inman/projects/golf-data-viz/README.md)
- [docs/roadmap.md](/Users/dallas.inman/projects/golf-data-viz/docs/roadmap.md)
- [docs/PROJECT-BIBLE.md](/Users/dallas.inman/projects/golf-data-viz/docs/PROJECT-BIBLE.md)
- [docs/premium-strategy.md](/Users/dallas.inman/projects/golf-data-viz/docs/premium-strategy.md)
- [docs/specs/tool2-ai-narrative.md](/Users/dallas.inman/projects/golf-data-viz/docs/specs/tool2-ai-narrative.md)
- [tasks/research-attribution-improvement.md](/Users/dallas.inman/projects/golf-data-viz/tasks/research-attribution-improvement.md)
- [src/app/page.tsx](/Users/dallas.inman/projects/golf-data-viz/src/app/page.tsx)
- [src/app/(tools)/strokes-gained/_components/strokes-gained-client.tsx](/Users/dallas.inman/projects/golf-data-viz/src/app/(tools)/strokes-gained/_components/strokes-gained-client.tsx)
- [src/lib/analytics/events.ts](/Users/dallas.inman/projects/golf-data-viz/src/lib/analytics/events.ts)
- User-provided GA4 and Vercel analytics snapshots in the 2026-03-17 thread

## Raw findings

- Curiosity exists.
- Activation is decent.
- Results are being reached.
- Sharing is not yet proven.
- Search discovery is almost nonexistent.
- The event taxonomy is ahead of the reporting setup.

## Implications for Golf Data Viz

The next growth problem is not “what other features can we add?” It is “what is
the object that spreads, and can we finally measure it?” Until that is clear,
the product is overbuilt for the evidence it has.

## Ideas worth stealing

- Public compare pages
- Artifact overlays
- Behavior-based unlocks
- One-step interpretation
- Coach-safe share summaries

## Ideas to reject

- More premium expansion first
- Deeper private dashboard work first
- Generic homepage optimization as the main strategy
- Shipping without tighter funnel instrumentation
