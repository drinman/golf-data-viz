import type { Metadata } from "next";
import Link from "next/link";
import { loadBrackets } from "@/lib/golf/benchmarks";
import { BRACKET_LABELS } from "@/lib/golf/constants";
import { bracketToSlug } from "@/lib/seo/slugs";
import { buildArticleLD } from "@/lib/seo/jsonld";
import { Breadcrumb } from "@/components/seo/breadcrumb";
import { CalculatorCta } from "@/components/seo/calculator-cta";

export const metadata: Metadata = {
  title: "Strokes Gained Putting: What Amateurs Get Wrong",
  description:
    "Why putting SG is misunderstood, how GIR affects your putting numbers, and what the data shows about average putts by handicap.",
  alternates: { canonical: "/learn/strokes-gained-putting" },
};

const articleLD = buildArticleLD({
  headline: "Strokes Gained Putting: What Amateurs Get Wrong",
  datePublished: "2026-03-18",
  url: "https://golfdataviz.com/learn/strokes-gained-putting",
});

export default function StrokesGainedPuttingPage() {
  const brackets = loadBrackets();

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
                label: "SG Putting",
                href: "/learn/strokes-gained-putting",
              },
            ]}
          />
          <h1 className="mt-4 font-display text-3xl tracking-tight text-neutral-950 sm:text-4xl">
            Strokes Gained Putting: What Amateurs Get Wrong
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-neutral-600">
            Putting SG is one of the most misunderstood golf stats. Here&apos;s
            why your putts-per-round number is misleading, how GIR context
            changes everything, and what the amateur data actually shows.
          </p>
        </div>
      </div>

      <article className="mx-auto max-w-3xl px-4 py-10">
        <div className="prose-neutral space-y-6 text-base leading-relaxed text-neutral-600">
          {/* The Putts Per Round Problem */}
          <section>
            <h2 className="font-display text-2xl tracking-tight text-neutral-950">
              The Putts-Per-Round Problem
            </h2>
            <p>
              Ask any golfer how they putt and they&apos;ll give you a number:
              &ldquo;I averaged 32 putts today.&rdquo; The problem is that
              putts per round is one of the most misleading stats in golf. It
              tells you almost nothing about putting quality without knowing how
              many greens you hit.
            </p>
            <p>
              Consider two 15-handicap golfers:
            </p>
            <div className="mt-4 space-y-3">
              <div className="rounded-lg border border-cream-200 bg-white px-5 py-4">
                <p className="text-sm font-medium text-neutral-800">
                  Golfer A: 33 putts, 12 GIR
                </p>
                <p className="mt-1 text-sm">
                  Hit 12 greens in regulation. That&apos;s 12 first putts from
                  20-40 feet (birdie attempts) plus 6 putts from chip-ons (shorter
                  first putts). High putt count because they gave themselves
                  many chances.
                </p>
              </div>
              <div className="rounded-lg border border-cream-200 bg-white px-5 py-4">
                <p className="text-sm font-medium text-neutral-800">
                  Golfer B: 29 putts, 4 GIR
                </p>
                <p className="mt-1 text-sm">
                  Hit only 4 greens. Most putts came from chip-on or scramble
                  situations with shorter first putts. Low putt count because
                  they had fewer opportunities to putt, not because they putted
                  better.
                </p>
              </div>
            </div>
            <p className="mt-4">
              Golfer A almost certainly putted <em>better</em> despite having
              more putts. Strokes gained accounts for this by adjusting for GIR
              context.
            </p>
          </section>

          {/* How GIR-Adjusted Putting Works */}
          <section>
            <h2 className="font-display text-2xl tracking-tight text-neutral-950">
              How GIR-Adjusted Putting Works
            </h2>
            <p>
              Our calculator uses a GIR-adjusted putting model. Instead of
              comparing raw putts per round, we calculate expected putts based
              on your GIR rate:
            </p>
            <div className="mt-4 rounded-lg border border-cream-200 bg-cream-50 px-5 py-4">
              <p className="font-mono text-xs text-neutral-700">
                expectedPutts = (GIR &times; puttsPerGIR) + ((18 &minus; GIR)
                &times; puttsPerNonGIR)
              </p>
              <p className="mt-2 text-xs text-neutral-500">
                puttsPerGIR and puttsPerNonGIR are peer-specific benchmark
                values for your handicap bracket.
              </p>
            </div>
            <p className="mt-4">
              This means a golfer who hits many greens is expected to take more
              putts (because GIR putts are typically longer and result in more
              two-putts). The putting SG value reflects whether you putt better
              or worse <em>than expected given your GIR rate</em>.
            </p>
            <p>
              When GIR is not provided, the calculator falls back to a simpler
              model comparing your putts per hole against the peer average. This
              is less accurate but still directionally useful. The confidence
              level reflects which model was used.
            </p>
          </section>

          {/* Average Putts by Handicap */}
          <section>
            <h2 className="font-display text-2xl tracking-tight text-neutral-950">
              Average Putts by Handicap Bracket
            </h2>
            <p>
              Here&apos;s what the data shows for putts per round across
              handicap levels:
            </p>
            <div className="mt-4 overflow-x-auto rounded-lg border border-cream-200">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-cream-200 bg-cream-50 text-left">
                    <th className="px-4 py-2.5 font-medium text-neutral-600">
                      Bracket
                    </th>
                    <th className="px-4 py-2.5 font-medium text-neutral-600">
                      Putts / Round
                    </th>
                    <th className="px-4 py-2.5 font-medium text-neutral-600">
                      GIR %
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-cream-200">
                  {brackets.map((b) => (
                    <tr key={b.bracket}>
                      <td className="px-4 py-2.5">
                        <Link
                          href={`/benchmarks/${bracketToSlug(b.bracket)}`}
                          className="text-brand-800 underline hover:text-brand-900"
                        >
                          {BRACKET_LABELS[b.bracket]}
                        </Link>
                      </td>
                      <td className="px-4 py-2.5 font-mono text-neutral-600">
                        {b.puttsPerRound.toFixed(1)}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-neutral-600">
                        {b.girPercentage.toFixed(0)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-4">
              Notice the narrow spread in putts per round compared to the wide
              spread in GIR. A 0-5 handicap golfer only putts about 3-4 fewer
              times per round than a 30+ golfer — despite hitting dramatically
              more greens. This is because more greens = more putts from longer
              distances = more total putts.
            </p>
          </section>

          {/* The Low-GIR Putting Caveat */}
          <section>
            <h2 className="font-display text-2xl tracking-tight text-neutral-950">
              The Low-GIR Putting Caveat
            </h2>
            <p>
              When your GIR is significantly below your bracket&apos;s average
              (more than 10 percentage points lower), the calculator displays a
              &ldquo;Low GIR — less reliable&rdquo; caveat on your putting
              result.
            </p>
            <p>
              Why? With very few greens hit, most of your putts come from
              scramble situations. The expected putts calculation becomes less
              reliable because the ratio of GIR putts to non-GIR putts is
              heavily skewed. In extreme cases (0-2 GIR), your putting SG is
              essentially measuring your chip-and-putt performance rather than
              true green-reading ability.
            </p>
            <p>
              This doesn&apos;t mean the number is wrong — it means the
              confidence in the putting breakdown specifically is lower. Your
              total strokes gained and other categories are unaffected.
            </p>
          </section>

          {/* What the Research Says */}
          <section>
            <h2 className="font-display text-2xl tracking-tight text-neutral-950">
              What the Research Shows
            </h2>
            <p>
              Mark Broadie&apos;s original strokes gained research found that
              for professional golfers, the long game (tee shots and approach)
              accounts for roughly two-thirds of the scoring differences between
              players, while putting accounts for about one-third.
            </p>
            <p>
              For amateurs, the data is even more skewed toward the long game.
              The scoring gaps between handicap brackets are overwhelmingly
              driven by GIR differences (approach play) and penalty avoidance
              (tee shots), not putting.
            </p>
            <p>
              This doesn&apos;t mean putting practice is worthless — but it does
              mean that spending all your practice time on the putting green
              while ignoring your iron game is likely leaving strokes on the
              table. The data suggests a balanced practice allocation weighted
              toward your weakest category, which for most mid-handicap golfers
              is approach play.
            </p>
            <p>
              For a complete breakdown of how all four categories separate
              golfers by handicap, see{" "}
              <Link
                href="/learn/average-strokes-gained-by-handicap"
                className="text-brand-800 underline hover:text-brand-900"
              >
                Average Strokes Gained by Handicap
              </Link>
              .
            </p>
          </section>
        </div>

        <div className="mt-10">
          <CalculatorCta surface="learn_sg_putting" />
        </div>

        <footer className="mt-12 border-t border-cream-200 pt-6 pb-8">
          <p className="text-xs italic text-neutral-400">
            Based on strokes gained methodology by Mark Broadie. Peer data from
            Shot Scope and published amateur sources.{" "}
            <Link
              href="/methodology"
              className="underline hover:text-neutral-600"
            >
              Full methodology
            </Link>
          </p>
        </footer>
      </article>
    </main>
  );
}
