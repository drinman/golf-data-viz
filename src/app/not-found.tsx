import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-16 sm:py-24">
      <section className="rounded-xl border border-cream-200 bg-white p-8 text-center shadow-sm">
        <h1 className="font-display text-2xl tracking-tight text-neutral-950">Page not found</h1>
        <p className="mt-3 text-neutral-600">
          This page doesn&apos;t exist. Maybe the URL was mistyped, or the link
          expired.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link
            href="/"
            className="inline-flex min-h-11 items-center rounded-lg bg-brand-800 px-5 py-2.5 text-sm font-medium text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-brand-700 hover:shadow-md active:translate-y-0"
          >
            Go Home
          </Link>
          <Link
            href="/strokes-gained"
            className="inline-flex min-h-11 items-center rounded-lg border-2 border-cream-200 bg-white px-4 py-2 text-sm font-medium text-neutral-800 transition-all duration-200 hover:border-brand-800/30 hover:bg-cream-50"
          >
            Benchmark a Round
          </Link>
        </div>
      </section>
    </main>
  );
}
