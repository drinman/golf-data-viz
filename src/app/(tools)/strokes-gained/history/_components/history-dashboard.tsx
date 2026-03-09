"use client";

import { useEffect, useMemo } from "react";
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

export function HistoryDashboard({ rounds }: HistoryDashboardProps) {
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
