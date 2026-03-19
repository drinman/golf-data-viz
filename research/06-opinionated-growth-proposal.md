# 06. Opinionated Growth Proposal

Date: 2026-03-17

## Thesis

**Golf Data Viz should stop behaving like a private strokes gained calculator and become the public post-round artifact for amateur golfers: score-first, peer-benchmarked, target-aware, coach-forward, and designed to travel through search, group chats, and lessons.**

## Why the current funnel is not compounding

The app does not have a surface-area problem. It has a growth-object problem.

As of March 10-16, 2026:
- people are arriving
- many are reaching results
- almost all traffic is still direct
- organic discovery is negligible
- GA4 is not exposing a readable activation/share/return funnel

The product already includes sample data, AI narrative, improved sharing, history, saved-round sharing, and lesson prep. Those are useful features. But they do not yet orbit a single public artifact or repeat-use ritual strong enough to compound.

The current output still behaves like "my private result page." The market opportunity is bigger than that.

## What the market is still missing

The golf market has:
- hardware-first truth machines
- broad social golf apps
- deeper coach platforms
- serious SG products

What it still does not really have is:
- a low-friction scorecard-native artifact that feels shareable enough for buddies and useful enough for coaches
- a public amateur round layer that creates discovery instead of hiding inside accounts
- a target-handicap operating system that turns one round into an ongoing chase

The gap is not another dashboard. The gap is a product that makes a golfer feel seen quickly, tells them one sharp thing, and turns that into a portable object.

## Cross-cutting patterns from the best implementations

Across golf, fitness, gaming, and recap products, the strongest patterns are consistent:

1. **Compression beats depth.**
   Clippd, Chess.com Game Review, and good coaching tools win because they reduce complexity into a fast read.

2. **Identity travels better than raw stats.**
   Wrapped, Strava, and other adjacent products succeed when the output says something about the user, not only about the numbers.

3. **Channel-native artifacts outperform exported reports.**
   Story overlays, text-ready summaries, read-only links, and compare pages move farther than dense cards.

4. **Recurring rituals beat one-off novelty.**
   Weekly plans, monthly recaps, streaks, and target-progress loops pull users back more reliably than a static archive.

5. **Coach workflows reward lightweight artifacts.**
   The winning coach pattern is not a dashboard first. It is a short artifact that saves time before the lesson.

## What nobody in golf appears to own yet

The bold opportunity is this:

**An opt-in public library of amateur rounds and target-handicap comparisons that turns every shared round into both a story object and a discovery surface.**

In practice, that means:
- a golfer posts or texts a score-first round artifact
- the recipient can compare their own scorecard against it or against that target handicap band
- the page is indexable and useful on its own
- coaches can consume the same artifact in under two minutes

That is different from:
- a private calculator
- a hardware dashboard
- a golf social feed
- a coach CRM

## What AI Changes

AI has collapsed build cost. A product bet that once took a week can now take an hour.

That changes the decision framework:
- feasibility matters less
- differentiation matters more
- clean instrumentation matters more
- kill criteria matter more

The failure mode now is not "we cannot build it." The failure mode is "we can build too many cheap things and learn nothing." Golf Data Viz should therefore run sharper, smaller, instrumented bets and judge them harshly.

## Build / Defer / Stop

### Build

1. **Public round artifact system**
   Expand shared rounds from export endpoints into deliberate acquisition surfaces with compare prompts, audience-specific variants, and better recipient conversion.

2. **Target-handicap operating system**
   Let users pick a target such as break 90, 12 handicap, or single digits, then frame results, trends, and pages around the gap to that target.

3. **Coach-forward handoff**
   Add a lightweight "Send to Coach" mode built on read-only links and a two-minute artifact, not a coach platform.

### Defer

1. Hardware imports and parity features
2. Full coach dashboards or CRM workflows
3. Broad community feed or tournament-style social graph
4. Deeper SG-detail features that do not improve the share or return loop

### Stop

1. Treating homepage polish as the main growth answer
2. Shipping more premium surfaces before the free loop is measurable
3. Expanding analytics event count without making the funnel readable

## 90-Day Roadmap

### Product bets

#### Bet 1: Public round artifacts

Ship:
- score-first shared round pages with audience variants: buddy, coach, self
- compare-your-round CTA on public round pages
- text-ready share summaries next to image and link sharing
- optional course-photo or story-overlay variant

Why:
- this is the shortest path from existing product to a compounding public object

Fast test:
- ship the improved public artifact and recipient CTA in days, not weeks

Success signal:
- share initiation rate above `15%` of `calculation_completed`
- recipient-to-own-calculation conversion above `8%`

Kill criterion:
- if after `200` activated calculations the share initiation rate is still below `12%` and recipient conversion is below `5%`, stop treating the current artifact form as the center of the strategy and redesign it aggressively

#### Bet 2: Target-handicap operating system

Ship:
- target-handicap selector
- target-gap summary on results and history
- public benchmark pages for "break 100 / 90 / 80" and key handicap bands
- simple weekly recap for target progress

Why:
- target intent is stronger search material and stronger repeat-use framing than generic SG explanation

Fast test:
- launch 10-20 programmatic target pages and a lightweight target selector in the app

Success signal:
- target selector usage above `25%` of activated users
- 7-day return rate above `12%` among exposed users
- non-brand search clicks begin appearing within `45` days

Kill criterion:
- if target selection is ignored and exposed users do not beat baseline return by at least `3` percentage points, demote this from core product frame to secondary SEO/supporting content

#### Bet 3: Coach-forward handoff

Ship:
- "Send to Coach" artifact generated from 1 round or 3-5 saved rounds
- coach-mode layout with one focus area, one strength, and recent trend
- stable read-only link with no coach account required

Why:
- this is the cleanest B2B2C amplifier already adjacent to the current lesson-prep direction

Fast test:
- launch a manual or lightweight coach-mode share path from saved rounds/history

Success signal:
- coach-mode generation on at least `10%` of saved-round sessions
- recipient open rate above `30%`

Kill criterion:
- if coach-mode usage remains below `5%` of eligible users after one iteration and no repeat opens appear, keep it as a niche premium utility rather than a growth engine

### Distribution bets

#### Distribution bet 1: Benchmark-intent SEO

Ship:
- handicap-band benchmark pages
- target-score pages
- public same-course/same-band comparison pages where privacy allows

Success signal:
- pages indexed within `30` days
- first non-brand clicks within `45` days

Kill criterion:
- if indexing fails or pages receive no impressions/clicks after reasonable crawl time, narrow the query set and simplify templates instead of scaling content volume

#### Distribution bet 2: Creator scorecard formats

Ship:
- "submit your scorecard" creator format
- public creator-specific compare pages
- one reusable overlay asset pack for story/video use

Success signal:
- at least `5` creator or instructor uses produce non-direct visits or shared-round opens

Kill criterion:
- if creator activity only generates awareness with no artifact opens or recipient conversions, stop investing in generic creator outreach

#### Distribution bet 3: Coach-send student loop

Ship:
- coach-specific entry link
- prefilled language and share artifact coaches can send to students

Success signal:
- at least `3` coaches or instructors reuse the loop with multiple students

Kill criterion:
- if usage stays one-off and no repeated send behavior appears, keep it as a support channel, not a main growth loop

### Instrumentation fixes

#### Fix 1: Make the funnel readable

Set GA4 key events and primary dashboard around:
- `landing_cta_clicked`
- `sample_data_tried`
- `form_started`
- `calculation_completed`
- `copy_link_clicked`
- `download_png_clicked`
- `narrative_copied`
- `shared_round_viewed`
- `round_saved`
- `history_page_viewed`

#### Fix 2: Add public artifact attribution

Track:
- source page type: homepage, tool, public round, target page, coach link
- recipient conversion path from `shared_round_viewed` to fresh `calculation_completed`
- audience mode used on public artifacts

#### Fix 3: Run an experiment scorecard

Every bet should have:
- launch date
- exposed population
- primary metric
- secondary metric
- kill threshold

Do not let a feature survive because it was easy to build.

## Funnel definitions

- **Acquisition:** `first_visit` or first session landing on `/`, `/strokes-gained`, or a public round/target page
- **Activation:** `calculation_completed / first_visit`
- **Share initiation:** (`copy_link_clicked + download_png_clicked + narrative_copied + future coach_send`) / `calculation_completed`
- **Public artifact consumption:** `shared_round_viewed / share initiations`
- **Recipient conversion:** fresh `calculation_completed` after viewing a public/shared page / `shared_round_viewed`
- **Save rate:** `round_saved / calculation_completed`
- **Return rate:** second `calculation_completed`, `history_page_viewed`, or `local_round_restored` within 7 days / activated users

## The one recommendation

If Golf Data Viz does only one strategic thing, it should be this:

**Own the public amateur round.**

That means every future decision should be judged by whether it makes the round more:
- legible
- shareable
- comparable
- coach-usable
- repeatable

Not by whether it adds another internal feature.
