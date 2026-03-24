"use client";

import type { ReactNode, RefObject } from "react";
import Link from "next/link";
import type {
  PresentationTrust,
  RoundDetailSnapshot,
  StrokesGainedResult,
  RadarChartDatum,
} from "@/lib/golf/types";
import {
  toStrokesGainedResult,
  toRadarChartDataFromSnapshot,
} from "@/lib/golf/round-detail-adapter";
import { getBenchmarkMeta } from "@/lib/golf/benchmarks";
import { BRACKET_LABELS } from "@/lib/golf/constants";
import { formatHandicap, formatDate, formatScoringBreakdown, buildFamiliarStats, presentSG } from "@/lib/golf/format";
import { derivePresentationTrustFromSnapshot } from "@/lib/golf/presentation-trust";
import { RadarChart } from "@/components/charts/radar-chart";
import { ResultsSummary } from "./results-summary";
import { ShareCard } from "./share-card";

export interface RoundLayoutDerived {
  sgResult: StrokesGainedResult;
  chartData: RadarChartDatum[];
  benchmarkMeta: ReturnType<typeof getBenchmarkMeta>;
  bracketLabel: string;
  presentationTrust?: PresentationTrust;
}

export function deriveRoundData(snapshot: RoundDetailSnapshot): RoundLayoutDerived {
  const sgResult = toStrokesGainedResult(snapshot);
  const chartData = toRadarChartDataFromSnapshot(snapshot);
  const benchmarkMeta = getBenchmarkMeta();
  const bracketLabel =
    BRACKET_LABELS[sgResult.benchmarkBracket] ?? sgResult.benchmarkBracket;
  const presentationTrust = derivePresentationTrustFromSnapshot(snapshot);
  return { sgResult, chartData, benchmarkMeta, bracketLabel, presentationTrust };
}

interface RoundLayoutProps {
  snapshot: RoundDetailSnapshot;
  derived: RoundLayoutDerived;
  shareCardRef: RefObject<HTMLDivElement | null>;
  /** Slot rendered before the header band (e.g. back link). */
  beforeHeader?: ReactNode;
  /** Slot rendered between radar chart and first gold separator. */
  interstitial?: ReactNode;
  /** Slot rendered after the second gold separator (share/download actions). */
  actions: ReactNode;
  /** Slot rendered after the actions slot, before methodology footer. */
  bottomCta?: ReactNode;
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
  interstitial,
  actions,
  bottomCta,
  methodologyLink = false,
  baseDelay = 0,
}: RoundLayoutProps) {
  const { sgResult, chartData, benchmarkMeta, bracketLabel, presentationTrust } = derived;
  const d = (step: number) => ({ animationDelay: `${baseDelay + step * 50}ms` });

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      {beforeHeader}

      {/* Header band — score-first box score */}
      <div
        className="mt-6 animate-fade-up overflow-hidden rounded-xl bg-brand-900 px-6 py-6 shadow-lg sm:px-8"
        style={d(1)}
      >
        <h1 className="truncate font-display text-lg font-bold text-brand-100 sm:text-xl">
          {snapshot.courseName}
        </h1>
        <p className="mt-1 text-sm text-brand-100/70">
          {formatDate(snapshot.playedAt)}
        </p>

        {/* Score + SG hero row */}
        <div className="mt-4 flex items-center gap-6 sm:gap-8">
          <div className="flex flex-col items-center">
            <span className="font-display text-5xl font-bold text-white sm:text-6xl">
              {snapshot.score}
            </span>
            <span className="mt-1 text-xs uppercase tracking-wider text-brand-100/70">Score</span>
          </div>
          {(() => {
            const totalSg = presentSG(snapshot.sgTotal);
            return (
          <div className="flex flex-col items-center">
            <div
              className={`flex h-16 w-16 items-center justify-center rounded-full border-2 sm:h-20 sm:w-20 ${
                totalSg.tone === "neutral"
                  ? "border-neutral-400 bg-neutral-400/15"
                  : totalSg.tone === "positive"
                    ? "border-data-positive bg-data-positive/15"
                    : "border-data-negative bg-data-negative/15"
              }`}
            >
              <span
                className={`font-mono text-lg font-bold sm:text-xl ${
                  totalSg.tone === "neutral"
                    ? "text-neutral-300"
                    : totalSg.tone === "positive"
                      ? "text-green-400"
                      : "text-red-300"
                }`}
              >
                {totalSg.formatted}
              </span>
            </div>
            <span className="mt-1 text-xs text-brand-100/70">SG vs peers</span>
          </div>
            );
          })()}
        </div>

        <p className="mt-2 text-sm text-brand-100/70">
          {formatHandicap(snapshot.handicapIndex)} index &middot; vs {bracketLabel}
        </p>
        <p className="mt-0.5 text-xs text-brand-100/50">
          Scorecard-based estimate
        </p>

        {/* Gold separator */}
        <div className="mt-4 h-px bg-accent-500/50" />

        {/* Familiar stats row */}
        {(() => {
          const familiar = buildFamiliarStats(snapshot);
          return familiar.length > 0 ? (
            <p className="mt-3 text-sm text-brand-100">
              {familiar.join(" · ")}
            </p>
          ) : null;
        })()}

        {/* Scoring distribution row */}
        {(() => {
          if (snapshot.eagles == null) return null;
          const breakdown = formatScoringBreakdown({
            eagles: snapshot.eagles ?? 0,
            birdies: snapshot.birdies ?? 0,
            pars: snapshot.pars ?? 0,
            bogeys: snapshot.bogeys ?? 0,
            doubleBogeys: snapshot.doubleBogeys ?? 0,
            triplePlus: snapshot.triplePlus ?? 0,
          });
          return breakdown.length > 0 ? (
            <p className="mt-1 text-sm text-brand-100/70">
              {breakdown.join(" · ")}
            </p>
          ) : null;
        })()}
      </div>

      {/* Radar chart */}
      <div
        className="mt-8 animate-fade-up rounded-xl border border-cream-200 bg-white p-4 shadow-sm sm:p-6"
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

      {/* Interstitial slot (e.g. conversion CTA on shared round pages) */}
      {interstitial && (
        <div className="mt-8 animate-fade-up" style={d(2)}>
          {interstitial}
        </div>
      )}

      {/* Gold section separator */}
      <div
        className="mx-auto mt-10 h-px w-16 animate-fade-up bg-accent-500/40"
        style={d(3)}
      />

      {/* Results summary — id is the scroll target for InterstitialCta "Skip to full results" link */}
      <div id="results-summary" className="mt-10 animate-fade-up" style={d(4)}>
        <ResultsSummary
          result={sgResult}
          benchmarkMeta={benchmarkMeta}
          presentationTrust={presentationTrust}
        />
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

      {/* Bottom CTA slot */}
      {bottomCta && (
        <div className="mt-8 animate-fade-up" style={d(6)}>
          {bottomCta}
        </div>
      )}

      {/* Methodology note */}
      <div
        className="mt-10 animate-fade-up border-t border-cream-200 pt-6 text-center text-xs text-neutral-400"
        style={d(7)}
      >
        <p>
          SG &middot; Benchmarks v{benchmarkMeta.version}
          {snapshot.methodologyVersion && (
            <> &middot; Methodology v{snapshot.methodologyVersion}</>
          )}
        </p>
        {methodologyLink && (
          <Link
            href="/methodology"
            className="mt-1 inline-block underline transition-colors hover:text-neutral-600"
          >
            How Strokes Gained works
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
          presentationTrust={presentationTrust}
          roundInput={
            snapshot.eagles != null
              ? {
                  course: snapshot.courseName,
                  date: snapshot.playedAt,
                  score: snapshot.score,
                  handicapIndex: snapshot.handicapIndex,
                  courseRating: snapshot.courseRating ?? 72,
                  slopeRating: snapshot.slopeRating ?? 113,
                  fairwaysHit: snapshot.fairwaysHit ?? undefined,
                  fairwayAttempts: snapshot.fairwayAttempts ?? 14,
                  greensInRegulation: snapshot.greensInRegulation ?? undefined,
                  totalPutts: snapshot.totalPutts ?? 36,
                  onePutts: snapshot.onePutts ?? undefined,
                  penaltyStrokes: snapshot.penaltyStrokes ?? 0,
                  eagles: snapshot.eagles ?? 0,
                  birdies: snapshot.birdies ?? 0,
                  pars: snapshot.pars ?? 0,
                  bogeys: snapshot.bogeys ?? 0,
                  doubleBogeys: snapshot.doubleBogeys ?? 0,
                  triplePlus: snapshot.triplePlus ?? 0,
                  threePutts: snapshot.threePutts ?? undefined,
                }
              : null
          }
        />
      </div>
    </main>
  );
}
