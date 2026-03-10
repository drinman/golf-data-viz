"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import type { ViewerEntitlements } from "@/lib/billing/entitlements";
import type { RoundSgSnapshot } from "@/lib/golf/trends";
import {
  toTrendSeries,
  calculateBiggestMover,
  hasMethodologyMix,
} from "@/lib/golf/trends";
import { trackEvent } from "@/lib/analytics/client";
import { HistoryEmptyState } from "./history-empty-state";
import { MethodologyVersionBanner } from "./methodology-version-banner";
import { SgTrendChart } from "./sg-trend-chart";
import { BiggestMoverCard } from "./biggest-mover-card";
import { RoundHistoryList } from "./round-history-list";

interface HistoryDashboardProps {
  rounds: RoundSgSnapshot[];
  entitlements: ViewerEntitlements;
}

function SummaryStats({ rounds }: { rounds: RoundSgSnapshot[] }) {
  const stats = useMemo(() => {
    const avgScore = rounds.reduce((sum, r) => sum + r.score, 0) / rounds.length;
    const sorted = [...rounds].sort(
      (a, b) => new Date(b.playedAt + "T00:00:00").getTime() - new Date(a.playedAt + "T00:00:00").getTime()
    );
    const lastPlayed = new Date(sorted[0].playedAt + "T00:00:00").toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
    return { roundsPlayed: rounds.length, avgScore: avgScore.toFixed(1), lastPlayed };
  }, [rounds]);

  const items = [
    { label: "Rounds Played", value: stats.roundsPlayed },
    { label: "Avg Score", value: stats.avgScore },
    { label: "Last Played", value: stats.lastPlayed },
  ];

  return (
    <div className="animate-fade-up grid grid-cols-2 gap-3 sm:grid-cols-3">
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-lg border border-card-border bg-card px-4 py-3"
        >
          <p className="text-xs font-medium uppercase tracking-[0.15em] text-neutral-400">
            {item.label}
          </p>
          <p className="mt-0.5 font-mono text-lg font-semibold text-neutral-950">
            {item.value}
          </p>
        </div>
      ))}
    </div>
  );
}

function LessonPrepCta({
  roundCount,
  entitlements,
}: {
  roundCount: number;
  entitlements: ViewerEntitlements;
}) {
  useEffect(() => {
    if (roundCount >= 3) {
      trackEvent("premium_cta_viewed", {
        surface: "history_dashboard",
        premium_status: entitlements.status,
        round_count: roundCount,
      });
    }
  }, [entitlements.status, roundCount]);

  if (roundCount < 3) {
    return null;
  }

  const isPremium = entitlements.canGenerateLessonReports;

  return (
    <div className="animate-fade-up overflow-hidden rounded-xl border border-card-border bg-card shadow-sm">
      <div className="grid gap-0 md:grid-cols-[1.1fr,0.9fr]">
        <div className="bg-brand-900 px-5 py-5 text-white">
          <p className="text-xs uppercase tracking-[0.22em] text-brand-100/75">
            {isPremium ? "Premium" : "Next Step"}
          </p>
          <h2 className="mt-2 font-display text-2xl tracking-tight">
            Lesson Prep Report
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-brand-100/80">
            Turn your saved rounds into a coach-shareable, multi-round artifact with
            focus area, trend signal, confidence, and methodology caveats.
          </p>
        </div>

        <div className="flex flex-col justify-center px-5 py-5">
          <p className="text-sm text-neutral-600">
            Free stays free for single-round benchmark, saved rounds, and saved-round sharing.
            Premium starts at multi-round synthesis.
          </p>
          <Link
            href="/strokes-gained/lesson-prep"
            onClick={() =>
              trackEvent("premium_cta_clicked", {
                surface: "history_dashboard",
                premium_status: entitlements.status,
                round_count: roundCount,
              })
            }
            className="mt-4 inline-flex w-fit items-center rounded-lg bg-neutral-950 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-neutral-800"
          >
            {isPremium ? "Build Lesson Prep Report" : "Preview Premium Report"}
          </Link>
        </div>
      </div>
    </div>
  );
}

export function HistoryDashboard({ rounds, entitlements }: HistoryDashboardProps) {
  useEffect(() => {
    trackEvent("history_page_viewed", { round_count: rounds.length });
  }, [rounds.length]);

  if (rounds.length === 0) {
    return <HistoryEmptyState />;
  }

  const series = toTrendSeries(rounds);
  const mover = calculateBiggestMover(rounds);
  const showMethodologyBanner = hasMethodologyMix(rounds);

  return (
    <div className="space-y-6">
      <MethodologyVersionBanner visible={showMethodologyBanner} />

      <SummaryStats rounds={rounds} />

      <LessonPrepCta roundCount={rounds.length} entitlements={entitlements} />

      <div className="animate-fade-up" style={{ animationDelay: "100ms" }}>
        <BiggestMoverCard mover={mover} />
      </div>

      <div
        className="animate-fade-up rounded-xl border border-card-border bg-card p-5 shadow-sm"
        style={{ animationDelay: "200ms" }}
      >
        <h2 className="mb-3 font-display text-xl tracking-tight text-neutral-950">
          SG Trends
        </h2>
        <SgTrendChart series={series} rounds={rounds} />
      </div>

      <div className="animate-fade-up" style={{ animationDelay: "300ms" }}>
        <RoundHistoryList rounds={rounds} />
      </div>
    </div>
  );
}
