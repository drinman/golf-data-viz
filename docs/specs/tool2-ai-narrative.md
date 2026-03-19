# Tool #2: AI Post-Round Narrative Generator

**Status**: Spec
**Author**: Product
**Date**: 2026-03-14
**Target build time**: 30-60 minutes (AI-assisted)

---

## 1. Problem Statement

Golf Data Viz has 56 users and 45 completed calculations with 13m34s average engagement, but **0% week-over-week retention** and a **~2% share rate**. The current output (spider chart + SG category breakdown) works well for visual sharing but has two critical gaps:

1. **Interpretation gap**: Users see numbers like "+0.42 Off the Tee" and "-1.15 Approach" but don't know what that means for their game in practical terms. This mirrors the Clippd pain point: "I still struggle with Strokes Gained... I find the insights a little tricky to interpret."

2. **Text-channel sharing gap**: The spider chart PNG is effective on visual platforms but golf's highest-engagement channels are text-based (r/golf comments, iMessage group chats, texts to playing partners). Text narratives travel where images cannot.

3. **Return-visit gap**: Once a user sees their SG breakdown, there is no compelling reason to return. A narrative that changes with each round creates curiosity ("what will the AI say about this round?") and a reason to come back.

### User Stories

**As a 14-handicap golfer**, I want a plain-English summary of what my SG numbers mean so I understand what to work on without needing to decode statistical jargon.

**As a golfer who posts in r/golf**, I want copy-pasteable text that describes my round performance so I can share my analysis in comments and discussion threads where images get buried.

**As a golfer who takes lessons**, I want a clear written summary of my strengths and weaknesses so I can text it to my coach before our next session.

**As a returning user**, I want to see how the AI describes my latest round compared to past rounds so I have a reason to come back after each round.

---

## 2. Requirements

### Must Have (MVP)

- [ ] **M1**: Generate a 3-5 sentence narrative from a completed `StrokesGainedResult` + `RoundInput`
- [ ] **M2**: Narrative appears in the results flow below the existing `ResultsSummary` component, above the share actions
- [ ] **M3**: Narrative translates SG values into golfer-readable language (not "your SG approach is -1.15" but "you lost over a stroke on approach shots compared to your peers, which is the biggest gap in your game today")
- [ ] **M4**: Narrative identifies the key pattern or story of the round based on the data relationships (e.g., high FIR + low GIR = iron play problem; high putts + high GIR = putting problem despite good ball-striking)
- [ ] **M5**: One-click "Copy Text" button that copies the narrative to clipboard
- [ ] **M6**: Generation happens client-side via API route, not blocking the initial results render
- [ ] **M7**: Graceful degradation — if the API call fails or Claude is unavailable, the results page works exactly as it does today (narrative section simply does not appear)
- [ ] **M8**: Rate limiting on the API route (same pattern as `saveRound`: IP-based, per-minute window)
- [ ] **M9**: Analytics events for narrative generation, copy, and errors

### Should Have

- [ ] **S1**: Narrative references specific input stats that drove the analysis (e.g., "hitting only 5 of 18 greens" rather than just "approach play needs work")
- [ ] **S2**: Narrative tone matches the round outcome — encouraging for strong rounds, diagnostic for weak ones, balanced for mixed rounds
- [ ] **S3**: Skeleton loading state while narrative generates (shimmer placeholder, not a spinner)
- [ ] **S4**: Narrative includes the benchmark context (e.g., "compared to other 10-15 handicap golfers")
- [ ] **S5**: Trouble context integration — if the user added trouble context, the narrative incorporates it

### Could Have

- [ ] **C1**: "Regenerate" button to get a different take on the same data
- [ ] **C2**: Include narrative text in the PNG share card as an optional section
- [ ] **C3**: Persist narratives alongside saved rounds in Supabase for history view
- [ ] **C4**: Multi-round narrative that compares the current round to saved history ("This is your best approach round in the last 5")

### Won't Have (Explicit Exclusions)

- **W1**: Drill or practice recommendations — that is coaching territory (per premium-strategy.md: "Suggesting drills undermines the coach's authority")
- **W2**: Swing mechanics suggestions — scorecard data says nothing about swing
- **W3**: Comparison to Tour pros — the product benchmarks against handicap peers, never Tour pros
- **W4**: Chat interface or follow-up questions — this is a one-shot generation, not a conversation
- **W5**: User-editable narrative — the output is read-only
- **W6**: Narrative for shared/incoming round links — only the golfer who submits the form sees the narrative (avoids generating narratives for every shared link visit)

---

## 3. Technical Approach

### Architecture

```
[Client: results page]
    |
    |  POST /api/narrative (after results render)
    v
[Next.js API Route: /api/narrative/route.ts]
    |  - validate input (Zod)
    |  - rate limit (IP-based)
    |  - recalculate SG server-side (never trust client values)
    |  - build prompt
    |  - call Claude API
    |  - return narrative text
    v
[Client: render narrative in results section]
```

### Claude API Integration

**Model**: `claude-sonnet-4-20250514` (fast, cost-effective for short generations; upgrade to Opus only if quality demands it)

**New dependency**: `@anthropic-ai/sdk` (official Anthropic TypeScript SDK)

**Environment variable**: `ANTHROPIC_API_KEY` — set in Vercel for staging and production. Not prefixed with `NEXT_PUBLIC_` (server-only).

**API route location**: `src/app/api/narrative/route.ts`

**Call pattern**:
```typescript
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic(); // reads ANTHROPIC_API_KEY from env

const message = await client.messages.create({
  model: "claude-sonnet-4-20250514",
  max_tokens: 400,
  system: SYSTEM_PROMPT,
  messages: [{ role: "user", content: buildUserPrompt(input, result) }],
});
```

**Timeout**: 15 seconds. If Claude does not respond within 15 seconds, return a 504 and the client gracefully hides the narrative section.

**Cost estimate**: ~$0.003-0.005 per generation at Sonnet pricing (short input, short output). At current volume (45 calculations total), cost is negligible. At 1000 calculations/month, ~$3-5/month.

### Prompt Design

The prompt is the core IP of this feature. It lives in a dedicated file: `src/lib/golf/narrative-prompt.ts`.

**System prompt** (condensed — full version in implementation file):

```
You are a golf performance analyst writing for mid-handicap recreational golfers.
Your job is to translate strokes gained statistics into a clear, compelling 3-5
sentence narrative about a golfer's round.

Rules:
- Write in second person ("you", "your")
- Use plain English a 14-handicap golfer understands. No jargon without explanation.
- Never suggest drills, practice routines, or swing changes
- Never compare to Tour/PGA players
- Reference specific stats from the round (putts, fairways, GIR, score)
- The benchmark comparison group is other golfers at their handicap level
- Be honest: if a category is weak, say so directly. Don't sugarcoat.
- Be encouraging when warranted: if something is genuinely strong, acknowledge it
- Keep it tight: 3-5 sentences, under 120 words
- Format as a single paragraph — no bullet points, no headers
- If trouble context is provided, incorporate it into the narrative
- Include confidence caveats when a category has "low" confidence
- End with one sentence about the single most impactful area for improvement,
  framed as observation not advice ("your biggest opportunity is..." not "you should...")
```

**User prompt template** (built from `RoundInput` + `StrokesGainedResult`):

```
Round data:
- Course: {courseName}, Score: {score}, Handicap Index: {handicapIndex}
- Course Rating: {courseRating}, Slope: {slopeRating}
- Fairways: {fairwaysHit}/{fairwayAttempts}
- Greens in Regulation: {greensInRegulation}/18 {estimated ? "(estimated)" : ""}
- Total Putts: {totalPutts}
- Penalty Strokes: {penaltyStrokes}
- Scoring: {eagles}E, {birdies}B, {pars}P, {bogeys}Bo, {doubleBogeys}D, {triplePlus}T+

Strokes Gained vs {bracketLabel} peers:
- Total: {sgTotal}
- Off the Tee: {sgOTT} (confidence: {confOTT})
- Approach: {sgApp} (confidence: {confApp})
- Around the Green: {sgATG} (confidence: {confATG})
- Putting: {sgPutt} (confidence: {confPutt})

{troubleContext ? `Trouble context: ${troubleNarrative}` : ""}
{estimatedCategories.length > 0 ? `Note: ${estimatedCategories} were estimated, not directly measured.` : ""}

Write a 3-5 sentence narrative about this round.
```

### Key Prompt Design Considerations

1. **Determinism vs variety**: Use `temperature: 0.7` — warm enough for natural-sounding text, cool enough to stay factual. The narrative should feel different each time but always be grounded in the data.

2. **Pattern detection**: The prompt should guide Claude to identify the _story_ of the round. Common patterns the prompt should surface:
   - High FIR + low GIR = "found fairways but couldn't convert approach shots"
   - Low FIR + high penalty = "tee trouble cascaded into penalty strokes"
   - High GIR + high putts = "ball-striking was solid but the putter let you down"
   - Low score + negative total SG = "scored well but played below your peers' level on a favorable course"
   - Scoring distribution anomalies: "most of the damage came from two triples"

3. **Tone calibration**: The prompt encodes tone rules:
   - Total SG > +1.0: celebratory but not over the top
   - Total SG between -0.5 and +0.5: balanced, analytical
   - Total SG < -1.0: empathetic but honest, focus on "here's where the strokes went"

4. **Confidence awareness**: If a category has "low" confidence, the narrative should hedge ("the data suggests..." rather than "your approach play was..."). This mirrors the existing confidence badge system.

---

## 4. Input/Output Spec

### API Route: `POST /api/narrative`

**Request body** (validated with Zod on the server):

```typescript
interface NarrativeRequest {
  // Round input fields (same as RoundInput type)
  course: string;
  date: string;
  score: number;
  handicapIndex: number;
  courseRating: number;
  slopeRating: number;
  fairwaysHit?: number;
  fairwayAttempts: number;
  greensInRegulation?: number;
  totalPutts: number;
  penaltyStrokes: number;
  eagles: number;
  birdies: number;
  pars: number;
  bogeys: number;
  doubleBogeys: number;
  triplePlus: number;
  upAndDownAttempts?: number;
  upAndDownConverted?: number;
  sandSaves?: number;
  sandSaveAttempts?: number;
  threePutts?: number;

  // Optional trouble context
  troubleContext?: {
    troubleHoles: Array<{ holeNumber: number | null; primaryCause: string }>;
    summary: Record<string, number>;
  };
}
```

**Why send `RoundInput` instead of `StrokesGainedResult`**: The server recalculates SG from raw inputs using the same pipeline (`calculateStrokesGainedV3`). This prevents prompt injection through manipulated SG values and ensures narrative accuracy matches the displayed results.

**Response body**:

```typescript
// Success
{ narrative: string }

// Error
{ error: string; code: "RATE_LIMITED" | "VALIDATION" | "GENERATION_FAILED" | "UNAVAILABLE" }
```

**HTTP status codes**:
- `200` — narrative generated successfully
- `400` — validation error (malformed input)
- `429` — rate limited
- `500` — Claude API error or internal error
- `503` — Claude API unavailable (timeout, connection error)

### Output Format

The narrative is a single paragraph of plain text, 3-5 sentences, under 120 words. No markdown, no HTML, no bullet points.

**Example outputs** (for reference — actual outputs will vary):

**Strong round (14 HCP, shot 78, +2.1 total SG)**:
> This was a strong round across the board. You gained over two strokes on your 10-15 handicap peers, with the biggest edge coming from approach play — hitting 11 greens in regulation is well above what golfers at your level typically manage. Your putting was solid too, converting those GIR opportunities with 30 putts. The one area that kept this from being even better was off the tee, where two penalty strokes offset otherwise decent driving. Your biggest opportunity going forward is tightening up tee shots to avoid those penalty situations.

**Weak round (14 HCP, shot 94, -2.8 total SG)**:
> A tough day at Torrey Pines, with most of the damage coming from approach play. Hitting only 4 greens in regulation against an expected 7-8 for your handicap bracket meant you were scrambling on nearly every hole. The short game actually held up well — your up-and-down rate was above average, which kept the score from ballooning further. Three penalty strokes also contributed to the gap. The biggest opportunity in this round is iron play from the fairway: you found 9 fairways but converted only 4 of those into greens.

**Mixed round with trouble context (18 HCP, shot 89, -0.3 total SG)**:
> A mostly solid round with a few holes doing the damage. You lost a fraction of a stroke overall versus 15-20 handicap peers, which is closer to average than the score might suggest given the course rating. Your putting was the standout — 31 putts is efficient and you gained nearly a full stroke on the greens. The trouble context tells the story: two tee shots that went sideways cascaded into approach and short game trouble on those holes, inflating those categories. Your biggest opportunity is off-the-tee consistency, where eliminating those blow-up tee shots would likely bring approach and short game numbers back in line.

---

## 5. UI/UX Spec

### Placement in the Results Flow

The narrative appears in the existing results section of `strokes-gained-client.tsx`, between the `ResultsSummary` component and the share actions (Download PNG / Copy Link buttons). The insertion point is after the trouble context section and before the share buttons.

**Current flow**:
```
Results heading
  -> "How to read these results" details
  -> Radar chart
  -> ResultsSummary (total SG, category breakdown, strength/weakness)
  -> TroubleContextPrompt (conditional)
  -> TroubleContextModal (conditional)
  -> Share actions (Download PNG, Copy Link)
  -> ShareCard (off-screen for capture)
```

**New flow**:
```
Results heading
  -> "How to read these results" details
  -> Radar chart
  -> ResultsSummary (total SG, category breakdown, strength/weakness)
  -> TroubleContextPrompt (conditional)
  -> TroubleContextModal (conditional)
  -> **NarrativeBlock (new)**          <-- inserted here
  -> Share actions (Download PNG, Copy Link)
  -> ShareCard (off-screen for capture)
```

### Component: `NarrativeBlock`

**File**: `src/app/(tools)/strokes-gained/_components/narrative-block.tsx`

**States**:

1. **Loading** — skeleton shimmer placeholder (3 lines of varying width), appears immediately when results render. Text: "Generating your round analysis..." in muted text above the skeleton.

2. **Success** — narrative text in a styled card with a "Copy Text" button.

3. **Error** — component renders nothing (invisible). No error message shown to the user. The results page works exactly as it does today without the narrative.

4. **Hidden** — not rendered when viewing a shared round link (`initialInput` is set). Only appears for fresh form submissions.

**Visual design**:

```
┌──────────────────────────────────────────────────┐
│  AI Round Analysis                               │
│                                                  │
│  [narrative paragraph text here, styled as       │
│  body text with slightly larger line height       │
│  for readability]                                │
│                                                  │
│  ┌────────────┐                                  │
│  │ Copy Text  │                                  │
│  └────────────┘                                  │
│                                                  │
│  Powered by Claude · golfdataviz.com             │
└──────────────────────────────────────────────────┘
```

**Styling** (matches existing design system):
- Card: `rounded-xl border border-cream-200 bg-white p-6 shadow-sm`
- Heading: `text-sm font-semibold uppercase tracking-[0.15em] text-brand-800` (matches "Results" section heading style)
- Narrative text: `text-sm leading-relaxed text-neutral-700` (slightly larger line height than body for readability)
- Copy button: `rounded-lg border-2 border-cream-200 bg-white px-4 py-2 text-sm font-medium text-neutral-800 transition-all duration-200 hover:border-brand-800/30 hover:bg-cream-50` (matches existing "Copy Link" button style)
- Attribution: `text-[10px] text-neutral-400`
- Animation: `animate-fade-up` with appropriate delay (follows the existing stagger pattern)

**Copy behavior**:
- Copies the narrative text with attribution: `"{narrative}\n\n— Golf Data Viz (golfdataviz.com/strokes-gained)"`
- Shows "Copied!" for 2 seconds (same pattern as existing Copy Link button)
- Uses the same clipboard API with fallback as the existing `handleCopyLink`

### Mobile Considerations

- Card takes full width on mobile (no horizontal padding changes needed — inherits parent `px-4`)
- Copy button is full width on mobile (`w-full sm:w-auto`)
- Narrative text does not truncate — 3-5 sentences is short enough to display fully on any mobile screen

---

## 6. Share Integration

### Copy Text (Primary)

The "Copy Text" button is the primary share mechanism for text-based channels. The copied text includes:

```
{narrative}

-- Golf Data Viz (golfdataviz.com/strokes-gained)
```

This is designed for direct paste into:
- r/golf comments (Reddit)
- iMessage/SMS group chats
- WhatsApp golf groups
- Discord servers
- Text to a coach or playing partner

### Existing Share Actions (Unchanged)

The existing "Download PNG" and "Copy Link" buttons remain unchanged. The narrative is a complement to, not a replacement for, the visual share card.

### Future: Narrative in Share Card (Could Have — C2)

A future iteration could add a condensed 1-2 sentence version of the narrative to the bottom of the PNG share card, above the watermark. This would make the visual share card carry the text interpretation. Not in MVP scope.

---

## 7. Success Metrics

### Primary Metrics (Validates the Feature)

| Metric | Baseline | Target (4 weeks) | How to Measure |
|--------|----------|-------------------|----------------|
| **Narrative generation rate** | N/A | >80% of calculations | `narrative_generated` / `calculation_completed` |
| **Copy rate** | ~2% (current PNG+link) | >10% of generated narratives | `narrative_copied` / `narrative_generated` |
| **Week-over-week return rate** | 0% | >5% | Returning users with 2+ calculations in 7 days (Supabase + GA4) |

### Secondary Metrics (Validates Quality)

| Metric | Target | How to Measure |
|--------|--------|----------------|
| **Narrative load time (p50)** | <3 seconds | `narrative_generated` event latency |
| **Narrative load time (p95)** | <8 seconds | Server-side timing logs |
| **Error rate** | <5% of attempts | `narrative_failed` / (`narrative_generated` + `narrative_failed`) |
| **Share card download rate** | No regression | `download_png_clicked` before/after |

### Diagnostic Metrics (Monitors Health)

| Metric | How to Measure |
|--------|----------------|
| Claude API latency (p50/p95) | Server-side timing in API route |
| Claude API error rate | `narrative_failed` with `error_type: "generation"` |
| Rate limit hit rate | `narrative_failed` with `error_type: "rate_limited"` |
| Monthly API cost | Anthropic dashboard (expected: <$5/month at current volume) |

### Analytics Events to Add

Add the following to `src/lib/analytics/events.ts`:

```typescript
| "narrative_requested"        // User triggered narrative generation
| "narrative_generated"        // Narrative successfully received and rendered
| "narrative_failed"           // Narrative generation failed (with error_type)
| "narrative_copied"           // User clicked "Copy Text"
| "narrative_regenerated"      // User clicked "Regenerate" (Could Have — C1)
```

Event payloads:

```typescript
narrative_requested: EmptyPayload;
narrative_generated: { latency_ms: number; word_count: number };
narrative_failed: { error_type: "rate_limited" | "validation" | "generation" | "timeout" | "network" };
narrative_copied: { word_count: number; surface: "results_page" };
narrative_regenerated: EmptyPayload;
```

---

## 8. Risks and Mitigations

### Risk 1: Claude says something wrong or misleading

**Severity**: Medium
**Likelihood**: Low (structured prompt with bounded data)
**Mitigation**: The prompt is tightly constrained. It receives the exact same data the user sees on screen, recalculated server-side. The narrative cannot reference data that isn't present. Additionally, the system prompt explicitly prohibits coaching advice, Tour comparisons, and swing mechanics — the high-risk categories for inaccuracy. The narrative is labeled "AI Round Analysis" to set expectations.

### Risk 2: Claude API latency or downtime

**Severity**: Medium
**Likelihood**: Medium (external dependency)
**Mitigation**: The narrative loads asynchronously after results render. If Claude is slow or down, the user sees their full results immediately — the narrative section simply does not appear. No user-facing error. The existing product experience is the baseline, and the narrative is additive.

### Risk 3: Prompt injection via course name

**Severity**: Low
**Likelihood**: Low
**Mitigation**: The `roundInputSchema` already validates course name (1-100 chars, must contain letters). The API route re-validates server-side. The course name is inserted into the prompt as a data field, not as an instruction. The system prompt is fixed and delivered via the `system` parameter, separated from user content.

### Risk 4: Cost scaling

**Severity**: Low
**Likelihood**: Low (current volume is very small)
**Mitigation**: At ~$0.004 per generation and 45 calculations/month, cost is under $0.20/month. Even at 10x growth (450/month), cost is under $2/month. The rate limiter prevents abuse. If volume grows significantly, Haiku could replace Sonnet for cost reduction with minimal quality loss.

### Risk 5: Narrative quality inconsistency

**Severity**: Medium
**Likelihood**: Medium
**Mitigation**: Temperature 0.7 balances variety with consistency. The prompt constrains output format (3-5 sentences, single paragraph, under 120 words). Edge cases (all categories near zero, all categories skipped, plus handicap) are addressed with specific prompt instructions. Quality can be monitored via the `word_count` metric and periodic manual review.

### Risk 6: Users mistake narrative for coaching advice

**Severity**: Medium
**Likelihood**: Low
**Mitigation**: The prompt explicitly prohibits drill or practice recommendations. The narrative ends with an observation ("your biggest opportunity is...") not advice ("you should work on..."). The section is labeled "AI Round Analysis" not "AI Coaching." This aligns with the product's positioning as data interpretation, not coaching (per premium-strategy.md).

---

## 9. Premium vs Free Tier

### MVP: Free for All Users

The narrative generator launches as a **free feature** for all users, no login required. Rationale:

1. **Retention is the immediate problem**. Gating a retention feature behind a paywall defeats the purpose. The narrative needs to reach every user to prove it drives return visits.

2. **Share rate is the growth metric**. If narratives are copy-pasteable and sharable, they become a growth channel. Gating them reduces distribution.

3. **API cost is negligible**. At current volume, the Claude API cost is under $1/month. There is no economic pressure to gate this.

4. **Data collection**: Free usage generates signal on which narratives get copied, which round types drive engagement, and whether narratives actually improve retention. This data informs future gating decisions.

### Future Premium Gate (When Retention Proves Out)

If the narrative drives measurable return visits, consider this tiering:

| Feature | Free | Premium |
|---------|------|---------|
| Single-round narrative | Yes | Yes |
| Copy narrative text | Yes | Yes |
| Multi-round comparative narrative (C4) | No | Yes |
| Narrative in share card PNG (C2) | No | Yes |
| Narrative history (C3) | No | Yes |
| Regenerate with different tone | No | Yes |

The single-round narrative stays free forever. Premium unlocks richer narrative features that require saved round history (which already requires an account).

### Cost Controls

- Rate limit: 10 narratives per IP per hour (prevents abuse without impacting legitimate use)
- Max tokens: 400 per generation (hard cap via Claude API parameter)
- Fallback model: If Sonnet costs become problematic, Haiku is a drop-in replacement

---

## 10. Scope Boundaries

### This Feature IS:
- A one-shot text generation that translates SG numbers into readable English
- Additive to the existing results page (does not change any existing UI)
- Gracefully degradable (product works identically if the feature is down)
- A text-channel sharing mechanism (complement to visual PNG sharing)
- A retention hook ("what will it say about my next round?")

### This Feature IS NOT:
- A chatbot or conversational interface
- A coaching tool (no drills, no practice plans, no swing advice)
- A replacement for the existing results summary or spider chart
- A real-time on-course assistant
- A multi-round trend analyzer (that is the Lesson Prep Report's job)
- A premium gate (in MVP — may become a premium feature vector later)

---

## 11. Implementation Plan

### File Changes

**New files**:
1. `src/app/api/narrative/route.ts` — API route handler
2. `src/lib/golf/narrative-prompt.ts` — prompt construction (system + user prompt builder)
3. `src/app/(tools)/strokes-gained/_components/narrative-block.tsx` — client component

**Modified files**:
4. `src/app/(tools)/strokes-gained/_components/strokes-gained-client.tsx` — add `NarrativeBlock` to results flow, manage narrative fetch lifecycle
5. `src/lib/analytics/events.ts` — add narrative event types and payloads
6. `package.json` — add `@anthropic-ai/sdk` dependency

**Environment**:
7. Vercel env var: `ANTHROPIC_API_KEY` (staging + production, not `NEXT_PUBLIC_`)

### Implementation Steps

**Step 1: Prompt module** (`src/lib/golf/narrative-prompt.ts`)
- Export `NARRATIVE_SYSTEM_PROMPT` constant
- Export `buildNarrativeUserPrompt(input: RoundInput, result: StrokesGainedResult, troubleContext?: RoundTroubleContext): string`
- Pure functions, fully testable
- Unit tests for prompt construction with various round shapes (strong, weak, mixed, plus handicap, missing GIR, with trouble context)

**Step 2: API route** (`src/app/api/narrative/route.ts`)
- `POST` handler
- Validate request body with `roundInputSchema`
- Rate limit check (reuse existing `checkRateLimit` from `src/lib/rate-limit.ts`)
- Recalculate SG server-side via `calculateStrokesGainedV3`
- Build prompt via `buildNarrativeUserPrompt`
- Call Claude API with 15-second timeout
- Extract text from response, return as JSON
- Error handling: rate limit (429), validation (400), Claude error (500), timeout (503)

**Step 3: Client component** (`narrative-block.tsx`)
- Accepts `input: RoundInput` and optional `troubleContext`
- `useEffect` triggers fetch on mount (only for fresh submissions, not shared links)
- States: loading (skeleton), success (narrative card), error (hidden)
- "Copy Text" button with clipboard API + fallback
- Analytics events: `narrative_requested`, `narrative_generated`, `narrative_failed`, `narrative_copied`

**Step 4: Integration** (`strokes-gained-client.tsx`)
- Add `NarrativeBlock` between trouble context section and share actions
- Pass `lastInput` and `troubleContext` as props
- Only render for fresh submissions (not when `initialInput` is present from shared links)
- Reset narrative state on new form submission

**Step 5: Analytics events** (`events.ts`)
- Add event types and payload shapes as specified in Section 7

**Step 6: Deploy**
- Set `ANTHROPIC_API_KEY` in Vercel for staging
- Deploy to staging branch, verify narrative generation end-to-end
- Promote to production

### Testing Strategy

**Unit tests** (Vitest):
- `narrative-prompt.ts`: prompt construction produces expected format for all round shapes
- `narrative-prompt.ts`: handles edge cases (all-zero SG, missing optional fields, plus handicap, estimated categories)
- API route: validation rejects malformed input
- API route: rate limiting returns 429

**Manual verification** (Playwright or manual):
- Submit a round, verify narrative appears below results
- Verify skeleton loading state appears during generation
- Verify "Copy Text" copies narrative with attribution
- Verify narrative does not appear on shared round links
- Verify page works correctly when `ANTHROPIC_API_KEY` is not set (graceful degradation)
- Verify narrative resets on new form submission

---

## 12. Open Questions

1. **Model selection**: Spec assumes Sonnet for quality/cost balance. Should we test Haiku first for cost optimization, or start with Sonnet and downgrade only if needed? **Recommendation**: Start with Sonnet. Quality is the priority for a feature that lives or dies on how good the text is. Optimize cost later.

2. **Narrative persistence**: Should we persist narratives in Supabase alongside saved rounds? This enables narrative display in history view and shared round pages, but adds complexity. **Recommendation**: Defer to C3 (Could Have). MVP generates fresh each time. Persistence adds DB schema changes and cache invalidation concerns.

3. **Regeneration**: Should MVP include a "Regenerate" button? This is trivially implementable but may set wrong user expectations (implying the first generation was wrong). **Recommendation**: Defer to C1 (Could Have). Let the first version stand on its own quality. If users request regeneration, add it.

4. **Attribution text**: What exactly should the copy-paste attribution line say? Current proposal: `"-- Golf Data Viz (golfdataviz.com/strokes-gained)"`. Alternatives: include the URL with `?d=` encoded round data so recipients can see the full analysis. **Recommendation**: Include the encoded URL in the copied text for maximum sharing virality:
   ```
   {narrative}

   See full breakdown: golfdataviz.com/strokes-gained?d={encodedRound}
   ```
