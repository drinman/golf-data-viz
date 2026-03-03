import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-16 sm:py-24">
      <section className="rounded-lg border border-gray-200 bg-white p-8 text-center">
        <h1 className="text-2xl font-bold text-gray-900">Page not found</h1>
        <p className="mt-3 text-gray-600">
          This page doesn&apos;t exist. Maybe the URL was mistyped, or the link
          expired.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link
            href="/"
            className="inline-flex rounded-md bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800"
          >
            Go Home
          </Link>
          <Link
            href="/strokes-gained"
            className="inline-flex rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Benchmark a Round
          </Link>
        </div>
      </section>
    </main>
  );
}
