import Link from "next/link";
import { trackEvent } from "@/lib/analytics/client";

export function HistoryEmptyState() {
  return (
    <div
      data-testid="history-empty-state"
      className="rounded-xl border border-cream-200 bg-card p-8 text-center shadow-sm"
    >
      <h2 className="font-display text-2xl tracking-tight text-neutral-950">
        No rounds yet
      </h2>
      <p className="mx-auto mt-3 max-w-sm text-neutral-600">
        Log your first round to start tracking strokes gained over time.
      </p>
      <Link
        href="/strokes-gained?from=history"
        data-testid="empty-state-cta"
        onClick={() => trackEvent("history_link_clicked", { surface: "history_empty_state_cta" })}
        className="mt-6 inline-block rounded-lg bg-brand-800 px-6 py-2.5 text-sm font-medium text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-brand-700 hover:shadow-md active:translate-y-0"
      >
        Log a Round
      </Link>
    </div>
  );
}
