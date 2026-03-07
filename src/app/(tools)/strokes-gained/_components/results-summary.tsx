"use client";

import { useState } from "react";
import Link from "next/link";
import { TrendingUp, TrendingDown } from "lucide-react";
import type {
  BenchmarkMeta,
  StrokesGainedCategory,
  StrokesGainedResult,
} from "@/lib/golf/types";
import { BRACKET_LABELS, CATEGORY_LABELS, CATEGORY_ORDER } from "@/lib/golf/constants";
import { getEmphasizedCategories } from "@/lib/golf/emphasis";
import { trackEvent } from "@/lib/analytics/client";
import { ConfidenceBadge } from "./confidence-badge";
import { MethodologyTooltip } from "./methodology-tooltip";

// Emphasis copy is intentionally limited to putting + ATG — the only categories
// getEmphasizedCategories can return. Falls back to CATEGORY_DESCRIPTIONS if
// a future category is added without updating this map.
const EMPHASIS_COPY: Partial<Record<StrokesGainedCategory, string>> = {
  putting:
    "Putting is one of the clearest scorecard-based signals in this round.",
  "around-the-green":
    "Your short-game result looks actionable here because the supporting inputs are strong enough to trust directionally.",
};

const CATEGORY_DESCRIPTIONS: Record<StrokesGainedCategory, string> = {
  "off-the-tee": "Driving accuracy and penalty avoidance vs your peers",
  approach: "Hitting greens in regulation vs your peers",
  "around-the-green": "Scrambling and up-and-down success vs your peers",
  putting: "Putting efficiency vs your peers",
};

function formatSG(value: number): string {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}`;
}

interface ResultsSummaryProps {
  result: StrokesGainedResult;
  benchmarkMeta: BenchmarkMeta;
}

export function ResultsSummary({ result, benchmarkMeta }: ResultsSummaryProps) {
  const [openPopover, setOpenPopover] = useState<{
    type: "confidence" | "methodology";
    category: StrokesGainedCategory;
  } | null>(null);
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

  const emphasizedCategories = getEmphasizedCategories(result);

  function handleDetailToggle(
    type: "confidence" | "methodology",
    category: StrokesGainedCategory
  ) {
    const isClosing =
      openPopover?.type === type && openPopover.category === category;
    setOpenPopover(isClosing ? null : { type, category });
    if (!isClosing) {
      trackEvent("category_detail_interacted", {
        category,
        interaction_type:
          type === "confidence" ? "confidence_badge" : "methodology_tooltip",
        surface: "results_page",
      });
    }
  }

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
        <p className="text-sm font-medium text-neutral-600">Total Proxy SG</p>
        <p
          className={`font-display text-4xl tracking-tight ${
            result.total >= 0 ? "text-data-positive" : "text-data-negative"
          }`}
        >
          {formatSG(result.total)}
        </p>
        {result.totalAnchorMode === "course_adjusted" && (
          <span className="mt-2 inline-block rounded-full bg-brand-50 px-2.5 py-0.5 text-[11px] font-medium text-data-positive">
            Course-Adjusted
          </span>
        )}
        {result.totalAnchorMode === "course_neutral" && (
          <span className="mt-2 inline-block rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-medium text-amber-700">
            Course-Neutral Estimate
          </span>
        )}
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
        Proxy SG (scorecard-based){" "}
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

      {/* Emphasis block — most actionable scorecard-based insights */}
      {emphasizedCategories.length > 0 && (
        <div
          data-testid="emphasis-block"
          className="rounded-lg border border-brand-100 bg-brand-50/50 px-5 py-4"
        >
          <p className="font-display text-sm font-semibold tracking-tight text-neutral-950">
            Most actionable scorecard-based insights
          </p>
          <p className="mt-0.5 text-xs text-neutral-500">
            These are the clearest signals from your scorecard-based round data today.
          </p>
          <div className="mt-3 space-y-2.5">
            {emphasizedCategories.map((cat) => {
              const value = result.categories[cat];
              return (
                <div
                  key={cat}
                  className="flex items-start justify-between gap-3"
                >
                  <div className="min-w-0 flex-1">
                    <span className="inline-flex items-center gap-1.5 text-sm font-medium text-neutral-800">
                      {CATEGORY_LABELS[cat]}
                      <ConfidenceBadge
                        level={result.confidence[cat]}
                        category={cat}
                        interactive={false}
                      />
                    </span>
                    <p className="mt-0.5 text-xs leading-relaxed text-neutral-500">
                      {EMPHASIS_COPY[cat] ?? CATEGORY_DESCRIPTIONS[cat]}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 font-mono text-sm font-semibold tabular-nums ${
                      value >= 0 ? "text-data-positive" : "text-data-negative"
                    }`}
                  >
                    {formatSG(value)}
                  </span>
                </div>
              );
            })}
          </div>
          {emphasizedCategories.length === 1 && (
            <p className="mt-2.5 text-xs text-neutral-400">
              Other categories are available below with confidence details.
            </p>
          )}
        </div>
      )}

      {/* Per-category breakdown */}
      <ul className="space-y-3">
        {entries.map(({ key, label, description, value, skipped }) => (
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
              <span className="inline-flex items-center gap-1">
                {label}
                <MethodologyTooltip
                  category={key}
                  isOpen={openPopover?.type === "methodology" && openPopover.category === key}
                  onToggle={() => handleDetailToggle("methodology", key)}
                />
              </span>
              <span className="mt-0.5 block text-xs font-normal text-neutral-400">
                {description}
              </span>
            </span>
            {skipped ? (
              <span className="px-4 py-3 text-sm italic text-neutral-400">Not Tracked</span>
            ) : (
              <span className="relative flex items-center gap-1.5 px-4 py-3">
                <ConfidenceBadge
                  level={result.confidence[key]}
                  category={key}
                  isOpen={openPopover?.type === "confidence" && openPopover.category === key}
                  onToggle={() => handleDetailToggle("confidence", key)}
                />
                <span
                  className={`font-mono text-sm font-semibold tabular-nums ${
                    value >= 0 ? "text-data-positive" : "text-data-negative"
                  }`}
                >
                  {formatSG(value)}
                </span>
              </span>
            )}
          </li>
        ))}
      </ul>
      <p className="text-xs text-neutral-400">
        Confidence levels reflect input completeness. High = direct data. Med = derived estimate. Low = limited data. See{" "}
        <Link href="/methodology" className="underline hover:text-neutral-600">
          methodology
        </Link>{" "}
        for details.
      </p>

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
