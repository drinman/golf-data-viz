import type { Metadata } from "next";
import Link from "next/link";
import { loadBrackets } from "@/lib/golf/benchmarks";
import { BRACKET_LABELS } from "@/lib/golf/constants";
import { bracketToSlug } from "@/lib/seo/slugs";
import { buildArticleLD } from "@/lib/seo/jsonld";
import { Breadcrumb } from "@/components/seo/breadcrumb";
import { BenchmarkVisual } from "@/components/seo/benchmark-visual";
import { CalculatorCta } from "@/components/seo/calculator-cta";

export const metadata: Metadata = {
  title: "Average Strokes Gained by Handicap",
  description:
    "How golfers at every handicap level perform across scoring, accuracy, short game, and putting. Data-backed benchmarks from 0-5 through 30+.",
  alternates: { canonical: "/learn/average-strokes-gained-by-handicap" },
};

const articleLD = buildArticleLD({
  headline: "Average Strokes Gained by Handicap",
  datePublished: "2026-03-18",
  url: "https://golfdataviz.com/learn/average-strokes-gained-by-handicap",
});

export default function AverageStrokesGainedByHandicapPage() {
  const brackets = loadBrackets();

  return (
    <main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleLD) }}
      />

      <div className="border-b border-cream-200 bg-cream-50">
        <div className="mx-auto max-w-3xl px-4 py-16 sm:py-24 md:py-32">
          <Breadcrumb
            items={[
              { label: "Home", href: "/" },
              { label: "Learn", href: "/learn" },
              {
                label: "Average SG by Handicap",
                href: "/learn/average-strokes-gained-by-handicap",
              },
            ]}
          />
          <h1 className="mt-4 font-display text-3xl tracking-tight text-neutral-950 sm:text-4xl">
            Average Strokes Gained by Handicap
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-neutral-600">
            How do golfers at different handicap levels actually perform? These
            benchmarks show average stats across every bracket, so you can see
            where skill levels diverge.
          </p>
        </div>
      </div>

      <article className="mx-auto max-w-3xl px-4 py-20 sm:py-24">
        <div className="prose-neutral space-y-6 text-base leading-relaxed text-neutral-600">
          {/* Summary table */}
          <section>
            <h2 className="font-display text-2xl tracking-tight text-neutral-950">
              Performance by Bracket
            </h2>
            <p>
              The table below shows average round-level stats for each handicap
              bracket. These numbers represent typical performance across
              thousands of tracked rounds from Shot Scope and other published
              amateur data sources.
            </p>
            <div className="mt-4 overflow-x-auto rounded-lg border border-cream-200">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-cream-200 bg-cream-50 text-left">
                    <th className="px-3 py-2.5 font-medium text-neutral-600">
                      Bracket
                    </th>
                    <th className="px-3 py-2.5 font-medium text-neutral-600">
                      Avg Score
                    </th>
                    <th className="px-3 py-2.5 font-medium text-neutral-600">
                      FIR%
                    </th>
                    <th className="px-3 py-2.5 font-medium text-neutral-600">
                      GIR%
                    </th>
                    <th className="px-3 py-2.5 font-medium text-neutral-600">
                      Putts
                    </th>
                    <th className="px-3 py-2.5 font-medium text-neutral-600">
                      U&D%
                    </th>
                    <th className="px-3 py-2.5 font-medium text-neutral-600">
                      Pen
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-cream-200">
                  {brackets.map((b) => (
                    <tr key={b.bracket}>
                      <td className="px-3 py-2.5">
                        <Link
                          href={`/benchmarks/${bracketToSlug(b.bracket)}`}
                          className="text-brand-800 underline transition-colors hover:text-brand-700"
                        >
                          {BRACKET_LABELS[b.bracket]}
                        </Link>
                      </td>
                      <td className="px-3 py-2.5 font-mono tabular-nums text-neutral-600">
                        {b.averageScore.toFixed(1)}
                      </td>
                      <td className="px-3 py-2.5 font-mono tabular-nums text-neutral-600">
                        {b.fairwayPercentage.toFixed(0)}%
                      </td>
                      <td className="px-3 py-2.5 font-mono tabular-nums text-neutral-600">
                        {b.girPercentage.toFixed(0)}%
                      </td>
                      <td className="px-3 py-2.5 font-mono tabular-nums text-neutral-600">
                        {b.puttsPerRound.toFixed(1)}
                      </td>
                      <td className="px-3 py-2.5 font-mono tabular-nums text-neutral-600">
                        {b.upAndDownPercentage.toFixed(0)}%
                      </td>
                      <td className="px-3 py-2.5 font-mono tabular-nums text-neutral-600">
                        {b.penaltiesPerRound.toFixed(1)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Visual comparison */}
          <section>
            <h2 className="font-display text-2xl tracking-tight text-neutral-950">
              Average Score by Bracket
            </h2>
            <p>
              The chart below visualizes how average scores change across
              handicap brackets. The steepest jump is between the lower and
              mid brackets, while higher handicap brackets converge more
              gradually.
            </p>
            <div className="mt-4">
              <BenchmarkVisual />
            </div>
          </section>

          {/* Key insights */}
          <section>
            <h2 className="font-display text-2xl tracking-tight text-neutral-950">
              Key Insights from the Data
            </h2>

            <h3 className="mt-6 font-display text-lg text-neutral-950">
              GIR is the biggest separator
            </h3>
            <p>
              Greens in regulation is the stat with the widest spread between
              brackets. A 0-5 handicap golfer hits roughly twice as many greens
              as a 25-30 handicap. This makes approach play the single
              most impactful skill for dropping your handicap.
            </p>

            <h3 className="mt-6 font-display text-lg text-neutral-950">
              Putting differences are smaller than you think
            </h3>
            <p>
              Putts per round varies by only a few strokes across the entire
              handicap range. The reason: higher handicap golfers hit fewer
              greens, so they have fewer putts per round despite being less
              skilled on the green. This is why putts per round is a misleading
              stat without GIR context.
            </p>

            <h3 className="mt-6 font-display text-lg text-neutral-950">
              Penalties compound quickly
            </h3>
            <p>
              Higher handicap golfers take significantly more penalty strokes
              per round. Eliminating just one penalty per round can move you
              closer to the next bracket — and penalties are often the easiest
              stat to improve through course management rather than swing
              changes.
            </p>

            <h3 className="mt-6 font-display text-lg text-neutral-950">
              Scrambling separates the mid-handicaps
            </h3>
            <p>
              Up-and-down percentage shows a steep decline from low to mid
              handicaps. For golfers in the 10-20 range, improving your short
              game can be the fastest path to lower scores — you&apos;re
              missing enough greens that scrambling has a large impact.
            </p>
          </section>

          {/* How to use this data */}
          <section>
            <h2 className="font-display text-2xl tracking-tight text-neutral-950">
              How to Use This Data
            </h2>
            <p>
              Find your handicap bracket in the table above and compare your
              personal stats. If your GIR is significantly below the bracket
              average, approach play is your bottleneck. If your putts per round
              is above average, putting practice is high leverage.
            </p>
            <p>
              For a detailed breakdown of your specific round, use the{" "}
              <Link
                href="/strokes-gained"
                className="text-brand-800 underline transition-colors hover:text-brand-700"
              >
                Strokes Gained Calculator
              </Link>{" "}
              to see exactly how many strokes you gain and lose in each category
              relative to your peers.
            </p>
          </section>
        </div>

        <div className="mt-10">
          <CalculatorCta surface="learn_avg_sg_by_handicap" />
        </div>

        <footer className="mt-12 border-t border-cream-200 pt-6 pb-8">
          <p className="text-xs italic text-neutral-400">
            Data from Shot Scope, Arccos, and USGA statistics.{" "}
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
