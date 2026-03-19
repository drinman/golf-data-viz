# Coach Workflows

Date: 2026-03-17

## What exists now

The market offers three broad ways to connect player data to coaching:

| Model | Representative products | Core behavior |
| --- | --- | --- |
| Connected coach dashboards | Arccos Professional Dashboard, Shot Scope Academy, Clippd coaches | Coach gets ongoing access to player data inside a platform |
| Coaching workflow platforms | Skillest, CoachNow, V1 Coach | Coach manages communication, video, scheduling, assignments, and client continuity |
| Player-pushed artifacts | screenshots, texts, PDFs, exported links, lesson prep reports | Player sends something when they want help |

Golf Data Viz already has the skeleton of the third model:

- the free benchmarker result
- saved-round public share pages
- lesson prep reports
- AI narrative
- score-first share framing

That matters because the research consistently points to a simple truth:
**coaches want clarity fast, and players want to decide when to send it.**

## What’s actually working

### 1. Coaches adopt tools that reduce pre-lesson time

The strongest coach products do not win because they offer every metric. They
win because they reduce the 5-15 minute pre-lesson review burden.

Arccos and Shot Scope win by giving a coach a dashboard that is already
connected to real rounds. Clippd wins by ranking the issues and translating data
into a usable next step.

For Golf Data Viz, the important pattern is not the dashboard itself. The
important pattern is the coach being able to glance at something and know:

- where the player loses strokes
- whether it is getting better or worse
- what the one main priority should be

### 2. Player-pushed sharing fits the relationship better than surveillance

The local premium strategy doc is directionally right: golfers are more willing
to push a report to a coach than to give a coach persistent pull access to every
round. That preserves autonomy and avoids making the product feel like a
surveillance layer.

This is where Golf Data Viz has room:

- player finishes round
- gets a strong artifact
- taps "send to coach"
- coach sees a read-only page or report without adopting a whole platform

### 3. Ranked priorities beat dense dashboards

Clippd's best move is turning data into "What To Work On." This is the key coach
pattern as well. Coaches do not need another visualization if it still leaves
them deciding where to focus.

For Golf Data Viz, the implication is clear: the artifact should not stop at
"here is your SG shape." It should say, in coach-safe language, what looks most
important and how confident the product is.

### 4. Coaches pay for workflow, not just numbers

Skillest, CoachNow, and V1 all show that once a product goes deeper into the
coach side, it starts competing in messaging, templates, scheduling, video,
read receipts, and athlete management. That is a different business from a
post-round public artifact business.

This is useful because it defines the boundary. Golf Data Viz should exploit the
coach handoff moment, not become a coaching OS too early.

### 5. Free coach-facing surfaces can be acquisition channels

Shot Scope Academy and Arccos Professional Dashboard both use coaches as a force
multiplier. A coach who likes the product can steer many players toward it.

That suggests an important wedge for Golf Data Viz:

- make the coach artifact free enough to spread
- monetize deeper follow-up or history later

## What’s been tried and why it stalls

### 1. Full coach platforms create heavy adoption friction

CoachNow and V1 are powerful, but they require behavioral change from coaches.
That can work if the coach is already committed to a platform. It is weak as the
first wedge for a new product.

### 2. Persistent dashboards can feel like too much for casual coaching

Connected dashboards are powerful, but they assume:

- a player is already in the ecosystem
- the coach wants another tool open
- the relationship justifies continuous access

For many everyday golfers, that is too much overhead for the value exchange.

### 3. AI "coaching" language can backfire

The local docs are correct to avoid presenting Golf Data Viz as a coach
replacement. Coaches do not want to be displaced, and players do not trust a
scorecard-level product to replace instruction.

The right posture is "lesson prep" and "performance context," not "do this drill."

### 4. Data-rich reports often stop short of a real send loop

Many products can produce a report. Fewer make the send moment first-class.
That is where Golf Data Viz should push further.

## Patterns worth stealing

- A 90-second, coach-readable artifact with one main priority
- Player-initiated send rather than coach surveillance
- Read-only public or semi-public pages that require no login to consume
- Confidence signaling so the coach knows what to trust
- Coach-friendly summary framing: trend, strength, weakness, next focus
- Coach referral mechanics after the artifact works

## Anti-patterns to avoid

- Building a coach CRM, scheduler, or video platform
- Forcing both sides to adopt accounts before the artifact is useful
- Generating AI coaching advice that competes with the instructor
- Making the coach view more complicated than the player result
- Treating premium coach features as the main acquisition path before the
  artifact loop works

## Ideas this unlocks for Golf Data Viz

- A "Send to Coach" mode on the main public round artifact
- A free coach-readable artifact from a single round, with premium multi-round
  history as the upsell
- Coach-specific summary blocks layered onto the artifact:
  - main issue
  - trend status
  - confidence caveat
  - target-handicap gap
- Instructor landing pages or referral kits that turn coaches into a top-of-funnel amplifier
- A light comment/request loop later, without committing to a full coach platform

## Source links

- Local strategy context
  - `docs/premium-strategy.md`
  - `src/app/(tools)/strokes-gained/lesson-prep/_components/lesson-prep-builder.tsx`
  - `src/app/(tools)/strokes-gained/lesson-prep/_components/lesson-report-view.tsx`
- [Arccos Professional Dashboard](https://eu.arccosgolf.com/pages/professional-dashboard)
- [Shot Scope Academy](https://shotscope.com/eu/academy/)
- [Clippd coaches](https://clippd.com/coaches)
- [Clippd pricing](https://www.clippd.com/pricing)
- [Skillest](https://skillest.com/)
- [Arccos x Skillest](https://www.arccosgolf.com/blogs/community/skillest-partners-with-arccos-to-revolutionize-coaching)
- [CoachNow pricing](https://coachnow.io/pricing/)
- [V1 Coach scheduling](https://www.v1sports.com/the-new-booking-scheduling-feature-in-v1-coach/)

## Raw findings

- Coaches value speed and clarity more than metric volume.
- Player-pushed sharing is a better fit than always-on coach access for this segment.
- The coach opportunity is real, but the platform opportunity is farther away than the artifact opportunity.

## Implications for Golf Data Viz

- The right near-term coach bet is a sendable artifact, not a coach dashboard.
- Coach-facing value can amplify growth without becoming the product center.
- The public round artifact should have a coach-readable mode from day one.

## Ideas worth stealing

- ranked priority framing
- coach-readable summary blocks
- low-friction coach referral pathways

## Ideas to reject

- full coach CRM
- AI coach replacement language
- login-gated coach consumption as the default
