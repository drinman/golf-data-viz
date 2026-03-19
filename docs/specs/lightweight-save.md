# Lightweight Save: Capture Results Without Account Friction

**Status:** Draft
**Author:** Product (AI-assisted)
**Date:** 2026-03-14
**Target:** v1 build sprint (30-60 min AI-assisted builds per phase)

---

## 1. Problem Statement

### The Funnel Today

| Stage | Count | Drop-off |
|-------|-------|----------|
| Calculations completed | 45 | -- |
| Rounds saved (to Supabase) | 15 | 67% lost |
| Accounts created | 1 | 93% of savers never sign up |
| Return visits | 0 | 100% churn |

**30 completed calculations were never saved.** Those users got their strokes gained result, saw value, and left with no path back. The current save flow requires checking a box *before* submitting -- a pre-commitment decision at the moment of least perceived value. Once the result page is gone, there is no reason to return.

### Root Causes

1. **Pre-commitment friction.** The "Save this round" checkbox sits inside the input form, before the user knows their result is valuable. Most users skip it.
2. **No passive capture.** If a user does not explicitly opt in, the calculation evaporates on page close.
3. **No return path.** Without a saved round or bookmark, there is no way to revisit results.
4. **Account wall for history.** The history page (`/strokes-gained/history`) requires authentication, creating a perceived barrier even though saving is anonymous.

### What Already Works

The infrastructure for saving, claiming, and sharing rounds is mature:

- Anonymous saves work via Turnstile CAPTCHA + service role key
- Claim tokens let anonymous rounds transfer to accounts after signup
- Share tokens create permanent URLs at `/strokes-gained/shared/round/[token]`
- The `?d=` query parameter already encodes the full `RoundInput` in the URL via `share-codec.ts`
- Trust scoring and dedup protection prevent abuse
- Rate limiting is in place on the save endpoint

The problem is not infrastructure -- it is the *decision architecture* that asks users to commit before they see value.

---

## 2. Approach Evaluation

### Option A: Auto-Save With Opt-Out

Save every calculation to Supabase by default (anonymously). Show a dismissible "Saved" confirmation. Let users delete if they want.

| Dimension | Assessment |
|-----------|------------|
| **Friction** | Zero -- user does nothing |
| **Expected save rate** | ~95%+ of calculations |
| **Effort** | Medium -- requires Turnstile flow change (invisible mode), opt-out UI, delete action |
| **Privacy risk** | High -- storing PII-adjacent data (course, score, handicap) without affirmative consent. GDPR problematic. |
| **Abuse risk** | High -- every page visit triggers a write. Amplifies bot/spam surface. |
| **Infrastructure cost** | Higher DB writes, more Turnstile verifications, more KV rate-limit checks |

**Verdict: Do not build.** The privacy and abuse surface area is too large for the expected benefit. Storing data without explicit consent is a liability for a bootstrapped product.

### Option B: Post-Results Save CTA

After showing results, display a prominent "Save this round" button. Move the save decision to *after* the user sees value.

| Dimension | Assessment |
|-----------|------------|
| **Friction** | One tap -- but after value is proven |
| **Expected save rate** | 50-70% of calculations (2-3x current) |
| **Effort** | Small -- reposition existing save flow, add CTA in results area |
| **Privacy risk** | Low -- explicit opt-in, same Turnstile verification |
| **Abuse risk** | Same as today -- rate limiting + Turnstile + trust scoring |
| **Infrastructure cost** | Same as today |

**Verdict: Build this. Primary recommendation.**

### Option C: Email Yourself This Result

Enter email, receive a magic link to results. Captures email for marketing.

| Dimension | Assessment |
|-----------|------------|
| **Friction** | Medium -- requires email entry, checking inbox |
| **Expected save rate** | 10-20% of unsaved calculations |
| **Effort** | High -- email infrastructure (Resend/SES), template, email capture consent, unsubscribe flow |
| **Privacy risk** | Medium -- email collection requires GDPR-compliant consent flow |
| **Abuse risk** | Medium -- email sending is a spam/abuse vector |
| **Infrastructure cost** | New dependency (email service), ongoing cost per send |

**Verdict: Do not build now.** The effort and compliance overhead is disproportionate to the user base size. Revisit when there is a marketing email strategy.

### Option D: Browser localStorage

Save results to localStorage so returning visitors see their last round. Zero signup, zero server dependency.

| Dimension | Assessment |
|-----------|------------|
| **Friction** | Zero -- automatic |
| **Expected save rate** | 100% local persistence |
| **Effort** | Small -- serialize RoundInput + StrokesGainedResult to localStorage |
| **Privacy risk** | None -- data stays on the user's device |
| **Abuse risk** | None -- no server writes |
| **Infrastructure cost** | None |

**Verdict: Build this. Secondary recommendation.** Complements Option B by providing a return path even for users who do not save to Supabase.

### Option E: Magic Link Return (Unique URL)

Generate a permanent URL for results. User bookmarks or saves the link.

| Dimension | Assessment |
|-----------|------------|
| **Friction** | Low -- but requires user to actively bookmark |
| **Expected save rate** | 5-10% -- most users do not bookmark |
| **Effort** | Zero -- this already exists via the `?d=` query parameter |
| **Privacy risk** | Low -- data is in the URL (already the case) |
| **Abuse risk** | None |
| **Infrastructure cost** | None |

**Verdict: Already shipped (partially).** The `?d=` parameter and `share_token` system provide this. No new work needed, but we should make the URL more visible to users. Incorporated into Option B's CTA design.

---

## 3. Recommended Build Plan

### Phase 1: Post-Results Save CTA (Option B)

Move the save decision to after results are displayed. Remove the pre-submit checkbox. Add a save CTA in the results area.

### Phase 2: localStorage Recall (Option D)

Persist the last calculation to localStorage. On return visits, offer to restore it.

### Phase 3: URL Awareness (Option E enhancement)

Make the shareable URL more prominent. Add "Bookmark this page" copy near the URL bar.

---

## 4. Requirements

### Must Have (Phase 1)

- **M1.** Remove the "Save this round" checkbox from `RoundInputForm`.
- **M2.** Add a "Save This Round" CTA button in the results section, below the share actions.
- **M3.** The CTA triggers the same Turnstile-verified anonymous save flow that exists today.
- **M4.** After save, show the existing success confirmation + claim CTA (unchanged).
- **M5.** Authenticated users skip Turnstile and save directly to their account (unchanged behavior, but triggered from the new location).
- **M6.** Track `post_results_save_cta_viewed` and `post_results_save_cta_clicked` analytics events.
- **M7.** The save CTA disappears after a successful save (replaced by the existing success state).

### Should Have (Phase 1)

- **S1.** The CTA includes persuasive copy: "Save this round to track your progress over time."
- **S2.** The CTA visually stands out from the share actions (different color/weight, not just another button in the row).
- **S3.** If the round was already saved (duplicate detection), show "Already saved" instead of the CTA.

### Must Have (Phase 2)

- **M8.** On calculation completion, persist `{ input: RoundInput, result: StrokesGainedResult, timestamp: ISO string }` to `localStorage` under key `gdv:last-round`.
- **M9.** On the strokes-gained page load (no `?d=` param, no `initialInput`), check for `gdv:last-round`. If present and < 30 days old, show a "Resume your last round" banner above the form.
- **M10.** The banner shows course name, score, date, and a "View Results" button.
- **M11.** Clicking "View Results" hydrates the form + results from the stored data (same as `?d=` rehydration).
- **M12.** The banner has a dismiss/clear button that removes the localStorage entry.

### Should Have (Phase 2)

- **S4.** Track `local_round_restored` analytics event when a user clicks "View Results" from the banner.
- **S5.** The banner does not appear if the user is arriving from history (`from=history`).

### Could Have (Phase 3)

- **C1.** After results render, show a subtle "Bookmark this page to return to these results anytime" note near the URL/share section.
- **C2.** Store multiple rounds in localStorage (last 5), with a simple list UI on the landing page.

### Will Not Build

- **W1.** Auto-save without explicit user action (privacy/abuse concerns).
- **W2.** Email capture or email-based return paths (infrastructure overhead).
- **W3.** SMS/push notification return paths.
- **W4.** Server-side localStorage syncing or cross-device persistence.

---

## 5. Technical Approach

### Phase 1: Post-Results Save CTA

#### Files to Modify

| File | Change |
|------|--------|
| `src/app/(tools)/strokes-gained/_components/round-input-form.tsx` | Remove `saveEnabled`, `saveToCloud` checkbox, `onSavePreferenceChange` prop. Simplify form to always submit without save preference. |
| `src/app/(tools)/strokes-gained/_components/strokes-gained-client.tsx` | Remove pre-submit save logic from `handleFormSubmit`. Add new `PostResultsSaveCta` component rendered inside the results section. Move Turnstile widget rendering to be conditional on CTA interaction. |
| `src/lib/analytics/events.ts` | Add `post_results_save_cta_viewed` and `post_results_save_cta_clicked` event types. |
| `src/app/(tools)/strokes-gained/_components/post-results-save-cta.tsx` | New component (see spec below). |

#### Component: `PostResultsSaveCta`

```
Props:
  input: RoundInput              -- the round data to save
  saveEnabled: boolean           -- whether save infra is configured
  turnstileSiteKey: string|null  -- for Turnstile verification
  isAuthenticated: boolean       -- skip Turnstile for logged-in users
  onSaveComplete: (result: SaveRoundResult) => void  -- callback to parent

State:
  phase: 'idle' | 'verifying' | 'saving' | 'success' | 'error'
  errorInfo: { type, message } | null

Render:
  phase=idle    -> CTA button + persuasion copy
  phase=verifying -> "Verifying..." spinner
  phase=saving  -> "Saving..." spinner
  phase=success -> (parent handles this via onSaveComplete callback)
  phase=error   -> error message + retry button
```

#### Flow Diagram

```
User submits form
  -> Calculate SG (unchanged)
  -> Render results (unchanged)
  -> Render PostResultsSaveCta below share actions
     -> User taps "Save This Round"
        -> If authenticated: call saveRound() directly
        -> If anonymous: render invisible Turnstile, execute, then saveRound()
     -> On success: parent sets savedRoundId, shows success + claim CTA (existing UI)
     -> On error: show inline error with retry
```

#### RoundInputForm Simplification

Remove these props from `RoundInputFormProps`:
- `onSavePreferenceChange`
- `isSaving`
- `saveEnabled`
- `isAuthenticated`

Remove from the component:
- `saveToCloud` state
- The checkbox block (lines 483-523 in current code)
- The `saveToCloud` option in `handleFormSubmit`

The `onSubmit` signature simplifies to:
```ts
onSubmit: (data: RoundInput) => void;
```

#### StrokesGainedClient Changes

Remove from `handleFormSubmit`:
- The entire `if (saveEnabled && options?.saveToCloud === true)` block (lines 321-451)
- `setSaveOptInSelected` state and related logic
- `saveOptInSelected` state variable

Add after the share actions section (around line 914):
```tsx
{result && chartData && lastInput && !saveSuccess && saveEnabled && (
  <PostResultsSaveCta
    input={lastInput}
    saveEnabled={saveEnabled}
    turnstileSiteKey={turnstileSiteKey}
    isAuthenticated={!!user}
    onSaveComplete={(res) => {
      if (res.success) {
        setSavedRoundId(res.roundId);
        setSavedRoundOwned(res.isOwned);
        setSaveSuccess(true);
        if (res.claimToken && !res.isOwned) {
          setSavedClaimToken(res.claimToken);
          // localStorage claim persistence (existing logic)
        }
      } else {
        setSaveError({ type: res.code === 'RATE_LIMITED' ? 'rate_limited' : 'runtime', message: res.message });
      }
    }}
  />
)}
```

The existing success/claim/error UI blocks remain unchanged -- they render based on the same state variables (`savedRoundId`, `saveSuccess`, `savedClaimToken`, etc.).

#### Server Action Changes

No changes to `actions.ts`. The `saveRound` server action already handles both authenticated and anonymous saves. The only change is *when* it gets called (post-results instead of on-submit).

#### Turnstile Widget Placement

Currently, the Turnstile widget renders when `saveOptInSelected` is true. Change the condition to render the widget when the CTA component is mounted. The `PostResultsSaveCta` component should manage its own `TurnstileWidget` ref internally, rather than relying on the parent.

This means moving the `TurnstileWidget` and its ref from `StrokesGainedClient` into `PostResultsSaveCta`. The widget renders in invisible mode and executes on CTA click.

### Phase 2: localStorage Recall

#### Files to Modify

| File | Change |
|------|--------|
| `src/app/(tools)/strokes-gained/_components/strokes-gained-client.tsx` | Add localStorage write on calculation. Add localStorage read on mount. Render `LastRoundBanner` when stored round exists. |
| `src/app/(tools)/strokes-gained/_components/last-round-banner.tsx` | New component. |
| `src/lib/analytics/events.ts` | Add `local_round_restored` event type. |

#### localStorage Schema

Key: `gdv:last-round`

```ts
interface StoredRound {
  input: RoundInput;
  result: StrokesGainedResult;
  chartData: RadarChartDatum[];
  timestamp: string; // ISO 8601
}
```

Size estimate: ~2-3 KB per round (well within localStorage limits).

#### Write Trigger

In `handleFormSubmit`, after calculating SG and setting state, write to localStorage:

```ts
try {
  localStorage.setItem('gdv:last-round', JSON.stringify({
    input,
    result: sgResult,
    chartData: radar,
    timestamp: new Date().toISOString(),
  }));
} catch { /* localStorage unavailable or full -- swallow */ }
```

#### Read Trigger

In `StrokesGainedClient`, add a `useEffect` on mount:

```ts
const [storedRound, setStoredRound] = useState<StoredRound | null>(null);

useEffect(() => {
  if (initialInput || from === 'history') return; // Don't show banner for shared links or history
  try {
    const raw = localStorage.getItem('gdv:last-round');
    if (!raw) return;
    const parsed = JSON.parse(raw) as StoredRound;
    const age = Date.now() - new Date(parsed.timestamp).getTime();
    if (age > 30 * 24 * 60 * 60 * 1000) {
      localStorage.removeItem('gdv:last-round');
      return;
    }
    setStoredRound(parsed);
  } catch {
    localStorage.removeItem('gdv:last-round');
  }
}, []);
```

#### LastRoundBanner Component

```
Props:
  courseName: string
  score: number
  date: string
  onRestore: () => void
  onDismiss: () => void

Render:
  Rounded card with course name, score, date.
  "View your last results" primary button.
  "Dismiss" secondary/text button.
```

Placement: above the form wrapper, below the page header. Only shown when `storedRound` is non-null and no results are currently displayed.

#### Restore Action

When "View Results" is clicked:

```ts
function handleRestore() {
  setResult(storedRound.result);
  setChartData(storedRound.chartData);
  setLastInput(storedRound.input);
  setStoredRound(null); // Hide the banner

  // Update URL with shareable param
  const encoded = encodeRound(storedRound.input);
  window.history.replaceState(null, '', `?d=${encoded}`);

  trackEvent('local_round_restored');

  setTimeout(() => {
    resultsRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, 100);
}
```

---

## 6. UI/UX Spec

### Phase 1: Post-Results Save CTA

#### Placement

The CTA renders in the results section, between the share actions and the off-screen share card. Visually, it sits below the "Download PNG" / "Copy Link" buttons:

```
[Results Section]
  Radar Chart
  Results Summary (strengths/weaknesses)
  Trouble Context (if applicable)
  [Download PNG]  [Copy Link]
  "Shared links include your entered round stats..."

  ──────────────────────────────────────────
  ┌─────────────────────────────────────────┐
  │  Want to track your progress?           │
  │                                         │
  │  Save this round and see how your       │
  │  strokes gained changes over time.      │
  │                                         │
  │  [ Save This Round ]                    │
  │                                         │
  │  Free. No account required.             │
  └─────────────────────────────────────────┘
  ──────────────────────────────────────────

  [Existing success/claim UI appears here after save]
```

#### Styling

- Container: `rounded-xl border border-brand-200 bg-brand-50/30 px-5 py-5`
- Heading: `font-display text-base font-semibold text-neutral-950`
- Body copy: `text-sm text-neutral-600`
- Button: `rounded-lg bg-brand-800 px-5 py-2.5 text-sm font-medium text-white` (matches existing primary button style)
- Subtext: `text-xs text-neutral-400`

#### Copy Variants

**Anonymous user (primary audience):**
- Heading: "Want to track your progress?"
- Body: "Save this round and see how your strokes gained changes over time."
- Button: "Save This Round"
- Subtext: "Free. No account required."

**Authenticated user:**
- Heading: "Add to your history"
- Body: "Save this round to your history and track your SG trends."
- Button: "Save to History"
- Subtext: (none -- they already have an account)

#### After Save (Anonymous)

The CTA disappears. In its place, the existing post-save UI appears:

```
  ┌─ success banner ──────────────────────┐
  │  Round saved.                          │
  └────────────────────────────────────────┘

  ┌─ claim CTA ───────────────────────────┐
  │  Keep this round and track what changes│
  │                                        │
  │  Create a free account to keep this    │
  │  round and see your SG trends.         │
  │                                        │
  │  [ Create account ]                    │
  └────────────────────────────────────────┘
```

This is the existing UI -- no changes needed.

#### After Save (Authenticated)

The CTA disappears. The existing authenticated success UI appears:

```
  ┌─ success banner ──────────────────────┐
  │  Round added to your history.          │
  │  View your trends ->                   │
  └────────────────────────────────────────┘
```

### Phase 2: Last Round Banner

#### Placement

Above the form wrapper, below the page header. Only shown on the landing page (no `?d=` param, not from history).

```
[Page Header]
  "Strokes Gained Benchmarker"
  "A proxy strokes gained benchmark..."

  ┌─ last round banner ──────────────────────┐
  │  You have unseen results                  │
  │                                           │
  │  Pebble Beach · 87 · Mar 12, 2026        │
  │                                           │
  │  [ View Results ]          [ Dismiss ]    │
  └───────────────────────────────────────────┘

[Form Wrapper]
  Handicap Index...
```

#### Styling

- Container: `rounded-xl border border-cream-200 bg-cream-50 px-5 py-4 shadow-sm`
- Heading: `text-sm font-semibold text-neutral-900`
- Detail line: `text-sm text-neutral-600`
- Primary button: `rounded-lg bg-brand-800 px-4 py-2 text-sm font-medium text-white`
- Dismiss: `text-sm text-neutral-400 hover:text-neutral-600`

---

## 7. Success Metrics

### Primary (Phase 1)

| Metric | Current | Target | How to Measure |
|--------|---------|--------|----------------|
| Save rate (saves / calculations) | 33% (15/45) | 55%+ | `round_saved` / `calculation_completed` in GA4/Vercel Analytics |
| Post-results CTA click rate | N/A | 40%+ of results viewers | `post_results_save_cta_clicked` / `calculation_completed` |

### Secondary (Phase 2)

| Metric | Current | Target | How to Measure |
|--------|---------|--------|----------------|
| Return visits with localStorage round | 0 | 10%+ of first-time users return | `local_round_restored` event count |
| Account creation rate (after save) | 2% (1/45) | 8%+ | `round_claimed` / `round_saved` |

### Guardrails

| Metric | Threshold | Action |
|--------|-----------|--------|
| Calculation completion rate | No decrease from current | If form simplification causes confusion, revert |
| Turnstile failure rate | < 5% of save attempts | Monitor `round_save_failed` with `error_type: verification` |
| DB write volume | < 2x current | Monitor via Supabase dashboard |

---

## 8. Privacy Considerations

### Phase 1: Post-Results Save CTA

**No change from current privacy posture.** The save is still explicitly user-initiated (they tap "Save This Round"). The only difference is when the decision point occurs (after results vs. before submission). Turnstile verification and rate limiting remain unchanged.

The existing privacy disclosures remain appropriate:
- "Cloudflare Turnstile verifies you're human."
- Links to Cloudflare Privacy Policy and Terms.

For anonymous saves, no PII is collected beyond what the user enters in the form (course name, score, handicap). Anonymous rounds have `user_id = NULL` and are identified only by their UUID + claim token hash.

### Phase 2: localStorage

**No server-side privacy implications.** Data stays entirely on the user's device. Standard localStorage behavior -- cleared when the user clears browser data.

The stored data includes course name, score, handicap index, and SG results. This is the same data visible in the URL via the `?d=` parameter. No new PII surface.

### GDPR Compliance

- **Lawful basis for anonymous saves:** Legitimate interest (user explicitly requested the save).
- **Right to deletion:** Anonymous rounds can be deleted via the round detail page (if claimed) or expire naturally (no user_id, no way to link back).
- **Data minimization:** Only round stats are stored. No device fingerprinting, IP logging (beyond Turnstile verification), or tracking pixels.

---

## 9. Interaction With Existing Systems

### Anonymous Save + Claim Flow

Unchanged. The only difference is that `saveRound()` is called from the results section instead of on form submission. The server action, claim token generation, and claim flow are identical.

### Share Token System

Unchanged. After an authenticated user saves, `createShareToken()` is still called to generate a canonical share URL. The share token is displayed in the share actions section.

### Dedup Protection

Unchanged. The `DUPLICATE_ROUND` detection in `saveRound()` still prevents the same round from being saved twice. If a user saves, navigates away, returns via localStorage, and tries to save again, they will see "Already saved."

### Trust Scoring

Unchanged. `assessRoundTrust()` runs on every save, regardless of when the save is triggered.

### Rate Limiting

Unchanged. The per-IP rate limit protects against abuse regardless of where the save button is placed.

### History Page

Unchanged. The history page still requires authentication. The post-save claim CTA still drives account creation. The only new path is: localStorage recall -> view results -> save -> claim -> history.

### URL State

The `?d=` parameter behavior is unchanged. On calculation, the URL updates with the encoded round. On localStorage restore, the URL also updates with the encoded round (making the page shareable/bookmarkable).

---

## 10. Scope Boundaries

### In Scope

- Removing the pre-submit save checkbox
- Adding a post-results save CTA
- localStorage persistence of last round
- Return-visit banner with restore capability
- Analytics events for new interactions

### Out of Scope

- Changes to the save server action (`saveRound()`)
- Changes to the Turnstile verification flow
- Changes to the claim flow
- Changes to the history page
- Changes to the share card or PNG download
- Email capture or email-based return paths
- Multiple rounds in localStorage (Phase 3 / Could Have)
- Changes to the round detail page
- Changes to RLS policies or DB schema
- Changes to rate limiting or trust scoring

---

## 11. Migration Notes

### Removing the Checkbox

The pre-submit save checkbox (`saveToCloud` state in `RoundInputForm`) is removed entirely. There is no "migration" -- the checkbox simply stops rendering. Users who had learned to check the box will now see the save CTA after results instead. This is a strict UX improvement: they see value before being asked to save.

### Backward Compatibility

The `RoundInputForm` `onSubmit` prop signature changes from:
```ts
onSubmit: (data: RoundInput, options?: { saveToCloud: boolean }) => void
```
to:
```ts
onSubmit: (data: RoundInput) => void
```

This is a breaking change for the component interface but all callers are internal. The only consumer is `StrokesGainedClient`.

### Rollback Plan

If the post-results CTA underperforms (save rate drops below 33%), restore the pre-submit checkbox. The server action is unchanged, so rollback is a pure UI revert.

---

## 12. Implementation Sequence

### Phase 1 (Target: single build session)

1. Create `PostResultsSaveCta` component with Turnstile management
2. Add analytics events to `events.ts`
3. Modify `StrokesGainedClient` to render `PostResultsSaveCta` in results section
4. Remove save-related props and checkbox from `RoundInputForm`
5. Clean up removed state variables from `StrokesGainedClient`
6. Test: submit a round, verify CTA appears, save works, claim CTA appears
7. Test: authenticated user submits, verify direct save + history link

### Phase 2 (Target: single build session)

1. Add localStorage write in `handleFormSubmit`
2. Add localStorage read in `useEffect` on mount
3. Create `LastRoundBanner` component
4. Add restore logic to hydrate form + results from stored round
5. Add analytics event for `local_round_restored`
6. Test: submit round, close tab, reopen, verify banner appears, restore works
7. Test: banner does not appear with `?d=` param or `from=history`
8. Test: banner dismiss clears localStorage
9. Test: stored round older than 30 days is auto-cleared

### Phase 3 (Optional, defer)

1. Add "Bookmark this page" copy near share actions
2. Evaluate multi-round localStorage if Phase 2 shows traction

---

## 13. Open Questions

1. **Should the save CTA auto-dismiss after some time?** Current recommendation: no -- let it persist until the user acts or navigates away. Unlike the anonymous success banner (3s auto-dismiss), the CTA should remain visible.

2. **Should we pre-render the Turnstile widget before the user clicks?** Current recommendation: yes -- render the invisible widget when `PostResultsSaveCta` mounts, so verification is near-instant on click. This matches the current behavior where Turnstile renders when the checkbox is checked.

3. **Should localStorage restoration skip the form and jump straight to results?** Current recommendation: show both -- hydrate the form with the stored values AND show results. This lets the user verify the data is correct and re-submit if they want to change something.
