"use client";

interface LastRoundBannerProps {
  courseName: string;
  score: number;
  date: string;
  onRestore: () => void;
  onDismiss: () => void;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function LastRoundBanner({
  courseName,
  score,
  date,
  onRestore,
  onDismiss,
}: LastRoundBannerProps) {
  return (
    <div
      data-testid="last-round-banner"
      className="animate-slide-down rounded-xl border border-brand-200 bg-brand-50/40 px-5 py-4"
    >
      <p className="text-sm font-medium text-neutral-900">
        Welcome back — pick up where you left off
      </p>
      <div className="mt-2 flex items-baseline gap-2 text-sm text-neutral-700">
        <span className="font-medium">{courseName}</span>
        <span className="text-neutral-400">&middot;</span>
        <span>{score}</span>
        <span className="text-neutral-400">&middot;</span>
        <span className="text-neutral-500">{formatDate(date)}</span>
      </div>
      <div className="mt-3 flex items-center gap-3">
        <button
          type="button"
          onClick={onRestore}
          className="min-h-11 rounded-lg bg-brand-800 px-4 py-2 text-sm font-medium text-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0"
        >
          View Results
        </button>
        <button
          type="button"
          onClick={onDismiss}
          className="inline-flex min-h-11 items-center text-sm text-neutral-500 transition-colors hover:text-neutral-700"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
