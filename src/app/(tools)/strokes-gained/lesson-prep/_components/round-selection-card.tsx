"use client";

import type { RoundSgSnapshot } from "@/lib/golf/trends";
import { formatSG } from "@/lib/golf/format";
import { cn } from "@/lib/utils";

interface RoundSelectionCardProps {
  round: RoundSgSnapshot;
  selected: boolean;
  disabled?: boolean;
  onToggle: () => void;
}

function formatCompactDate(dateStr: string): string {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function RoundSelectionCard({
  round,
  selected,
  disabled = false,
  onToggle,
}: RoundSelectionCardProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      className={cn(
        "w-full rounded-xl border px-4 py-4 text-left shadow-sm transition-all",
        selected
          ? "border-brand-300 bg-brand-50"
          : "border-card-border bg-white hover:border-brand-200 hover:shadow-md",
        disabled && "cursor-not-allowed opacity-60"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "inline-flex h-5 w-5 items-center justify-center rounded border text-[11px] font-semibold uppercase",
                selected
                  ? "border-brand-600 bg-brand-700 text-white"
                  : "border-neutral-300 bg-white text-neutral-500"
              )}
            >
              {selected ? "✓" : ""}
            </span>
            <p className="truncate font-medium text-neutral-950">{round.courseName}</p>
          </div>
          <p className="mt-1 text-sm text-neutral-500">
            {formatCompactDate(round.playedAt)} · Score {round.score} ·{" "}
            {round.handicapIndex.toFixed(1)} HCP
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p
            className={cn(
              "font-mono text-lg font-semibold",
              round.sgTotal >= 0 ? "text-data-positive" : "text-data-negative"
            )}
          >
            {formatSG(round.sgTotal)}
          </p>
          <p className="text-xs uppercase tracking-[0.12em] text-neutral-400">
            Proxy SG
          </p>
        </div>
      </div>
    </button>
  );
}
