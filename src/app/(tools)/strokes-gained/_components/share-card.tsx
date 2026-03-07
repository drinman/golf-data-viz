"use client";

import { forwardRef } from "react";
import type {
  BenchmarkMeta,
  StrokesGainedResult,
  RadarChartDatum,
} from "@/lib/golf/types";
import { BRACKET_LABELS, CATEGORY_LABELS, CATEGORY_ORDER } from "@/lib/golf/constants";
import { RadarChart } from "@/components/charts/radar-chart";
import { ConfidenceBadge } from "./confidence-badge";

function formatSG(value: number): string {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}`;
}

interface ShareCardProps {
  result: StrokesGainedResult;
  chartData: RadarChartDatum[];
  courseName: string;
  score: number;
  benchmarkMeta?: BenchmarkMeta;
}

export const ShareCard = forwardRef<HTMLDivElement, ShareCardProps>(
  function ShareCard({ result, chartData, courseName, score, benchmarkMeta }, ref) {
    const bracketLabel =
      BRACKET_LABELS[result.benchmarkBracket] ?? result.benchmarkBracket;

    const skippedSet = new Set(result.skippedCategories);
    const estimatedSet = new Set(result.estimatedCategories);
    const entries = CATEGORY_ORDER.map((key) => ({
      key,
      label: CATEGORY_LABELS[key],
      value: result.categories[key],
      skipped: skippedSet.has(key),
      estimated: estimatedSet.has(key),
    }));

    return (
      <div
        ref={ref}
        data-testid="share-card"
        className="w-[600px] overflow-hidden rounded-xl shadow-lg"
        style={{ fontFamily: "DM Sans, sans-serif" }}
      >
        {/* Dark green header band */}
        <div className="bg-brand-900 px-8 pb-5 pt-6">
          <div className="flex items-start justify-between">
            <div className="min-w-0 flex-1 pr-4">
              <h2 className="truncate font-display text-xl font-bold text-white">
                {courseName}
              </h2>
              <p className="mt-1 text-sm text-brand-100">
                Shot {score} &middot; vs {bracketLabel}
                {result.totalAnchorMode === "course_adjusted" && " \u00b7 Course-Adjusted"}
                {result.totalAnchorMode === "course_neutral" && " \u00b7 Course-Neutral"}
              </p>
              {benchmarkMeta && (
                <p className="mt-0.5 text-xs italic text-brand-100/70">
                  Proxy SG &mdash; scorecard-based estimate &middot; Benchmarks v{benchmarkMeta.version}
                </p>
              )}
            </div>
            {/* Total SG badge */}
            <div className="flex flex-col items-center">
              <div
                className={`flex h-16 w-16 items-center justify-center rounded-full border-2 ${
                  result.total >= 0
                    ? "border-data-positive bg-data-positive/15"
                    : "border-data-negative bg-data-negative/15"
                }`}
              >
                <span
                  className={`font-mono text-lg font-bold ${
                    result.total >= 0 ? "text-green-400" : "text-red-300"
                  }`}
                >
                  {formatSG(result.total)}
                </span>
              </div>
              <p className="mt-1 text-xs text-brand-100/70">Proxy SG</p>
            </div>
          </div>
          {/* Gold separator */}
          <div className="mt-4 h-px bg-accent-500/50" />
        </div>

        {/* White body */}
        <div className="bg-white px-8 py-5">
          {/* Radar chart */}
          <div style={{ height: 300 }}>
            <RadarChart data={chartData} bracketLabel={bracketLabel} />
          </div>
          <p className="mt-2 text-center text-xs text-neutral-400">
            + = better than peers · − = room to grow · Dashed line = peer
            average
          </p>

          {/* Category rows */}
          <div className="mt-4 space-y-1.5">
            {entries.map(({ key, label, value, skipped }, i) => (
              <div
                key={key}
                className={`flex items-center justify-between overflow-hidden rounded-md ${
                  i % 2 === 0 ? "bg-white" : "bg-cream-50"
                }`}
              >
                {/* Colored left bar */}
                {!skipped && (
                  <span
                    className={`w-1 self-stretch ${
                      value >= 0 ? "bg-data-positive" : "bg-data-negative"
                    }`}
                  />
                )}
                <span className="flex-1 px-4 py-2 text-sm font-medium text-neutral-800">
                  {label}
                </span>
                {skipped ? (
                  <span className="px-4 py-2 text-sm italic text-neutral-400">
                    Not Tracked
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 px-4 py-2">
                    <ConfidenceBadge
                      level={result.confidence[key]}
                      category={key}
                      interactive={false}
                    />
                    <span
                      className={`font-mono text-sm font-semibold ${
                        value >= 0 ? "text-data-positive" : "text-data-negative"
                      }`}
                    >
                      {formatSG(value)}
                    </span>
                  </span>
                )}
              </div>
            ))}
          </div>

          <p className="mt-3 text-center text-[10px] text-neutral-400">
            Proxy SG — scorecard-based estimate. Confidence: High = direct data, Med = derived, Low = limited.
          </p>

          {/* Watermark */}
          <div className="mt-5 flex items-center justify-center gap-2">
            {/* Mini contour mark */}
            <svg width="14" height="14" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path d="M16 2C8.268 2 2 8.268 2 16s6.268 14 14 14c5.1 0 9.6-2.73 12.07-6.81" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
              <path d="M16 7C11.029 7 7 11.029 7 16s4.029 9 9 9c3.28 0 6.17-1.76 7.75-4.38" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" opacity="0.7" />
              <circle cx="16" cy="16" r="1.8" fill="currentColor" />
            </svg>
            <p className="text-xs text-accent-500">
              Golf Data Viz &middot; golfdataviz.com/strokes-gained
            </p>
          </div>
        </div>
      </div>
    );
  }
);
