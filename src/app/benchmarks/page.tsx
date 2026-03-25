import type { Metadata } from "next";
import Link from "next/link";
import { loadBrackets, getBenchmarkMeta } from "@/lib/golf/benchmarks";
import { BRACKET_LABELS } from "@/lib/golf/constants";
import { ALL_BRACKET_SLUGS } from "@/lib/seo/slugs";
import { Breadcrumb } from "@/components/seo/breadcrumb";
import { CalculatorCta } from "@/components/seo/calculator-cta";

export const metadata: Metadata = {
  title: "Golf Benchmarks by Handicap",
  description:
    "Average score, GIR%, fairway %, putts per round, and more for every handicap bracket. See how your game compares to golfers at your level.",
  alternates: { canonical: "/benchmarks" },
  openGraph: {
    title: "Golf Benchmarks by Handicap | Golf Data Viz",
    description:
      "Average score, GIR%, fairway %, putts per round, and more for every handicap bracket.",
  },
};

export default function BenchmarksIndexPage() {
  const brackets = loadBrackets();
  const meta = getBenchmarkMeta();

  return (
    <main>
      <div className="border-b border-cream-200 bg-cream-50">
        <div className="mx-auto max-w-3xl px-4 py-12 sm:py-16">
          <Breadcrumb
            items={[
              { label: "Home", href: "/" },
              { label: "Benchmarks", href: "/benchmarks" },
            ]}
          />
          <h1 className="mt-4 font-display text-3xl tracking-tight text-neutral-950 sm:text-4xl">
            Golf Benchmarks by Handicap
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-neutral-600">
            How does your game compare to golfers at your level? Browse average
            stats for every handicap bracket, powered by peer data from Shot
            Scope and other published amateur sources.
          </p>
          <p className="mt-2 text-xs text-neutral-400">
            Benchmarks v{meta.version} &middot; Updated {meta.updatedAt}
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 py-10">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {brackets.map((b, i) => {
            const slug = ALL_BRACKET_SLUGS[i];
            const label = BRACKET_LABELS[b.bracket];
            return (
              <Link
                key={b.bracket}
                href={`/benchmarks/${slug}`}
                className="group rounded-lg border border-cream-200 bg-white px-5 py-4 transition-colors hover:border-brand-200 hover:bg-brand-50/30"
              >
                <p className="font-display text-lg tracking-tight text-neutral-950 group-hover:text-brand-800">
                  {label}
                </p>
                <p className="mt-1 text-sm text-neutral-500">
                  Avg score: {b.averageScore.toFixed(1)} &middot; GIR:{" "}
                  {b.girPercentage.toFixed(0)}% &middot; Putts:{" "}
                  {b.puttsPerRound.toFixed(1)}
                </p>
              </Link>
            );
          })}
        </div>

        <div className="mt-12">
          <CalculatorCta surface="benchmarks_index" />
        </div>

        <footer className="mt-12 border-t border-cream-200 pt-6 pb-8">
          <p className="text-xs italic text-neutral-400">
            Benchmark data from Shot Scope, Arccos aggregate reports, and USGA
            handicap statistics. Benchmarks v{meta.version} (updated{" "}
            {meta.updatedAt}).{" "}
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
