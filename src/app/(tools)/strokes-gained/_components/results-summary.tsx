"use client";

import Link from "next/link";
import { TrendingUp, TrendingDown } from "lucide-react";
import type {
  BenchmarkMeta,
  StrokesGainedCategory,
  StrokesGainedResult,
} from "@/lib/golf/types";
import { BRACKET_LABELS } from "@/lib/golf/constants";

const CATEGORY_LABELS: Record<StrokesGainedCategory, string> = {
  "off-the-tee": "Off the Tee",
  approach: "Approach",
  "around-the-green": "Around the Green",
  putting: "Putting",
};

const CATEGORY_ORDER: StrokesGainedCategory[] = [
  "off-the-tee",
  "approach",
  "around-the-green",
  "putting",
];

function formatSG(value: number): string {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}`;
}

interface ResultsSummaryProps {
  result: StrokesGainedResult;
  benchmarkMeta: BenchmarkMeta;
}

export function ResultsSummary({ result, benchmarkMeta }: ResultsSummaryProps) {
  const skippedSet = new Set(result.skippedCategories);

  const entries = CATEGORY_ORDER.map((key) => ({
    key,
    label: CATEGORY_LABELS[key],
    value: result.categories[key],
    skipped: skippedSet.has(key),
  }));

  const activeEntries = entries.filter((e) => !e.skipped);
  const sorted = [...activeEntries].sort((a, b) => b.value - a.value);
  const strength = sorted[0];
  const weakness = sorted[sorted.length - 1];

  const bracketLabel =
    BRACKET_LABELS[result.benchmarkBracket] ?? result.benchmarkBracket;

  return (
    <div className="w-full max-w-lg space-y-6">
      {/* Total SG — hero card */}
      <div
        className={`rounded-xl px-6 py-5 ${
          result.total >= 0 ? "bg-brand-50" : "bg-red-50"
        }`}
      >
        <p className="text-sm font-medium text-neutral-600">Total Strokes Gained</p>
        <p
          className={`font-display text-4xl tracking-tight ${
            result.total >= 0 ? "text-data-positive" : "text-data-negative"
          }`}
        >
          {formatSG(result.total)}
        </p>
      </div>

      {/* Benchmark bracket */}
      <p className="text-sm text-neutral-400">Compared to {bracketLabel}</p>
      <p className="text-xs italic text-neutral-400">
        Estimated SG Proxy{benchmarkMeta.provisional ? " (provisional)" : ""} &middot;{" "}
        <Link href="/methodology" className="underline hover:text-neutral-600">
          Benchmarks
        </Link>{" "}
        v{benchmarkMeta.version}
      </p>

      {/* Per-category breakdown */}
      <ul className="space-y-3">
        {entries.map(({ key, label, value, skipped }) => (
          <li
            key={key}
            className="flex items-center justify-between overflow-hidden rounded-lg border border-card-border"
          >
            {/* Colored left bar */}
            {!skipped && (
              <span
                className={`w-1 self-stretch ${
                  value >= 0 ? "bg-data-positive" : "bg-data-negative"
                }`}
              />
            )}
            <span className="flex-1 px-4 py-3 text-sm font-medium text-neutral-800">
              {label}
            </span>
            {skipped ? (
              <span className="px-4 py-3 text-sm italic text-neutral-400">Not Tracked</span>
            ) : (
              <span
                className={`px-4 py-3 font-mono text-sm font-semibold tabular-nums ${
                  value >= 0 ? "text-data-positive" : "text-data-negative"
                }`}
              >
                {formatSG(value)}
              </span>
            )}
          </li>
        ))}
      </ul>

      {/* Strength & Weakness callouts (need at least 2 active categories) */}
      {strength && weakness && activeEntries.length >= 2 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-lg bg-brand-50 px-4 py-3">
            <div className="flex items-center gap-1.5">
              <TrendingUp className="h-3.5 w-3.5 text-data-positive" />
              <p className="text-xs font-medium uppercase tracking-wide text-data-positive">
                Biggest Strength
              </p>
            </div>
            <p className="mt-1 text-sm font-semibold text-neutral-950">
              {strength.label}
            </p>
            <p className="font-mono text-sm tabular-nums text-data-positive">{formatSG(strength.value)}</p>
          </div>
          <div className="rounded-lg bg-red-50 px-4 py-3">
            <div className="flex items-center gap-1.5">
              <TrendingDown className="h-3.5 w-3.5 text-data-negative" />
              <p className="text-xs font-medium uppercase tracking-wide text-data-negative">
                Biggest Weakness
              </p>
            </div>
            <p className="mt-1 text-sm font-semibold text-neutral-950">
              {weakness.label}
            </p>
            <p className="font-mono text-sm tabular-nums text-data-negative">{formatSG(weakness.value)}</p>
          </div>
        </div>
      )}
    </div>
  );
}
