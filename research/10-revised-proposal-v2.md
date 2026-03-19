# Revised Growth Proposal (v2)

Date: 2026-03-17

> v2 changes from Round 2 challenge research are marked with [CHANGED] and
> explained inline.

## Context: where you are right now

The numbers tell a story. 105 active users, 73 visitors, 355 page views in
7 days -- up from basically zero. That is real. But the shape of the curve
matters more than the number: spiked on Mar 11, decayed through Mar 13, then
partially recovered Mar 15-16. Classic launch bump pattern. The question is
not "is there interest?" (there is) -- it is "how do you make the curve go up
and to the right instead of back to baseline?"

What the funnel reveals:

- 65 visitors hit `/` then 17 reach `/strokes-gained` (26% CTR from landing).
- 68 form_starts then 105 results_emphasis_impressions (sample data + shared
  links generating results views beyond form submissions).
- 134 of 151 sessions are Direct traffic -- virtually zero organic search.
- 58% bounce rate trending up (+15%) -- people land, look, leave.
- Referrers are nearly empty (vercel.com: 2, surfwax.com: 1, twicsy.com: 1).

The blunt diagnosis: you built something people want, but you have no
acquisition engine. Direct traffic means you sharing it plus people who
already know about it. No SEO. No community presence. No referral loop
proving itself yet. The sharing features just shipped, so the viral loop has
not had time to compound. You are pre-flywheel.

The build cost insight changes everything. If a feature that would have taken
a week now takes an hour, the strategic question flips from "what ONE thing
should we build?" to "what COMBINATION of things creates escape velocity?"
You can afford to experiment aggressively.

## What Round 2 challenge research changed

Six assumptions from Round 1 faced serious counter-evidence. Here is what
shifted and why.

### [CHANGED] 1. Archetypes demoted -- lead with hard data, not personality labels

Round 1 said: "Golf DNA Archetypes" (The Short Game Wizard, The Approach
Sniper) should be the headline share hook.

Round 2 found: Spotify Wrapped 2024 did this exact thing -- replaced concrete
stats with AI-generated personality labels. Brand sentiment dropped 9 points.
Negative sentiment nearly doubled. Users wanted real data, not gimmicky
labels. Spotify explicitly reversed course in 2025, with their creative
director saying "we did the opposite" of the AI/personality approach. Golf
Data Viz has zero brand equity to absorb this kind of backlash.

New position: lead with peer percentiles and concrete stats ("Your putting is
better than 82% of 14-handicappers"). Archetypes can exist as a secondary,
optional, fun layer but never the headline. The credibility of the tool
depends on being taken seriously.

### [CHANGED] 2. SEO elevated to co-primary growth channel

Round 1 said: sharing is the primary growth mechanism. SEO was Phase 2.

Round 2 found: OmniCalculator grew to 17.35M monthly visits through pure SEO
with no viral loops. TDEECalculator gets 1M+ monthly visitors from a single
page. For calculator/utility tools, SEO consistently outperforms virality for
sustained growth. Meanwhile, realistic K-factors for niche utility tools are
0.05-0.15, not the 0.3 targeted.

New position: SEO and sharing are co-equal growth channels from day one.
Every benchmark page is a landing page. The multi-tool strategy directly
serves this.

### [CHANGED] 3. Realistic K-factor: 0.05-0.15, not 0.3

Round 1 said: target K = 0.3 viral coefficient.

Round 2 found: K = 0.3 would place Golf Data Viz in the top tier of ALL
consumer internet products. Square's K-factor was 0.01 and it still
succeeded. B2B SaaS average is 0.20. For a niche golf utility, 0.05-0.15 is
realistic.

New position: plan for K = 0.05-0.10. Sharing is ONE of four growth channels,
not THE strategy. Growth model must not depend on viral math alone.

### [CHANGED] 4. Private-by-default, not public-by-default

Round 1 said: make results pages public, indexable discovery surfaces.

Round 2 found: "Vanity handicap" culture runs deep. Golfers are
ego-protective about their numbers -- the golf world has specific terms for
lying about your handicap ("Hollywood handicap," "vanity handicap"). Strava's
public-by-default caused backlash severe enough to trigger a US Senate
investigation. Making SG weaknesses publicly visible is more intimate than a
single handicap number.

New position: results are private/unlisted by default. Sharing is opt-in and
feels like choosing to show off, not exposing weaknesses. Share cards should
emphasize strengths. This matches how golfers actually share: they screenshot
their BEST rounds.

### [CHANGED] 5. Clippd is the real competitive threat

Round 1 said: barely covered Clippd. Proposed building a "target-handicap
operating system."

Round 2 found: Clippd ($25/mo) already built exactly that -- prioritized
"What To Work On" improvement plans, coach tiers, college team packages. In
March 2025, Clippd became the FIRST company to access Garmin's Golf Premium
API, giving them distribution to every Garmin golf watch owner. Racing to
build what Clippd already has is racing to second place.

New position: do not compete on depth of tracking/coaching. Clippd requires
hardware + $25/mo. Golf Data Viz wins on: free, instant, shareable,
zero-hardware, zero-signup. The shareable visual artifact is what Clippd does
not have and cannot easily add.

### [CHANGED] 6. Multi-tool strategy over single-tool deepening

Round 1 said: deepen the SG Benchmarker with more features (trends, practice
recs, season wrapped).

Round 2 found: a 14-handicap golfer plays 20-30 rounds/year. That is 20-30
uses max. Between rounds, there is no reason to visit. OmniCalculator grew to
17M monthly visits with 3,700+ simple tools. Each tool is a separate SEO
entry point. The retention math does not work for a single tool used
infrequently.

New position: build 3-5 standalone golf tools that each target different
search queries and each produce shareable output. The SG Benchmarker is tool
number 1. Each tool cross-links. Collectively they build domain authority and
create multiple reasons to visit.

## What held up from Round 1

These assumptions survived the challenge round:

- Web-first is correct -- confirmed as competitive advantage vs. Clippd
  (native), Arccos (native), Sportsbox (iOS only).
- No social feed -- GolfLync and similar social golf apps have not gained
  traction.
- Free entry is the wedge -- against $25/mo Clippd and $300/yr Arccos.
- Peer comparison framing -- well-supported by NGF data; Tour content is
  entertainment, data tools are improvement. Add optional Tour comparison
  toggle.
- Coach handoff artifact -- correct but lighter than planned; Clippd owns
  the coach platform.
- Reddit as a launch channel -- viable for 2-3 posts, but NOT a sustained
  growth engine (anti-self-promotion rules, posts get removed).
- Do not build shot-by-shot tracking -- manual round-level input is a
  genuine differentiator.
- Do not build a mobile app -- but DO add PWA capabilities.

## New ideas from Round 2

### The "Round Receipt" share format

Source: Receiptify -- a solo-developer web app that turned Spotify data into
grocery receipt PNGs. Over 1M uses in first months. Ariana Grande shared it.
Zero marketing budget.

Application: generate a "Golf Round Receipt" -- each SG category as a line
item, total at bottom, QR code linking to the tool. Receipt metaphor is
universally readable, perfectly sized for Instagram Stories, and completely
novel in golf. Low effort, proven viral format.

### Embeddable Mini-SG Widget

Source: mortgage calculator playbook (Bankrate, NerdWallet). Each embed
equals a backlink plus user acquisition.

Application: a `<script>` tag that golf blogs embed. Compact form, quick
radar chart, "Get full analysis at GolfDataViz.com" CTA. Target: Practical
Golf, The DIY Golfer, MyGolfSpy, Me And My Golf. Each embed is free
distribution.

### Tiered referral rewards

Source: Morning Brew grew from 100K to 4.5M subscribers with 80% from
referrals. Digital rewards that cost nothing to produce.

Application: share 1 round = unlock receipt format. Share 3 = custom color
themes. Share 5 = unlock archetype analysis. Zero marginal cost, referral CTA
on every results page.

### PWA install

Source: Rakuten 24: 450% retention increase after PWA install. Flipkart: home
screen users equal 60% of visits.

Application: add manifest.json + service worker. Show "Add to Home Screen"
after 2+ submissions. Low effort, outsized retention impact for a weekly-use
tool.

### Untappd-style achievement badges

Source: Untappd: 1 billion badges earned. Badges transform passive use into
active exploration.

Application: "First Round Logged," "Category Killer" (positive SG
everywhere), "Improvement Arc" (3 rounds trending up), "Bracket Buster"
(SG above bracket average). Drives repeat usage.

## The revised thesis

Golf Data Viz should be the free golf analytics website -- a collection of
fast, beautiful, shareable golf tools that golfers find through search, share
through group chats, and return to after every round.

Not a private dashboard. Not a single calculator. A website of tools where
every output is designed to travel.

The growth model has four engines, not one:

1. SEO -- each tool and benchmark page is a landing page (primary).
2. Sharing -- every output is a shareable artifact (primary).
3. Embeds -- widget distribution through golf blogs (secondary).
4. Community -- Reddit + newsletter + creator formats (supplementary).

## The revised phases

### Phase 1: data-first share quality + SEO foundation (weeks 1-3)

Goal: make results worth sharing AND findable.

1. **Peer Percentile Rankings** -- [CHANGED: now leads instead of archetypes]
   For each SG category, show where you rank vs your handicap bracket. "Your
   approach play is better than 82% of 14-handicappers." This is the primary
   share hook -- concrete, credible, conversation-starting.

2. **Round Receipt Format** -- [NEW from Round 2] Alternative share card
   styled as a receipt. Course name at top, SG categories as line items,
   total at bottom, QR code to tool. Instagram/iMessage-native.

3. **Recipient-Optimized Landing** -- When someone opens a shared link, they
   see results AND a "How do YOU compare?" CTA with pre-filled handicap
   bracket. This closes the viral loop. Track conversion obsessively.

4. **SEO Landing Pages** -- [CHANGED: moved to Phase 1, co-equal with
   sharing]
   - `/learn/strokes-gained-calculator` -- target primary keyword.
   - `/learn/strokes-gained-explained` -- target educational intent.
   - `/learn/average-strokes-gained-by-handicap` -- unique data only you have.
   - `/benchmarks/10-15-handicap`, `/benchmarks/15-20-handicap`, etc. --
     programmatic bracket pages.
   - Schema markup, Google Search Console, sitemap.

5. **9:16 Story Card Export** -- Vertical format for Instagram Stories
   alongside the existing 600px card.

6. **GA4 Key Events Configuration** -- [NEW: from funnel audit research] The
   funnel is currently unmeasured. Set key events: `calculation_completed`,
   `copy_link_clicked`, `download_png_clicked`, `shared_round_viewed`,
   `round_saved`. Without this, you cannot prove what is working.

### Phase 2: multi-tool + distribution (weeks 3-6)

Goal: multiple entry points, multiple reasons to visit.

7. **Tool #2: Golf Score Probability Calculator** -- [NEW from Round 2
   multi-tool strategy] "Given your handicap, what's the probability you
   break 80/90/100?" Simple input, shareable output, strong search intent.
   Each new tool is a weekend build.

8. **Tool #3: "Am I Good at Golf?" Quiz/Benchmark** -- [NEW] Input handicap
   plus a few stats, get a report card. Leverages benchmark data. Strong
   search intent ("am I good at golf for my handicap"). Shareable grade
   format.

9. **Embeddable Mini-SG Widget** -- [NEW from Round 2] Build and pitch to
   5-10 golf instruction blogs. Each embed equals backlink plus user
   acquisition.

10. **Tiered Referral System** -- [NEW from Round 2] Digital reward tiers
    for sharing. Every results page shows referral CTA.

11. **PWA Capabilities** -- [NEW from Round 2] manifest.json + service
    worker. Install prompt after 2+ submissions.

### Phase 3: community + retention (weeks 5-8)

Goal: establish presence, build return behavior.

12. **Reddit Seeding** -- [CHANGED: demoted to acknowledge it is a launch
    channel, not sustained engine] 2-3 weeks of genuine r/golf participation,
    then data insight posts, then one launch post. Plan for this being a
    one-time traffic bump, not recurring.

13. **"Golf Data Brief" Newsletter** -- [NEW from Round 2] Weekly email with
    anonymized aggregate data insights. Cross-promote via beehiiv
    Recommendations. Each issue drives tool traffic.

14. **Challenge a Friend Flow** -- [KEPT from Round 1] Asynchronous 1v1 SG
    comparison. Modeled on Strava segments -- friend enters their stats for
    the same period, sees side-by-side comparison.

15. **Achievement Badges** -- [NEW from Round 2] 5-8 badges that reward
    exploration and repeat use. "Category Killer," "Improvement Arc,"
    "Bracket Buster."

16. **Trend Visualization** -- [KEPT from Round 1] For users with 3+ saved
    rounds, show improvement trends. This is the reason to come back and the
    upsell to saving rounds.

### Phase 4: season wrapped + monetization signal (before October)

17. **Season Wrapped** -- [KEPT but reframed: table stakes, not
    differentiator] GHIN Rewind and Golf Canada already do year-in-review.
    This is expected, not novel. Still worth building for retention and
    sharing, but do not count on it as a breakthrough.

18. **Archetypes as Optional Fun Layer** -- [CHANGED: moved from number 1
    priority to Phase 4 optional] If demand exists, add "Your Golf
    Archetype" as a secondary share card. Names should be aspirational and
    golf-specific ("The Surgeon," "The Closer," "The Grinder"). But this is
    dessert, not the main course.

19. **Early Monetization Signal** -- [CHANGED: from "don't monetize" to
    "validate WTP early"] Introduce a lightweight paid tier at $3-5/mo:
    unlimited saved rounds, trend tracking, custom share themes. Not to
    generate revenue -- to validate that golfers will pay. Arccos charges
    $100/yr and has 650K+ users. Golfers DO pay for analytics.

## What NOT to build

- Do not build a target-handicap platform. Clippd already has this with
  Garmin distribution.
- Do not build a coach CRM. Clippd has multi-year head start with coach
  seats and college packages.
- Do not build shot-by-shot tracking. Round-level summary input is the
  competitive advantage.
- Do not build a social network/feed. Share on existing platforms.
- Do not chase Tour analytics or betting. Data Golf owns it.
- Do not make results public by default. Vanity handicap culture means
  private-first, share-by-choice.
- Do not lead with personality labels over data. Spotify proved this
  backfires.

## Revised success metrics

| Metric | Now | 30-day target | 90-day target |
|---|---|---|---|
| Weekly active users | 105 | 250 | 800 |
| Organic search visitors | ~0 | 100 | 500+ |
| Share-to-visit rate | unknown | measure baseline | 10%+ |
| Recipient-to-own-calc conversion | unknown | measure baseline | 5%+ |
| r/golf referral visitors | 0 | 50 (one-time) | maintain |
| Rounds saved (accounts) | ~low | 50 | 200 |
| Bounce rate | 58% | 50% | 42% |
| Number of golf tools | 1 | 2 | 3-4 |
| Embeds on external sites | 0 | 0 | 3-5 |

[CHANGED: lowered WAU targets from 300/1000 to 250/800 to reflect realistic
K-factor. Added tool count, embed count, and recipient conversion metrics.]

## Kill criteria

[NEW from external research -- every bet needs a kill threshold]

| Bet | Success signal | Kill if |
|---|---|---|
| Share cards (receipts + percentiles) | >12% share rate on `calculation_completed` | <8% after 200 calculations |
| SEO pages | First non-brand clicks within 45 days | Zero impressions after 60 days |
| Recipient conversion | >5% of `shared_round_viewed` trigger own calculation | <3% after 100 shared views |
| Multi-tool expansion | Tool #2 gets >30% of Tool #1 traffic within 30 days | <10% relative traffic |
| Embeddable widget | >50 visits/month from embedded sources | Zero embed adoptions after outreach to 10 blogs |
| Referral tiers | >10% of users trigger first tier | <5% after 30 days |

## The revised meta-insight

The 14-handicapper does not wake up wanting a dashboard. They either:

1. Google "strokes gained calculator" or "am I good at golf for my handicap"
   -- and they should land on you.
2. See a friend's share card in a group chat -- and they should want their
   own.
3. Finish a round and want to know where their strokes went -- and you
   should be on their home screen.

Three entry points. Three moments. One product that serves all three by
being fast, beautiful, shareable, and findable.

The spider chart is not a visualization. It is a conversation starter.
The benchmark page is not content. It is an acquisition engine.
The receipt is not a gimmick. It is a share format that travels.

Build for all three.

## Implementation priority (revised)

Given near-zero build cost with AI:

1. Peer percentile rankings on results -- highest impact on share quality
   (replaces archetypes).
2. GA4 key events + funnel measurement -- cannot improve what you cannot
   measure.
3. SEO pages (learn/ + benchmarks/) -- passive acquisition engine, starts
   compounding immediately.
4. Round Receipt share format -- novel, proven-viral format.
5. Recipient-optimized shared link landing -- closes the viral loop.
6. 9:16 story card export -- opens Instagram distribution.
7. PWA capabilities -- low effort, high retention impact.
8. Tool #2 (Score Probability Calculator) -- new SEO entry point + shareable
   output.
9. Embeddable mini-SG widget -- passive distribution through golf blogs.
10. Tiered referral rewards -- growth mechanic on every results page.
11. Reddit community seeding -- one-time launch bump.
12. Challenge a Friend flow -- social pressure leading to account creation.
13. Achievement badges -- retention through exploration.
14. Trend visualization -- retention through progress tracking.
15. Season Wrapped -- table stakes annual moment.
16. Archetypes (optional) -- fun secondary layer if demand exists.
17. Early paid tier signal -- validate willingness to pay.
