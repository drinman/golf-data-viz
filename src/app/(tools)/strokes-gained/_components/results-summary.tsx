"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
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

const CATEGORY_DESCRIPTIONS: Record<StrokesGainedCategory, string> = {
  "off-the-tee": "Driving accuracy and penalty avoidance vs your peers",
  approach: "Hitting greens in regulation vs your peers",
  "around-the-green": "Scrambling and up-and-down success vs your peers",
  putting: "Putting efficiency and three-putt avoidance vs your peers",
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
  const [openEstimate, setOpenEstimate] = useState<StrokesGainedCategory | null>(
    null
  );
  const skippedSet = new Set(result.skippedCategories);
  const estimatedSet = new Set(result.estimatedCategories);

  const entries = CATEGORY_ORDER.map((key) => ({
    key,
    label: CATEGORY_LABELS[key],
    description: CATEGORY_DESCRIPTIONS[key],
    value: result.categories[key],
    skipped: skippedSet.has(key),
    estimated: estimatedSet.has(key),
  }));

  // Only non-estimated, non-skipped categories participate in callouts
  const calloutEntries = entries.filter((e) => !e.skipped && !e.estimated);
  const sorted = [...calloutEntries].sort((a, b) => b.value - a.value);
  const strength = sorted[0];
  const weakness = sorted[sorted.length - 1];

  const bracketLabel =
    BRACKET_LABELS[result.benchmarkBracket] ?? result.benchmarkBracket;

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpenEstimate(null);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

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
      {result.benchmarkBracket === "30+" && (
        <p className="text-xs text-amber-700">
          The 30+ bracket uses estimated benchmarks with limited published
          data. Results are less reliable than other brackets.
        </p>
      )}
      <p className="text-xs italic text-neutral-400">
        Peer-compared SG{" "}
        {benchmarkMeta.provisional && (
          <span className="not-italic rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-neutral-500">
            Beta
          </span>
        )}
        {" "}&middot;{" "}
        <Link href="/methodology" className="underline hover:text-neutral-600">
          Benchmarks
        </Link>{" "}
        v{benchmarkMeta.version}
      </p>

      {/* Per-category breakdown */}
      <ul className="space-y-3">
        {entries.map(({ key, label, description, value, skipped, estimated }) => (
          <li
            key={key}
            className="relative flex items-center justify-between rounded-lg border border-card-border"
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
              <span className="mt-0.5 block text-xs font-normal text-neutral-400">
                {description}
              </span>
            </span>
            {skipped ? (
              <span className="px-4 py-3 text-sm italic text-neutral-400">Not Tracked</span>
            ) : (
              <span className="relative flex items-center gap-1.5 px-4 py-3">
                {estimated && (
                  <button
                    type="button"
                    aria-label="Est."
                    aria-expanded={openEstimate === key}
                    aria-controls={`estimate-help-${key}`}
                    onClick={() =>
                      setOpenEstimate((current) => (current === key ? null : key))
                    }
                    className="rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] font-medium text-neutral-500 transition-colors hover:bg-neutral-200 focus:outline-none focus:ring-2 focus:ring-brand-800/30"
                  >
                    Est.
                  </button>
                )}
                <span
                  className={`font-mono text-sm font-semibold tabular-nums ${
                    value >= 0 ? "text-data-positive" : "text-data-negative"
                  }`}
                >
                  {formatSG(value)}
                </span>
                {estimated && openEstimate === key && (
                  <div
                    id={`estimate-help-${key}`}
                    role="dialog"
                    aria-label={`${label} estimate details`}
                    className="absolute right-0 top-full z-10 mt-2 w-56 rounded-lg border border-cream-200 bg-white p-3 text-left text-xs leading-relaxed text-neutral-600 shadow-lg"
                  >
                    This category is estimated from related stats because not
                    all inputs were provided.
                  </div>
                )}
              </span>
            )}
          </li>
        ))}
      </ul>
      {estimatedSet.size > 0 && (
        <p className="text-xs text-neutral-400">
          Categories marked Est. are approximated from related inputs. See{" "}
          <Link href="/methodology" className="underline hover:text-neutral-600">
            methodology
          </Link>{" "}
          for details.
        </p>
      )}

      {/* Strength & Weakness callouts (need at least 2 non-estimated, non-skipped categories) */}
      {strength && weakness && calloutEntries.length >= 2 && (
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
            <p className="text-xs text-neutral-500">
              {CATEGORY_DESCRIPTIONS[strength.key]}
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
            <p className="text-xs text-neutral-500">
              {CATEGORY_DESCRIPTIONS[weakness.key]}
            </p>
            <p className="font-mono text-sm tabular-nums text-data-negative">{formatSG(weakness.value)}</p>
          </div>
        </div>
      )}
    </div>
  );
}
