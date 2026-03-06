# Reddit Launch Package

## Recommended Title

I built a free post-round golf stats app to compare your round to golfers at your handicap. Looking for honest feedback.

## Recommended Post Body

I built this because I wanted a quick way to look at a round and see where I actually gained or lost strokes relative to golfers at my own handicap, not Tour pros.

The app is here: https://golfdataviz.com/strokes-gained?utm_source=reddit

What it does:
- Free, post-round benchmark from manual scorecard stats
- Compares you to golfers in your handicap band
- Gives you a simple strokes-gained-style breakdown across four categories
- Lets you share a result card or copy a link

What it does not do:
- It is not shot-level tracking
- It is not a replacement for Arccos if you already use sensors
- It is not claiming to be exact true strokes gained

I published the methodology here because I wanted the assumptions and limitations to be visible:
https://golfdataviz.com/methodology

If you try it, I’d love blunt feedback on:
- whether the inputs feel reasonable
- whether the output feels useful
- whether the positioning is clear

## First Self-Reply

Quick answers to the obvious questions:

Why not Arccos?
Arccos is better if you want shot-level sensor tracking. This is for golfers who want a quick post-round benchmark from the stats already on a scorecard.

This isn’t true strokes gained.
Correct. It’s a proxy model built from round-level inputs, and the methodology page says that clearly. The goal is directional usefulness, not pretending I have shot-level context when I don’t.

That’s a lot of fields.
Fair criticism. I’m trying to stay on the line where the inputs are still realistic for someone with a scorecard, but the output is useful enough to help decide what to practice.

Are you storing my data?
Only if you explicitly opt in to save a round. Saves are anonymous. Shared links contain the round stats needed to recreate the chart, so only share them if you're comfortable sharing those stats.

## Launch-Day Checklist

Before posting:
- Confirm `/`, `/strokes-gained`, `/methodology`, and `/privacy` all reflect the current launch copy.
- Verify the anonymous save checkbox is visible only if production save is fully configured.
- If save is enabled, submit one real saved round on production and confirm success end to end.
- Run the uptime workflow and confirm green.
- Confirm Sentry alerts are active and receiving production events.
- Verify a shared link renders correctly from `?d=` and its OG route responds.
- Verify the analytics funnel includes `utm_source=reddit` on CTA, form start, calculation, and share events.

## Launch-Day Reply Rules

For the first 2 hours after posting:
- Answer high-signal questions quickly.
- Do not argue with “this isn’t true SG” comments. Agree and restate intended use.
- Bucket feedback into messaging confusion, methodology trust, or input friction.
- Treat repeated confusion as a copy problem, not a user problem.
