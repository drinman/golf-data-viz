import Link from "next/link";

export default function BenchmarkNotFound() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-16 sm:py-24">
      <section className="rounded-xl border border-card-border bg-card p-8 text-center shadow-sm">
        <h1 className="font-display text-2xl tracking-tight text-neutral-950">
          Bracket not found
        </h1>
        <p className="mt-3 text-neutral-600">
          This handicap bracket doesn&apos;t exist. Check the URL or browse all
          available brackets.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link
            href="/benchmarks"
            className="inline-flex rounded-lg bg-brand-800 px-4 py-2 text-sm font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-brand-700 hover:shadow-md active:translate-y-0"
          >
            View All Brackets
          </Link>
          <Link
            href="/strokes-gained"
            className="inline-flex rounded-lg border-2 border-cream-200 bg-white px-4 py-2 text-sm font-semibold text-neutral-800 transition-all duration-200 hover:border-brand-800/30 hover:bg-cream-50"
          >
            Benchmark a Round
          </Link>
        </div>
      </section>
    </main>
  );
}
