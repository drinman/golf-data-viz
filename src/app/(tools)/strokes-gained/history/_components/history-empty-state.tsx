import Link from "next/link";

export function HistoryEmptyState() {
  return (
    <div
      data-testid="history-empty-state"
      className="rounded-xl border border-card-border bg-card p-8 text-center shadow-sm"
    >
      <h2 className="font-display text-2xl tracking-tight text-neutral-950">
        No rounds yet
      </h2>
      <p className="mx-auto mt-3 max-w-sm text-neutral-600">
        Enter your first round in the SG Benchmarker to start tracking your
        progress over time.
      </p>
      <Link
        href="/strokes-gained"
        data-testid="empty-state-cta"
        className="mt-6 inline-block rounded-lg bg-brand-800 px-6 py-2.5 text-sm font-medium text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-brand-700 hover:shadow-md active:translate-y-0"
      >
        Enter a round
      </Link>
    </div>
  );
}
