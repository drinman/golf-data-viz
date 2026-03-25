"use client";

import { forwardRef } from "react";
import type { LessonReportSnapshot } from "@/lib/golf/round-queries";
import { formatDate, formatSG, presentSG } from "@/lib/golf/format";
function confidenceTone(level: string): string {
  switch (level) {
    case "high":
      return "text-data-positive";
    case "medium":
      return "text-amber-700";
    default:
      return "text-neutral-500";
  }
}

export const LessonReportShareCard = forwardRef<
  HTMLDivElement,
  { snapshot: LessonReportSnapshot }
>(function LessonReportShareCard({ snapshot }, ref) {
  const report = snapshot.reportData;
  const trustMode = report.trustMode;
  const isCaveatedReport = trustMode === "caveated";

  return (
    <div
      ref={ref}
      data-testid="lesson-report-share-card"
      className="w-[600px] overflow-hidden rounded-xl border border-brand-950/10 bg-cream-50 p-10 text-neutral-950 shadow-2xl"
    >
      <div className="rounded-[24px] bg-brand-900 px-8 py-7 text-white">
        <p className="text-xs uppercase tracking-[0.3em] text-brand-100/80">
          Lesson Prep Report
        </p>
        <div className="mt-3 flex items-start justify-between gap-6">
          <div className="min-w-0">
            <h2 className="font-display text-4xl tracking-tight">
              {report.summary.roundCount} rounds ·{" "}
              {formatDate(report.summary.startDate)} to{" "}
              {formatDate(report.summary.endDate)}
            </h2>
            <p className="mt-2 text-base text-brand-100/80">
              {isCaveatedReport
                ? "Snapshot-generated for coaching conversations. Reliable round patterns, confidence, and methodology caveats included."
                : "Snapshot-generated for coaching conversations. SG analysis, confidence, and methodology caveats included."}
            </p>
          </div>
          <div className="rounded-xl border border-white/20 bg-white/10 px-6 py-5 text-center">
            <p className="text-xs uppercase tracking-[0.2em] text-brand-100/70">
              Avg SG
            </p>
            <p className="mt-1 font-display text-5xl text-white">
              {formatSG(report.summary.averageSgTotal)}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-cream-200 bg-white px-5 py-5">
          <p className="text-xs uppercase tracking-[0.18em] text-neutral-400">
            {isCaveatedReport ? "Round Pattern" : "Primary Focus Area"}
          </p>
          <p className="mt-2 font-display text-2xl tracking-tight text-neutral-950">
            {report.focusArea.label}
          </p>
          <p
            className={`mt-1 font-mono tabular-nums text-lg ${presentSG(report.focusArea.averageSg).tone === "neutral" ? "text-neutral-500" : "text-data-negative"}`}
          >
            {formatSG(report.focusArea.averageSg)}
          </p>
          <p
            className={`mt-2 text-xs font-medium uppercase tracking-[0.18em] ${confidenceTone(report.focusArea.confidence)}`}
          >
            {report.focusArea.confidence} confidence
          </p>
        </div>

        <div className="rounded-xl border border-cream-200 bg-white px-5 py-5">
          <p className="text-xs uppercase tracking-[0.18em] text-neutral-400">
            {isCaveatedReport ? "Reliable Signal" : "Strongest Area"}
          </p>
          <p className="mt-2 font-display text-2xl tracking-tight text-neutral-950">
            {report.strongestArea.label}
          </p>
          <p
            className={`mt-1 font-mono tabular-nums text-lg ${presentSG(report.strongestArea.averageSg).tone === "neutral" ? "text-neutral-500" : "text-data-positive"}`}
          >
            {formatSG(report.strongestArea.averageSg)}
          </p>
          <p
            className={`mt-2 text-xs font-medium uppercase tracking-[0.18em] ${confidenceTone(report.strongestArea.confidence)}`}
          >
            {report.strongestArea.confidence} confidence
          </p>
        </div>

        <div className="rounded-xl border border-cream-200 bg-white px-5 py-5">
          <p className="text-xs uppercase tracking-[0.18em] text-neutral-400">
            Trend Signal
          </p>
          <p className="mt-2 font-display text-2xl tracking-tight text-neutral-950">
            {report.trendSignal.label}
          </p>
          <p className="mt-1 text-sm leading-relaxed text-neutral-600">
            {report.trendSignal.copyText}
          </p>
        </div>
      </div>

      <div className="mt-6 border-t border-cream-200 pt-4 text-center text-xs text-neutral-500">
        Golf Data Viz · SG Analysis · Report v{snapshot.reportVersion} ·
        golfdataviz.com/strokes-gained
      </div>
    </div>
  );
});
