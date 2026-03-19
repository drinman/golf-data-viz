# Tiered Referral Rewards

**Status**: Spec
**Author**: Product
**Date**: 2026-03-17
**Phase**: 2 (Multi-Tool + Distribution)
**Priority**: 10

---

## 1. Problem Statement

GolfDataViz has sharing features (copy link, download PNG, receipt format) but no incentive structure to drive repeated sharing. The current share rate is ~2%. Users who share once have no reason to share again. There is no reward loop and no progression mechanic.

### Research Basis

- Morning Brew grew from 100K to 4.5M subscribers with 80% from referrals, using tiered digital rewards that cost nothing to produce.
- v2 plan targets K=0.05-0.10 viral coefficient. Even modest referral incentives can push toward the upper bound.
- Key constraint: rewards must have zero marginal cost. GolfDataViz is a free tool — physical rewards or credit-based systems are not viable.
- Digital unlock tiers create progression and scarcity without any inventory cost.

### User Stories

**As a golfer who just shared my results**, I want to see that my share counted toward unlocking something so I feel rewarded and motivated to share again.

**As a golfer who has shared 3 times**, I want to unlock custom color themes for my share cards so they look unique compared to everyone else's.

**As a golfer who sees a friend's share card**, I want to know how to unlock the same customization so I am motivated to use the tool and share my own results.

---

## 2. Requirements

### Must Have (MVP)

- [ ] **M1**: Track share actions per user (copy link + download PNG + download receipt = share events)
- [ ] **M2**: Three reward tiers with digital unlocks:
  - **Tier 1 (1 share)**: Unlock the round receipt share format
  - **Tier 2 (3 shares)**: Unlock custom color themes for share cards (3-4 theme options)
  - **Tier 3 (5 shares)**: Unlock archetype analysis ("Your Golf DNA" secondary result)
- [ ] **M3**: Referral CTA on every results page: "Share to unlock [next tier reward]"
- [ ] **M4**: Progress indicator showing current tier and shares needed for next tier
- [ ] **M5**: Unlock state persists across sessions (requires account or localStorage fallback)
- [ ] **M6**: Unlocked features are immediately usable after the qualifying share action

### Should Have

- [ ] **S1**: Celebration moment when a tier is unlocked (confetti animation or highlight card)
- [ ] **S2**: Tier badges visible on share cards ("Shared by a Golf Data Viz Champion" at Tier 3)
- [ ] **S3**: Referral link tracking — attribute new users back to the referrer
- [ ] **S4**: Dashboard showing referral stats (shares, clicks, new users attributed)

### Won't Have

- **W1**: Monetary rewards or credits
- **W2**: Physical merchandise
- **W3**: Leaderboard of top referrers (privacy concern — vanity handicap culture)
- **W4**: Penalizing users who don't share (no feature removal)
- **W5**: Requiring account creation to participate (localStorage tracks shares for anonymous users, Supabase persists for logged-in users)

---

## 3. Technical Approach

### Share Tracking

**For authenticated users**: Store share count in Supabase.

New column on the `profiles` table (or a dedicated `referral_stats` table):
```sql
ALTER TABLE profiles
  ADD COLUMN share_count integer NOT NULL DEFAULT 0,
  ADD COLUMN referral_tier integer NOT NULL DEFAULT 0,
  ADD COLUMN tier_unlocked_at timestamptz[];
```

Increment `share_count` on each share event via an API route. The existing `copy_link_clicked` and `download_png_clicked` analytics events already fire — hook into these to also increment the server-side counter.

**For anonymous users**: Store share count in localStorage:
```typescript
interface LocalReferralState {
  shareCount: number;
  unlockedTiers: number[]; // [1] or [1, 2] or [1, 2, 3]
  lastShareAt: string;
}
```

When an anonymous user creates an account, merge their localStorage share count into their Supabase profile (same claim pattern used for anonymous round claiming).

### Tier Logic

Pure function in `src/lib/golf/referral-tiers.ts`:

```typescript
export type ReferralTier = 0 | 1 | 2 | 3;

export interface TierStatus {
  currentTier: ReferralTier;
  shareCount: number;
  nextTierAt: number | null; // shares needed for next tier, null if maxed
  nextTierReward: string | null;
  unlockedFeatures: string[];
}

export function getTierStatus(shareCount: number): TierStatus;
```

Tier thresholds:
```typescript
const TIER_THRESHOLDS = [
  { tier: 1, sharesRequired: 1, reward: "receipt_format", label: "Round Receipt" },
  { tier: 2, sharesRequired: 3, reward: "color_themes", label: "Custom Themes" },
  { tier: 3, sharesRequired: 5, reward: "archetype_analysis", label: "Golf DNA Analysis" },
] as const;
```

### Feature Gating

Each tier-locked feature checks the user's tier status before rendering:

**Tier 1 — Receipt format**:
- The "Download Receipt" button is visible but shows a lock icon and "Share once to unlock" tooltip for users at Tier 0.
- After first share action, the button becomes active.

**Tier 2 — Color themes**:
- A theme picker appears on the results page (below share buttons) for Tier 2+ users.
- Themes apply to both the spider chart share card and the receipt.
- Theme options: Default (brand green), Ocean (blue), Sunset (orange), Night (dark/purple).
- Theme selection persists in localStorage/profile.

**Tier 3 — Archetype analysis**:
- After the results summary, an "Archetype" card appears for Tier 3+ users.
- Shows the user's "Golf DNA Archetype" based on their SG pattern (e.g., "The Ball Striker" for high approach SG, "The Scrambler" for high ATG SG).
- This is a fun, secondary label — not the primary result (per v2 plan: archetypes are dessert, not the main course).

### Share Attribution

To track referral conversions (not just shares), add UTM params to all share links:

```
golfdataviz.com/strokes-gained?d={encoded}&utm_source=share&utm_medium=referral&ref={userId}
```

The `ref` parameter maps back to the sharer. When a new user arrives via a referral link and completes their own calculation, increment the referrer's share count by a bonus point (or track separately as `referral_conversions`).

---

## 4. UI/UX Spec

### Referral CTA on Results Page

Placed below the share buttons:

```
┌──────────────────────────────────────────────┐
│  🔓 Share to unlock rewards                  │
│                                              │
│  [■■□□□] 2 of 5 shares                      │
│                                              │
│  Next unlock: Custom color themes (1 more    │
│  share needed)                               │
│                                              │
│  Tier 1 ✓ Receipt format                     │
│  Tier 2 ○ Custom themes (3 shares)           │
│  Tier 3 ○ Golf DNA Analysis (5 shares)       │
└──────────────────────────────────────────────┘
```

- Progress bar: 5-segment bar, filled segments for completed shares
- Completed tiers: green checkmark
- Next tier: highlighted with "X more shares needed"
- Styling: `rounded-xl border border-cream-200 bg-cream-50 p-5`

### Unlock Celebration

When a tier is unlocked:
- The progress bar animates to fill the new segment
- A brief card slides in: "You unlocked [reward]! Try it now."
- The newly unlocked feature pulses briefly to draw attention

### Locked Feature Indicator

For locked features (e.g., receipt button before Tier 1):
- Button appears with reduced opacity (0.5)
- Lock icon overlay
- Tooltip on hover/tap: "Share your results once to unlock this format"
- Clicking the locked button shows a brief toast: "Share your results to unlock this feature"

---

## 5. Success Metrics

| Metric | Baseline | Target (30 days) | How to Measure |
|--------|----------|-------------------|----------------|
| Users who trigger Tier 1 (1+ shares) | ~2% share rate | >10% of calculators | GA4 + Supabase |
| Users who reach Tier 2 (3+ shares) | N/A | >3% of calculators | GA4 + Supabase |
| Users who reach Tier 3 (5+ shares) | N/A | >1% of calculators | GA4 + Supabase |
| Share rate increase | ~2% | >8% | GA4 event ratio |
| Referral attribution (new users via ref links) | 0 | Any | UTM tracking |

### Analytics Events to Add

```typescript
| "referral_tier_unlocked"     // User unlocked a new tier
| "referral_progress_viewed"   // User saw the referral CTA
| "locked_feature_attempted"   // User clicked a locked feature
| "theme_selected"             // User selected a color theme
| "archetype_viewed"           // User saw their archetype result
```

---

## 6. Kill Criteria

| Signal | Kill If |
|--------|---------|
| Tier 1 trigger rate | <5% of users trigger Tier 1 after 30 days |
| Share rate does not increase | Share rate stays below 5% with referral CTA active |
| Users find tiers annoying | Qualitative feedback indicates gating feels punitive |

---

## 7. Implementation Plan

### File Changes

**New files**:
1. `src/lib/golf/referral-tiers.ts` — tier logic (pure functions)
2. `src/app/(tools)/strokes-gained/_components/referral-progress.tsx` — progress CTA component
3. `src/app/(tools)/strokes-gained/_components/theme-picker.tsx` — color theme selector (Tier 2)
4. `src/app/(tools)/strokes-gained/_components/archetype-card.tsx` — archetype display (Tier 3)
5. `src/hooks/use-referral-tier.ts` — hook managing tier state (localStorage + Supabase sync)

**Modified files**:
6. `src/app/(tools)/strokes-gained/_components/strokes-gained-client.tsx` — integrate referral progress, theme picker, archetype
7. `src/lib/analytics/events.ts` — add referral events
8. `src/app/(tools)/strokes-gained/_components/share-card.tsx` — apply theme colors

**Database**:
9. Migration: add `share_count`, `referral_tier` columns to profiles table

### Implementation Steps

1. Build `referral-tiers.ts` with tier logic and unit tests
2. Build the `use-referral-tier` hook (localStorage read/write, Supabase sync for auth users)
3. Build the referral progress component
4. Gate the receipt format behind Tier 1
5. Build the theme picker and apply themes to share card rendering
6. Build the archetype card (Tier 3) — use SG pattern matching to assign archetypes
7. Add share count increment on copy link / download PNG / download receipt actions
8. Add analytics events
9. Database migration for authenticated user persistence
10. Test the full flow: share → count increment → tier unlock → feature access

### Archetype Definitions (Tier 3)

Simple pattern matching on SG categories:

| Archetype | Condition |
|-----------|-----------|
| The Ball Striker | Highest SG in Approach, positive |
| The Bomber | Highest SG in Off the Tee, positive |
| The Scrambler | Highest SG in Around the Green, positive |
| The Closer | Highest SG in Putting, positive |
| The Complete Player | All categories positive |
| The Work in Progress | All categories negative |

---

## 8. Open Questions

1. **Share verification**: How do we verify a share actually happened vs. just clicking "Copy Link"? **Recommendation**: Don't verify — count the copy/download action as the share. Verification (checking if a link was actually sent) is technically infeasible for clipboard and PNG actions. The user completed the sharing intent.

2. **Tier reset**: Should tiers reset per-period (monthly) or be permanent? **Recommendation**: Permanent. Resetting tiers would feel punitive and discourage the retention loop.

3. **Receipt gating controversy**: Gating the receipt format behind Tier 1 means new users see a locked feature on first use. This could feel restrictive. **Recommendation**: The first share is trivially easy (one click). Showing a locked feature creates curiosity and motivation. Monitor qualitative feedback — if users report it feels punitive, move receipt to free and replace Tier 1 with a different unlock.
