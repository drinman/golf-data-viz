"use client";

import type { ReactNode, RefObject } from "react";
import Link from "next/link";
import type { RoundDetailSnapshot, StrokesGainedResult, RadarChartDatum } from "@/lib/golf/types";
import {
  toStrokesGainedResult,
  toRadarChartDataFromSnapshot,
} from "@/lib/golf/round-detail-adapter";
import { getBenchmarkMeta } from "@/lib/golf/benchmarks";
import { BRACKET_LABELS } from "@/lib/golf/constants";
import { formatHandicap, formatSG, formatDate } from "@/lib/golf/format";
import { RadarChart } from "@/components/charts/radar-chart";
import { ResultsSummary } from "./results-summary";
import { ShareCard } from "./share-card";

export interface RoundLayoutDerived {
  sgResult: StrokesGainedResult;
  chartData: RadarChartDatum[];
  benchmarkMeta: ReturnType<typeof getBenchmarkMeta>;
  bracketLabel: string;
}

export function deriveRoundData(snapshot: RoundDetailSnapshot): RoundLayoutDerived {
  const sgResult = toStrokesGainedResult(snapshot);
  const chartData = toRadarChartDataFromSnapshot(snapshot);
  const benchmarkMeta = getBenchmarkMeta();
  const bracketLabel =
    BRACKET_LABELS[sgResult.benchmarkBracket] ?? sgResult.benchmarkBracket;
  return { sgResult, chartData, benchmarkMeta, bracketLabel };
}

interface RoundLayoutProps {
  snapshot: RoundDetailSnapshot;
  derived: RoundLayoutDerived;
  shareCardRef: RefObject<HTMLDivElement | null>;
  /** Slot rendered before the header band (e.g. back link). */
  beforeHeader?: ReactNode;
  /** Slot rendered after the second gold separator (share/download actions). */
  actions: ReactNode;
  /** Whether to show the methodology page link in the footer. */
  methodologyLink?: boolean;
  /** Base animation delay offset in ms (default 0). */
  baseDelay?: number;
}

export function RoundLayout({
  snapshot,
  derived,
  shareCardRef,
  beforeHeader,
  actions,
  methodologyLink = false,
  baseDelay = 0,
}: RoundLayoutProps) {
  const { sgResult, chartData, benchmarkMeta, bracketLabel } = derived;
  const d = (step: number) => ({ animationDelay: `${baseDelay + step * 50}ms` });

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      {beforeHeader}

      {/* Header band */}
      <div
        className="mt-6 animate-fade-up overflow-hidden rounded-xl bg-brand-900 px-6 py-6 shadow-lg sm:px-8"
        style={d(1)}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h1 className="truncate font-display text-2xl font-bold text-white sm:text-3xl">
              {snapshot.courseName}
            </h1>
            <p className="mt-1.5 text-sm text-brand-100">
              {formatDate(snapshot.playedAt)} &middot; Shot {snapshot.score}{" "}
              &middot; {formatHandicap(snapshot.handicapIndex)} HCP
            </p>
            <p className="mt-0.5 text-sm text-brand-100/70">
              vs {bracketLabel}
            </p>
          </div>
          {/* Total SG badge */}
          <div className="flex shrink-0 flex-col items-center">
            <div
              className={`flex h-16 w-16 items-center justify-center rounded-full border-2 sm:h-20 sm:w-20 ${
                snapshot.sgTotal >= 0
                  ? "border-data-positive bg-data-positive/15"
                  : "border-data-negative bg-data-negative/15"
              }`}
            >
              <span
                className={`font-mono text-lg font-bold sm:text-xl ${
                  snapshot.sgTotal >= 0 ? "text-green-400" : "text-red-300"
                }`}
              >
                {formatSG(snapshot.sgTotal)}
              </span>
            </div>
            <p className="mt-1 text-xs text-brand-100/70">Proxy SG</p>
          </div>
        </div>
        {/* Gold separator */}
        <div className="mt-4 h-px bg-accent-500/50" />
      </div>

      {/* Radar chart */}
      <div
        className="mt-8 animate-fade-up rounded-xl border border-card-border bg-white p-4 shadow-sm sm:p-6"
        style={d(2)}
      >
        <div style={{ height: 400, maxHeight: "50vh", minHeight: 280 }}>
          <RadarChart data={chartData} bracketLabel={bracketLabel} />
        </div>
        <p className="mt-2 text-center text-xs text-neutral-400">
          + = better than peers &middot; − = room to grow &middot; Dashed line
          = peer average
        </p>
      </div>

      {/* Gold section separator */}
      <div
        className="mx-auto mt-10 h-px w-16 animate-fade-up bg-accent-500/40"
        style={d(3)}
      />

      {/* Results summary */}
      <div className="mt-10 animate-fade-up" style={d(4)}>
        <ResultsSummary result={sgResult} benchmarkMeta={benchmarkMeta} />
      </div>

      {/* Gold section separator */}
      <div
        className="mx-auto mt-10 h-px w-16 animate-fade-up bg-accent-500/40"
        style={d(5)}
      />

      {/* Actions slot (share/download) */}
      <div className="mt-10 animate-fade-up" style={d(6)}>
        {actions}
      </div>

      {/* Methodology note */}
      <div
        className="mt-10 animate-fade-up border-t border-neutral-100 pt-6 text-center text-xs text-neutral-400"
        style={d(7)}
      >
        <p>
          Proxy SG &middot; Benchmarks v{benchmarkMeta.version}
          {snapshot.methodologyVersion && (
            <> &middot; Methodology v{snapshot.methodologyVersion}</>
          )}
        </p>
        {methodologyLink && (
          <Link
            href="/methodology"
            className="mt-1 inline-block underline transition-colors hover:text-neutral-600"
          >
            How Proxy Strokes Gained works
          </Link>
        )}
      </div>

      {/* Off-screen ShareCard for PNG capture */}
      <div
        className="pointer-events-none fixed left-[-9999px] top-0"
        aria-hidden="true"
      >
        <ShareCard
          ref={shareCardRef}
          result={sgResult}
          chartData={chartData}
          courseName={snapshot.courseName}
          score={snapshot.score}
          benchmarkMeta={benchmarkMeta}
        />
      </div>
    </main>
  );
}
