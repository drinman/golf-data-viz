"use client";

import { useEffect } from "react";
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

      <BiggestMoverCard mover={mover} />

      <div>
        <h2 className="mb-3 font-display text-xl tracking-tight text-neutral-950">
          SG Trends
        </h2>
        <SgTrendChart series={series} rounds={rounds} />
      </div>

      <RoundHistoryList rounds={rounds} />
    </div>
  );
}
