import type { Metadata } from "next";
import Link from "next/link";
import { buildArticleLD } from "@/lib/seo/jsonld";
import { Breadcrumb } from "@/components/seo/breadcrumb";
import { CalculatorCta } from "@/components/seo/calculator-cta";

export const metadata: Metadata = {
  title: "Free Strokes Gained Calculator for Amateur Golfers",
  description:
    "Enter your scorecard stats and see where you gain and lose strokes compared to golfers at your level. Free, no account required.",
  alternates: { canonical: "/learn/strokes-gained-calculator" },
};

const articleLD = buildArticleLD({
  headline: "Free Strokes Gained Calculator for Amateur Golfers",
  datePublished: "2026-03-18",
  url: "https://golfdataviz.com/learn/strokes-gained-calculator",
});

export default function StrokesGainedCalculatorPage() {
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
                label: "Strokes Gained Calculator",
                href: "/learn/strokes-gained-calculator",
              },
            ]}
          />
          <h1 className="mt-4 font-display text-3xl tracking-tight text-neutral-950 sm:text-4xl">
            Free Strokes Gained Calculator
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-neutral-600">
            Enter your scorecard stats and see where you gain and lose strokes
            compared to golfers at your handicap level. No account required.
          </p>
        </div>
      </div>

      <article className="mx-auto max-w-3xl px-4 py-10">
        {/* Prominent CTA at top */}
        <div className="mb-10">
          <CalculatorCta surface="learn_calculator_top" />
        </div>

        <div className="prose-neutral space-y-6 text-base leading-relaxed text-neutral-600">
          {/* What This Calculator Does */}
          <section>
            <h2 className="font-display text-2xl tracking-tight text-neutral-950">
              What This Calculator Does
            </h2>
            <p>
              The Golf Data Viz Strokes Gained Calculator takes the stats
              you&apos;d normally write on a scorecard — score, fairways hit,
              greens in regulation, total putts, penalties, and scoring
              distribution — and breaks them into four strokes gained
              categories: Off the Tee, Approach, Around the Green, and Putting.
            </p>
            <p>
              Instead of comparing you to PGA Tour pros (where every category
              is negative), we compare you to golfers in your own handicap
              bracket. This reveals your actual strengths and weaknesses
              relative to peers, giving you actionable data for practice
              decisions.
            </p>
          </section>

          {/* What Stats You Need */}
          <section>
            <h2 className="font-display text-2xl tracking-tight text-neutral-950">
              What Stats You Need
            </h2>
            <p>
              At minimum, you need your score, handicap index, and total putts.
              The more stats you provide, the more accurate and detailed your
              breakdown will be:
            </p>
            <div className="mt-4 space-y-3">
              <div className="rounded-lg border border-cream-200 bg-white px-5 py-4">
                <p className="text-sm font-medium text-neutral-800">
                  Required
                </p>
                <ul className="mt-2 list-disc pl-5 text-sm text-neutral-600">
                  <li>Score (total strokes for 18 holes)</li>
                  <li>Handicap index</li>
                  <li>Total putts</li>
                  <li>Fairway attempts (usually 14)</li>
                  <li>Penalty strokes</li>
                  <li>Scoring distribution (birdies, pars, bogeys, etc.)</li>
                </ul>
              </div>
              <div className="rounded-lg border border-cream-200 bg-white px-5 py-4">
                <p className="text-sm font-medium text-neutral-800">
                  Optional (improves accuracy)
                </p>
                <ul className="mt-2 list-disc pl-5 text-sm text-neutral-600">
                  <li>Fairways hit</li>
                  <li>Greens in regulation</li>
                  <li>Up-and-down attempts and conversions</li>
                  <li>Course rating and slope rating</li>
                  <li>Three-putts</li>
                </ul>
              </div>
            </div>
            <p className="mt-4">
              Don&apos;t track fairways hit or GIR? The calculator estimates
              them from your scoring distribution and flags the estimates with
              lower confidence levels. You&apos;ll get a useful result either
              way — but tracking more stats gives you higher-confidence
              insights.
            </p>
          </section>

          {/* How to Interpret Results */}
          <section>
            <h2 className="font-display text-2xl tracking-tight text-neutral-950">
              How to Interpret Your Results
            </h2>
            <p>
              After submitting your round, you&apos;ll see a total strokes
              gained number and per-category breakdown:
            </p>
            <ul className="mt-3 list-disc pl-5 text-sm text-neutral-600 space-y-2">
              <li>
                <strong className="text-neutral-800">Positive values</strong>{" "}
                mean you outperformed your peers in that category
              </li>
              <li>
                <strong className="text-neutral-800">Negative values</strong>{" "}
                mean you underperformed relative to your peers
              </li>
              <li>
                <strong className="text-neutral-800">Near zero</strong> means
                you performed about average for your handicap bracket
              </li>
            </ul>
            <p className="mt-4">
              Each category shows a confidence level (High, Medium, or Low)
              based on what data was available. High-confidence categories are
              based on stats you directly provided. Medium and Low confidence
              categories rely on estimates and should be interpreted with more
              caution.
            </p>
            <p>
              For a deeper understanding of the calculation methodology, see{" "}
              <Link
                href="/learn/strokes-gained-explained"
                className="text-brand-800 underline hover:text-brand-900"
              >
                Strokes Gained Explained
              </Link>{" "}
              or our full{" "}
              <Link
                href="/methodology"
                className="text-brand-800 underline hover:text-brand-900"
              >
                methodology page
              </Link>
              .
            </p>
          </section>

          {/* FAQ */}
          <section>
            <h2 className="font-display text-2xl tracking-tight text-neutral-950">
              Frequently Asked Questions
            </h2>
            <div className="mt-4 space-y-4">
              <div>
                <h3 className="text-sm font-medium text-neutral-800">
                  Is this the same as PGA Tour strokes gained?
                </h3>
                <p className="mt-1 text-sm">
                  No. Tour SG uses shot-level GPS data. Our calculator uses
                  scorecard-level stats to estimate category performance. It&apos;s
                  directionally useful for practice prioritization but less
                  precise than shot-level tracking.
                </p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-neutral-800">
                  Do I need to create an account?
                </h3>
                <p className="mt-1 text-sm">
                  No. The calculator is completely free and works without an
                  account. If you want to save rounds and track trends over
                  time, you can optionally sign in.
                </p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-neutral-800">
                  How accurate is a single round?
                </h3>
                <p className="mt-1 text-sm">
                  Single rounds have natural variance. For the clearest picture,
                  run 3-5 rounds through the calculator and look for consistent
                  patterns across rounds rather than focusing on any single
                  result.
                </p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-neutral-800">
                  What handicap brackets are supported?
                </h3>
                <p className="mt-1 text-sm">
                  All handicap levels from plus handicap through 30+. See the
                  full{" "}
                  <Link
                    href="/benchmarks"
                    className="text-brand-800 underline hover:text-brand-900"
                  >
                    benchmark data
                  </Link>{" "}
                  for every bracket.
                </p>
              </div>
            </div>
          </section>
        </div>

        {/* Bottom CTA */}
        <div className="mt-10">
          <CalculatorCta surface="learn_calculator_bottom" />
        </div>

        <footer className="mt-12 border-t border-neutral-200 pt-6 pb-8">
          <p className="text-xs italic text-neutral-400">
            Peer benchmarks from Shot Scope and published amateur sources.{" "}
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
