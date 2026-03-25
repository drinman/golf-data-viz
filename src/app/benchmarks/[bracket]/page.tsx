import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { loadBrackets, getBenchmarkMeta } from "@/lib/golf/benchmarks";
import { BRACKET_LABELS } from "@/lib/golf/constants";
import { ALL_BRACKET_SLUGS, slugToBracket } from "@/lib/seo/slugs";
import { buildDatasetLD } from "@/lib/seo/jsonld";
import { Breadcrumb } from "@/components/seo/breadcrumb";
import { BenchmarkDataTable } from "@/components/seo/benchmark-data-table";
import { AdjacentBrackets } from "@/components/seo/adjacent-brackets";
import { CalculatorCta } from "@/components/seo/calculator-cta";

export const dynamicParams = false;

export function generateStaticParams() {
  return ALL_BRACKET_SLUGS.map((slug) => ({ bracket: slug }));
}

type Props = {
  params: Promise<{ bracket: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { bracket: slug } = await params;
  const bracket = slugToBracket(slug);
  if (!bracket) return {};

  const label = BRACKET_LABELS[bracket];
  return {
    title: `${label} Golf Benchmarks`,
    description: `Average score, GIR%, fairway %, putts per round, and scoring distribution for ${label.toLowerCase()} golfers. Compare your stats to your peers.`,
    alternates: { canonical: `/benchmarks/${slug}` },
    openGraph: {
      title: `${label} Golf Benchmarks | Golf Data Viz`,
      description: `See how ${label.toLowerCase()} golfers perform across every stat category.`,
    },
  };
}

const siteUrl =
  process.env.NEXT_PUBLIC_BASE_URL ?? "https://golfdataviz.com";

export default async function BenchmarkBracketPage({ params }: Props) {
  const { bracket: slug } = await params;
  const bracket = slugToBracket(slug);
  if (!bracket) notFound();

  const brackets = loadBrackets();
  const benchmarkData = brackets.find((b) => b.bracket === bracket);
  if (!benchmarkData) notFound();

  const meta = getBenchmarkMeta();
  const label = BRACKET_LABELS[bracket];

  const datasetLD = buildDatasetLD({
    name: `${label} Golf Performance Benchmarks`,
    description: `Average score, fairway %, GIR%, putts per round, up-and-down %, and scoring distribution for ${label.toLowerCase()} golfers.`,
    url: `${siteUrl}/benchmarks/${slug}`,
  });

  return (
    <main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(datasetLD) }}
      />

      {/* Hero */}
      <div className="border-b border-cream-200 bg-cream-50">
        <div className="mx-auto max-w-3xl px-4 py-12 sm:py-16">
          <Breadcrumb
            items={[
              { label: "Home", href: "/" },
              { label: "Benchmarks", href: "/benchmarks" },
              { label: label, href: `/benchmarks/${slug}` },
            ]}
          />
          <h1 className="mt-4 font-display text-3xl tracking-tight text-neutral-950 sm:text-4xl">
            {label} Handicap Benchmarks
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-neutral-600">
            How does the average {label.toLowerCase()} golfer perform? Here are
            the peer benchmarks for every tracked stat category, sourced from
            Shot Scope and other published amateur data.
          </p>
          <p className="mt-2 text-xs text-neutral-400">
            Benchmarks v{meta.version} &middot; Updated {meta.updatedAt}
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 py-10">
        {/* Quick stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-lg border border-cream-200 bg-white px-4 py-3 text-center">
            <p className="font-mono tabular-nums text-2xl font-semibold text-neutral-950">
              {benchmarkData.averageScore.toFixed(1)}
            </p>
            <p className="text-xs text-neutral-500">Avg Score</p>
          </div>
          <div className="rounded-lg border border-cream-200 bg-white px-4 py-3 text-center">
            <p className="font-mono tabular-nums text-2xl font-semibold text-neutral-950">
              {benchmarkData.girPercentage.toFixed(0)}%
            </p>
            <p className="text-xs text-neutral-500">GIR</p>
          </div>
          <div className="rounded-lg border border-cream-200 bg-white px-4 py-3 text-center">
            <p className="font-mono tabular-nums text-2xl font-semibold text-neutral-950">
              {benchmarkData.puttsPerRound.toFixed(1)}
            </p>
            <p className="text-xs text-neutral-500">Putts / Round</p>
          </div>
        </div>

        {/* Full data table */}
        <section className="mt-10">
          <h2 className="font-display text-xl tracking-tight text-neutral-950">
            Full Benchmark Data
          </h2>
          <p className="mt-2 text-sm text-neutral-600">
            Complete performance metrics for {label.toLowerCase()} golfers.
            These averages represent typical round-level stats across thousands
            of tracked rounds.
          </p>
          <div className="mt-4">
            <BenchmarkDataTable benchmark={benchmarkData} />
          </div>
        </section>

        {/* What this means */}
        <section className="mt-10">
          <h2 className="font-display text-xl tracking-tight text-neutral-950">
            What These Numbers Mean
          </h2>
          <div className="mt-4 space-y-3 text-sm leading-relaxed text-neutral-600">
            <p>
              These benchmarks represent the average performance of golfers
              with a {label.replace(" HCP", "")} handicap index. They are
              derived from aggregate data across real tracked rounds, not
              theoretical models.
            </p>
            <p>
              Use these numbers to understand where you stand relative to your
              peers. If your fairway percentage is significantly above the
              benchmark, you&apos;re gaining strokes off the tee. If your putts
              per round are higher, that&apos;s a clear area for improvement.
            </p>
            <p>
              Want to see exactly where you gain and lose strokes? Use the{" "}
              <Link
                href="/strokes-gained"
                className="text-brand-800 underline transition-colors hover:text-brand-700"
              >
                Strokes Gained Calculator
              </Link>{" "}
              to break down your round against these peer benchmarks.
            </p>
          </div>
        </section>

        {/* Data source attribution */}
        <section className="mt-10">
          <div className="rounded-lg border border-cream-200 bg-cream-50 px-5 py-4 text-sm text-neutral-600">
            <p className="font-medium text-neutral-800">Data Sources</p>
            <p className="mt-1">
              Benchmark data sourced from Shot Scope performance tracking,
              Arccos aggregate reports, and USGA handicap statistics. All values
              are version-locked and updated periodically. See the{" "}
              <Link
                href="/methodology"
                className="text-brand-800 underline transition-colors hover:text-brand-700"
              >
                methodology page
              </Link>{" "}
              for full citation details.
            </p>
          </div>
        </section>

        {/* Adjacent bracket navigation */}
        <div className="mt-10">
          <AdjacentBrackets current={bracket} />
        </div>

        {/* CTA */}
        <div className="mt-10">
          <CalculatorCta surface="benchmark_bracket" />
        </div>

        {/* Footer */}
        <footer className="mt-12 border-t border-cream-200 pt-6 pb-8">
          <p className="text-xs italic text-neutral-400">
            Benchmarks v{meta.version} (updated {meta.updatedAt}). Data from
            Shot Scope, Arccos, and USGA statistics.{" "}
            <Link
              href="/methodology"
              className="text-brand-800 underline transition-colors hover:text-brand-700"
            >
              Full methodology
            </Link>
          </p>
        </footer>
      </div>
    </main>
  );
}
