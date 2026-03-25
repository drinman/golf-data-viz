import type { Metadata } from "next";
import Link from "next/link";
import { buildArticleLD } from "@/lib/seo/jsonld";
import { Breadcrumb } from "@/components/seo/breadcrumb";
import { CalculatorCta } from "@/components/seo/calculator-cta";

export const metadata: Metadata = {
  title: "Strokes Gained Explained for Amateur Golfers",
  description:
    "What strokes gained means, the four SG categories, and why comparing against handicap peers matters more than Tour averages. A complete guide for amateur golfers.",
  alternates: { canonical: "/learn/strokes-gained-explained" },
};

const articleLD = buildArticleLD({
  headline: "Strokes Gained Explained for Amateur Golfers",
  datePublished: "2026-03-18",
  url: "https://golfdataviz.com/learn/strokes-gained-explained",
});

export default function StrokesGainedExplainedPage() {
  return (
    <main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleLD) }}
      />

      <div className="border-b border-cream-200 bg-cream-50">
        <div className="mx-auto max-w-3xl px-4 py-12 sm:py-16">
          <Breadcrumb
            items={[
              { label: "Home", href: "/" },
              { label: "Learn", href: "/learn" },
              {
                label: "Strokes Gained Explained",
                href: "/learn/strokes-gained-explained",
              },
            ]}
          />
          <h1 className="mt-4 font-display text-3xl tracking-tight text-neutral-950 sm:text-4xl">
            Strokes Gained Explained for Amateur Golfers
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-neutral-600">
            A complete guide to understanding strokes gained — what it measures,
            how it breaks down your game, and why peer benchmarking beats Tour
            comparisons for improvement.
          </p>
        </div>
      </div>

      <article className="mx-auto max-w-3xl px-4 py-10">
        <div className="prose-neutral space-y-6 text-base leading-relaxed text-neutral-600">
          {/* What Is Strokes Gained? */}
          <section>
            <h2 className="font-display text-2xl tracking-tight text-neutral-950">
              What Is Strokes Gained?
            </h2>
            <p>
              Strokes gained is a statistical framework that measures how many
              strokes a golfer gains or loses in each part of their game
              compared to a baseline. Originally developed by Columbia professor
              Mark Broadie and adopted by the PGA Tour, strokes gained replaced
              the old way of looking at golf stats in isolation (fairways hit,
              putts per round, etc.) with a system that shows the actual impact
              of each skill on your score.
            </p>
            <p>
              The key insight: a stat like &ldquo;30 putts per round&rdquo;
              means nothing without context. A player who hits 15 greens and
              takes 30 putts is putting brilliantly. A player who hits 6 greens
              and takes 30 putts is putting terribly — most of those putts came
              from off-green scramble situations with shorter first putts.
              Strokes gained accounts for this context.
            </p>
          </section>

          {/* Why Peer Benchmarking Matters */}
          <section>
            <h2 className="font-display text-2xl tracking-tight text-neutral-950">
              Why Peer Benchmarking Matters
            </h2>
            <p>
              Most strokes gained tools compare you to PGA Tour averages. This
              is almost useless for a 15-handicap golfer. Of course you lose
              strokes to Tour pros in every category — you already know that.
              The useful question is: &ldquo;Compared to other 15-handicap
              golfers, where am I gaining and losing strokes?&rdquo;
            </p>
            <p>
              Peer benchmarking reveals actionable patterns. If you&apos;re a
              15-handicap who putts like a 10-handicap but scrambles like a
              20-handicap, your putting is a strength and your short game is
              the bottleneck. A Tour-based comparison would tell you everything
              is bad — not helpful for deciding what to practice.
            </p>
            <p>
              Golf Data Viz compares you against golfers in your own handicap
              bracket using aggregate data from Shot Scope, Arccos, and other
              published amateur sources. See our{" "}
              <Link
                href="/benchmarks"
                className="text-brand-800 underline transition-colors hover:text-brand-700"
              >
                benchmark data by handicap
              </Link>{" "}
              for the exact numbers.
            </p>
          </section>

          {/* The Four Categories */}
          <section>
            <h2 className="font-display text-2xl tracking-tight text-neutral-950">
              The Four Strokes Gained Categories
            </h2>
            <p>
              Strokes gained breaks your round into four categories, each
              covering a distinct part of the game:
            </p>

            <h3 className="mt-6 font-display text-lg text-neutral-950">
              1. Off the Tee (SG: OTT)
            </h3>
            <p>
              Measures your tee shot performance — primarily fairway hit rate
              and penalty avoidance. In scorecard-based models like ours,
              Off the Tee captures driving accuracy rather than distance (which
              requires shot-tracking hardware).
            </p>
            <p>
              A positive SG: OTT means you hit more fairways and take fewer
              penalties than your handicap peers. A negative value means you&apos;re
              losing strokes off the tee compared to similar golfers.
            </p>

            <h3 className="mt-6 font-display text-lg text-neutral-950">
              2. Approach (SG: APP)
            </h3>
            <p>
              Measures your ability to hit greens in regulation. This is often
              the most impactful category for mid-handicap improvement — hitting
              more greens creates easier birdie and par opportunities while
              reducing scrambling pressure.
            </p>
            <p>
              Approach is measured by your GIR percentage compared to your
              peers. If you&apos;re a 12-handicap hitting 8 greens per round
              when peers average 6, you&apos;re gaining significant strokes on
              approach.
            </p>

            <h3 className="mt-6 font-display text-lg text-neutral-950">
              3. Around the Green (SG: ATG)
            </h3>
            <p>
              Measures your short game — specifically, how often you get up and
              down when you miss a green. Scrambling percentage (converting a
              miss into a par save) is the primary driver.
            </p>
            <p>
              Many amateur golfers underestimate the impact of their short
              game. A strong scrambler can offset weak approach play, while a
              poor scrambler amplifies the damage of every missed green.
            </p>

            <h3 className="mt-6 font-display text-lg text-neutral-950">
              4. Putting (SG: PUTT)
            </h3>
            <p>
              Measures putting efficiency relative to your peers. True
              shot-level putting SG uses putt starting distances; our
              scorecard-based model uses a GIR-adjusted approach that accounts
              for whether you&apos;re putting from the green (longer first
              putts, birdie attempts) or from scramble situations (shorter first
              putts, par saves).
            </p>
            <p>
              Read more about the nuances of putting SG in our{" "}
              <Link
                href="/learn/strokes-gained-putting"
                className="text-brand-800 underline transition-colors hover:text-brand-700"
              >
                putting deep dive
              </Link>
              .
            </p>
          </section>

          {/* Common Misconceptions */}
          <section>
            <h2 className="font-display text-2xl tracking-tight text-neutral-950">
              Common Misconceptions
            </h2>

            <h3 className="mt-6 font-display text-lg text-neutral-950">
              &ldquo;Putting is the most important part of the game&rdquo;
            </h3>
            <p>
              Conventional wisdom says putting is half the game because
              roughly half your strokes are putts. But strokes gained research
              consistently shows that for most amateurs, the biggest scoring
              gaps are in approach play and short game — not putting. Putting
              differences between handicap brackets are relatively small
              compared to GIR and scrambling differences.
            </p>

            <h3 className="mt-6 font-display text-lg text-neutral-950">
              &ldquo;My putts-per-round number tells me how I putt&rdquo;
            </h3>
            <p>
              Putts per round is a misleading stat because it doesn&apos;t
              account for GIR. A player who hits 14 greens will have more putts
              than a player who hits 5 greens — but the first player is almost
              certainly putting better. Strokes gained adjusts for this by
              comparing expected putts based on your GIR rate.
            </p>

            <h3 className="mt-6 font-display text-lg text-neutral-950">
              &ldquo;Scorecard SG is the same as Tour SG&rdquo;
            </h3>
            <p>
              True strokes gained (as used on the PGA Tour) measures every
              shot&apos;s start and end position against expected strokes from
              that location. This requires GPS or shot-tracking devices.
              Scorecard-based SG uses aggregate round stats (fairways, GIR,
              putts, scoring) to estimate category performance. It&apos;s
              directionally useful for practice prioritization but less precise
              than shot-level analysis. Read the full comparison in our{" "}
              <Link
                href="/methodology"
                className="text-brand-800 underline transition-colors hover:text-brand-700"
              >
                methodology
              </Link>
              .
            </p>
          </section>

          {/* How to Use Your Results */}
          <section>
            <h2 className="font-display text-2xl tracking-tight text-neutral-950">
              How to Use Your Results
            </h2>
            <p>
              After running your round through the calculator, look for the
              category with the most negative strokes gained value — that&apos;s
              where you&apos;re losing the most ground to your peers and likely
              the highest-leverage area for practice.
            </p>
            <p>
              Also pay attention to your strengths. Knowing what you do well
              helps you build a game plan around your advantages. A golfer who
              gains strokes putting but loses them on approach might benefit
              more from iron work than putting drills.
            </p>
            <p>
              Run multiple rounds through the calculator to see patterns.
              Single-round results can be noisy — a trend across 3-5 rounds
              gives you a much clearer picture of where to focus.
            </p>
          </section>
        </div>

        <div className="mt-10">
          <CalculatorCta surface="learn_sg_explained" />
        </div>

        <footer className="mt-12 border-t border-cream-200 pt-6 pb-8">
          <p className="text-xs italic text-neutral-400">
            Based on strokes gained methodology originally developed by Mark
            Broadie. Peer benchmarks from Shot Scope and published amateur
            sources.{" "}
            <Link
              href="/methodology"
              className="text-brand-800 underline transition-colors hover:text-brand-700"
            >
              Full methodology
            </Link>
          </p>
        </footer>
      </article>
    </main>
  );
}
