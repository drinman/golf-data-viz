"use client";

import { useState } from "react";
import Link from "next/link";
import { TrendingUp, TrendingDown } from "lucide-react";
import type {
  BenchmarkMeta,
  PresentationTrust,
  StrokesGainedCategory,
  StrokesGainedResult,
} from "@/lib/golf/types";
import { BRACKET_LABELS, CATEGORY_LABELS, CATEGORY_ORDER, SG_NEAR_ZERO_THRESHOLD } from "@/lib/golf/constants";
import { getEmphasizedCategories } from "@/lib/golf/emphasis";
import { getPresentationPercentiles } from "@/lib/golf/percentile";
import { generateTroubleNarrative, type RoundTroubleContext } from "@/lib/golf/trouble-context";
import { formatSG, presentSG } from "@/lib/golf/format";
import { trackEvent } from "@/lib/analytics/client";
import { bracketToSlug } from "@/lib/seo/slugs";
import { isAssertivePresentationTrust } from "@/lib/golf/presentation-trust";
import { ConfidenceBadge } from "./confidence-badge";
import { MethodologyTooltip } from "./methodology-tooltip";
import { TroubleContextNarrative } from "./trouble-context-narrative";

// Emphasis copy is intentionally limited to putting + ATG — the only categories
// getEmphasizedCategories can return. Falls back to CATEGORY_DESCRIPTIONS if
// a future category is added without updating this map.
const EMPHASIS_COPY: Partial<Record<StrokesGainedCategory, string>> = {
  putting:
    "Putting is one of the strongest signals in this round.",
  "around-the-green":
    "Your short game shows a clear pattern.",
};

const CATEGORY_DESCRIPTIONS: Record<StrokesGainedCategory, string> = {
  "off-the-tee": "Driving accuracy and penalty avoidance vs your peers",
  approach: "Hitting greens in regulation vs your peers",
  "around-the-green": "Scrambling and up-and-down success vs your peers",
  putting: "Putting efficiency vs your peers",
};

interface ResultsSummaryProps {
  result: StrokesGainedResult;
  benchmarkMeta: BenchmarkMeta;
  presentationTrust?: PresentationTrust | null;
  troubleContext?: RoundTroubleContext | null;
  onRemoveTroubleContext?: () => void;
}

export function ResultsSummary({
  result,
  benchmarkMeta,
  presentationTrust,
  troubleContext,
  onRemoveTroubleContext,
}: ResultsSummaryProps) {
  const [openPopover, setOpenPopover] = useState<{
    type: "confidence" | "methodology";
    category: StrokesGainedCategory;
  } | null>(null);
  const skippedSet = new Set(result.skippedCategories);
  const estimatedSet = new Set(result.estimatedCategories);
  const isAssertive = isAssertivePresentationTrust(presentationTrust);
  const promotableSet = new Set(presentationTrust?.promotableCategories ?? CATEGORY_ORDER);

  const troubleNarrative = troubleContext ? generateTroubleNarrative(troubleContext) : null;

  const entries = CATEGORY_ORDER.map((key) => ({
    key,
    label: CATEGORY_LABELS[key],
    description: CATEGORY_DESCRIPTIONS[key],
    value: result.categories[key],
    skipped: skippedSet.has(key),
    estimated: estimatedSet.has(key),
  }));

  // Only non-estimated, non-skipped categories participate in callouts
  const calloutEntries = entries.filter(
    (e) =>
      !e.skipped &&
      !e.estimated &&
      (presentationTrust == null || promotableSet.has(e.key))
  );
  const sorted = [...calloutEntries].sort((a, b) => b.value - a.value);
  const strength = sorted.find((e) => e.value > SG_NEAR_ZERO_THRESHOLD) ?? null;
  const weakness = sorted.findLast((e) => e.value < -SG_NEAR_ZERO_THRESHOLD) ?? null;

  const emphasizedCategories = isAssertive
    ? getEmphasizedCategories(result).filter((category) => promotableSet.has(category))
    : [];
  const percentiles = getPresentationPercentiles(result, presentationTrust);

  // Find highest percentile >= 75th with non-low confidence,
  // excluding the category already featured in the strength card
  const standoutCandidates = CATEGORY_ORDER
    .filter((cat) =>
      !skippedSet.has(cat) &&
      result.confidence[cat] !== "low" &&
      percentiles[cat] !== null &&
      percentiles[cat]!.percentile >= 75 &&
      cat !== strength?.key
    )
    .map((cat) => ({ cat, pct: percentiles[cat]! }))
    .sort((a, b) => b.pct.percentile - a.pct.percentile);
  const standoutPercentile = standoutCandidates[0] ?? null;

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
    <div className="w-full space-y-6">
      {/* Total SG — hero card */}
      {(() => {
        const totalPresentation = presentSG(result.total);
        return (
      <div
        className={`animate-fade-up rounded-xl border px-6 py-6 ${
          totalPresentation.tone === "neutral"
            ? "border-cream-200 bg-neutral-50"
            : totalPresentation.tone === "positive"
              ? "border-brand-100 bg-brand-50"
              : "border-red-100 bg-red-50"
        }`}
      >
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-neutral-400">
          Total SG
        </p>
        <p
          className={`mt-1 font-display text-4xl tracking-tight sm:text-5xl ${
            totalPresentation.tone === "neutral"
              ? "text-neutral-500"
              : totalPresentation.tone === "positive"
                ? "text-data-positive"
                : "text-data-negative"
          }`}
        >
          {totalPresentation.formatted}
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
        );
      })()}

      {/* Benchmark bracket */}
      <p className="text-sm text-neutral-400">Compared to {bracketLabel}</p>
      {result.benchmarkBracket === "30+" && (
        <p className="text-xs text-amber-700">
          The 30+ bracket uses estimated benchmarks with limited published
          data. Results are less reliable than other brackets.
        </p>
      )}
      {(result.benchmarkBracket === "plus" || result.benchmarkInterpolationMode === "extrapolated" || result.benchmarkInterpolationMode === "scratch_clamped") && (
        <div data-testid="plus-handicap-disclosure" className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900 space-y-1">
          {result.benchmarkInterpolationMode === "extrapolated" ? (
            <p>
              <strong>Plus-handicap note:</strong> Your category benchmarks are
              estimated below scratch using extrapolated peer data. FIR% uses
              the scratch benchmark; other categories are projected for your
              handicap level.{" "}
              {result.totalAnchorMode === "course_neutral"
                ? "Total SG uses an extrapolated average score for your handicap level."
                : "Total SG still reflects your entered plus handicap."}
            </p>
          ) : (
            <p>
              Category benchmarks use scratch (0 HCP) peer data. Total SG
              reflects your plus handicap. Elite-specific category benchmarks
              are not yet available in this version.
            </p>
          )}
          {result.estimatedCategories && result.estimatedCategories.length > 0 && (
            <p>
              Some categories were estimated using standard assumptions,
              which may be less reliable for plus-handicap rounds.
            </p>
          )}
        </div>
      )}
      <p className="text-xs italic text-neutral-400">
        SG{" "}
        {benchmarkMeta.provisional && (
          <span className="not-italic rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-neutral-500">
            Beta
          </span>
        )}
        {" "}&middot;{" "}
        <Link href={result.benchmarkBracket === "plus" ? "/methodology" : "/benchmarks/" + bracketToSlug(result.benchmarkBracket)} className="underline hover:text-neutral-600">
          Benchmarks
        </Link>{" "}
        v{benchmarkMeta.version}
      </p>

      {/* Emphasis block — most actionable scorecard-based insights */}
      {!isAssertive && (
        <div
          data-testid="presentation-trust-card"
          className={`animate-fade-up rounded-lg border px-5 py-4 ${
            presentationTrust?.mode === "quarantined"
              ? "border-amber-200 bg-amber-50 text-amber-950"
              : "border-cream-200 bg-cream-50/50"
          }`}
          style={{ animationDelay: "200ms" }}
        >
          <p className="font-display text-sm font-semibold tracking-tight text-neutral-950">
            Round Summary
          </p>
          <p className="mt-1 text-sm text-neutral-600">
            Your total SG is course-adjusted. Individual category estimates are based on scorecard stats and may not reflect shot-by-shot performance.
          </p>
          <Link
            href="/methodology"
            className="mt-2 inline-block text-xs font-medium text-neutral-600 underline hover:text-neutral-800"
          >
            See methodology
          </Link>
        </div>
      )}
      {isAssertive && emphasizedCategories.length > 0 && (
        <div
          data-testid="emphasis-block"
          className="rounded-lg border border-brand-100 bg-brand-50/50 px-5 py-4"
        >
          <p className="font-display text-sm font-semibold tracking-tight text-neutral-950">
            Key Insights
          </p>
          <p className="mt-0.5 text-xs text-neutral-500">
            The clearest signals from this round.
          </p>
          <div className="mt-3 space-y-2.5">
            {emphasizedCategories.map((cat) => {
              const sg = presentSG(result.categories[cat]);
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
                      sg.tone === "neutral"
                        ? "text-neutral-500"
                        : sg.tone === "positive"
                          ? "text-data-positive"
                          : "text-data-negative"
                    }`}
                  >
                    {sg.formatted}
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

      {/* Trouble context narrative — inserted between emphasis and breakdown */}
      {troubleNarrative && troubleContext && (
        <TroubleContextNarrative
          narrative={troubleNarrative}
          teeCount={troubleContext.summary.tee}
          totalHoles={troubleContext.troubleHoles.length}
          onRemove={onRemoveTroubleContext}
        />
      )}

      {/* Per-category breakdown */}
      <ul className="space-y-3">
        {entries.map(({ key, label, description, value, skipped }, index) => {
          const sg = presentSG(value);
          return (
          <li
            key={key}
            className="animate-fade-up relative flex items-center justify-between rounded-lg border border-cream-200"
            style={{ animationDelay: `${(index + 2) * 100}ms` }}
          >
            {/* Colored left bar */}
            {!skipped && (
              <span
                className={`w-1 self-stretch ${
                  sg.tone === "neutral"
                    ? "bg-neutral-400"
                    : sg.tone === "positive"
                      ? "bg-data-positive"
                      : "bg-data-negative"
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
                  signalValue={result.diagnostics.provisionalCategoryValues?.[key]}
                  reconciliationAdjustment={result.diagnostics.reconciliationAdjustments?.[key]}
                  lowGirPuttingCaveat={key === "putting" ? result.diagnostics.lowGirPuttingCaveat : undefined}
                />
              </span>
              <span className="mt-0.5 block text-xs font-normal text-neutral-400">
                {description}
              </span>
              {!skipped && percentiles[key] && (() => {
                const pct = percentiles[key]!;
                const isLow = result.confidence[key] === "low";
                return (
                  <span className={`mt-1 flex items-center gap-1.5 text-[11px] ${
                    isLow ? "text-neutral-400" :
                    pct.tier === "top" ? "text-data-positive" :
                    pct.tier === "bottom" ? "text-data-negative" :
                    "text-neutral-500"
                  }`}>
                    <span className={`inline-block h-3 w-px rounded-full ${
                      isLow ? "bg-neutral-300" :
                      pct.tier === "top" ? "bg-data-positive/50" :
                      pct.tier === "bottom" ? "bg-data-negative/50" :
                      "bg-neutral-300"
                    }`} aria-hidden="true" />
                    <span>
                      <span className={`font-mono text-xs tabular-nums ${
                        isLow ? "" :
                        pct.tier === "top" || pct.tier === "bottom" ? "font-semibold" : "font-medium"
                      }`}>
                        {pct.percentile}%
                      </span>
                      <span className="ml-0.5 font-normal">
                        of {bracketLabel} golfers
                      </span>
                    </span>
                  </span>
                );
              })()}
              {key === "off-the-tee" && troubleContext && troubleContext.summary.tee >= 1 && (
                <span className="mt-0.5 inline-block rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
                  Trouble noted
                </span>
              )}
              {key === "putting" && result.diagnostics.lowGirPuttingCaveat && (
                <span
                  data-testid="low-gir-putting-caveat"
                  className="mt-0.5 inline-flex items-center gap-1 rounded bg-amber-100/80 px-1.5 py-0.5 text-[10px] font-medium text-amber-700"
                >
                  <span className="inline-block h-1 w-1 rounded-full bg-amber-400" aria-hidden="true" />
                  Low GIR — less reliable
                </span>
              )}
              {!skipped && sg.isPeerAverage && (
                <span
                  data-testid="peer-average-label"
                  className="mt-0.5 inline-block rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] font-medium text-neutral-500"
                >
                  Peer average
                </span>
              )}
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
                    sg.tone === "neutral"
                      ? "text-neutral-500"
                      : sg.tone === "positive"
                        ? "text-data-positive"
                        : "text-data-negative"
                  }`}
                >
                  {sg.formatted}
                </span>
              </span>
            )}
          </li>
          );
        })}
      </ul>
      {result.reconciliationUnattributed != null && Math.abs(result.reconciliationUnattributed) > 0.05 && (
        <div
          data-testid="unattributed-row"
          className="animate-fade-up flex items-center justify-between rounded-lg border border-dotted border-cream-200 bg-neutral-50 px-4 py-2.5"
          style={{ animationDelay: `${(entries.length + 2) * 100}ms` }}
        >
          <span className="flex items-baseline gap-1.5">
            <span className="text-sm text-neutral-400">Other</span>
            <span className="text-[10px] leading-none text-neutral-400/70">not captured by scorecard stats</span>
          </span>
          <span className="font-mono text-sm tabular-nums text-neutral-400">
            {formatSG(result.reconciliationUnattributed)}
          </span>
        </div>
      )}
      <p className="text-xs text-neutral-400">
        Confidence levels reflect input completeness. High = direct data. Med = derived estimate. Low = limited data.
        Percentile rankings are approximate estimates based on aggregate amateur data. See{" "}
        <Link href="/methodology" className="underline hover:text-neutral-600">
          methodology
        </Link>{" "}
        for details.
      </p>

      {/* Strength & Weakness callouts (need at least 2 non-estimated, non-skipped categories) */}
      {isAssertive && strength && weakness && calloutEntries.length >= 2 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-brand-100 bg-brand-50 px-4 py-3">
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
          <div className="rounded-lg border border-red-100 bg-red-50 px-4 py-3">
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
            {troubleNarrative?.weaknessCaveat && (
              <p className="mt-1 text-xs italic text-amber-700">
                {troubleNarrative.weaknessCaveat}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Standout percentile callout */}
      {isAssertive && standoutPercentile && (
        <div
          data-testid="percentile-standout"
          className="animate-fade-up relative overflow-hidden rounded-lg border border-brand-100 bg-gradient-to-br from-brand-50 to-cream-50"
          style={{ animationDelay: "600ms" }}
        >
          {/* Gold accent bar — top edge */}
          <div className="h-0.5 bg-gradient-to-r from-accent-500/60 via-accent-500 to-accent-500/60" />

          <div className="flex items-center gap-5 px-5 py-4">
            {/* Hero percentile number */}
            <div className="flex flex-col items-center">
              <span className="font-display text-3xl tracking-tight text-brand-800 sm:text-4xl">
                {standoutPercentile.pct.percentile}
                <span className="text-lg text-brand-600">%</span>
              </span>
              <span className="text-[10px] font-medium uppercase tracking-[0.15em] text-accent-500">
                Percentile
              </span>
            </div>

            {/* Vertical gold separator */}
            <div className="h-10 w-px bg-accent-500/30" />

            {/* Context */}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-neutral-950">
                Your {CATEGORY_LABELS[standoutPercentile.cat].toLowerCase()} beats
                <span className="text-data-positive"> {standoutPercentile.pct.percentile}%</span> of
                your peers
              </p>
              <p className="mt-0.5 text-xs text-neutral-500">
                vs {bracketLabel} golfers &middot; approximate
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
