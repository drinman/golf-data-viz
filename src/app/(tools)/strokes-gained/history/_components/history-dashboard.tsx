"use client";

import { useEffect } from "react";
import Link from "next/link";
import type { ViewerEntitlements } from "@/lib/billing/entitlements";
import { MIN_ROUNDS_FOR_MULTI_ROUND_INSIGHTS } from "@/lib/golf/constants";
import type { RoundSgSnapshot } from "@/lib/golf/trends";
import {
  toTrendSeries,
  calculateBiggestMover,
  hasMethodologyMix,
} from "@/lib/golf/trends";
import { trackEvent } from "@/lib/analytics/client";
import { HistoryEmptyState } from "./history-empty-state";
import { SummaryStats } from "./history-summary-stats";
import { MethodologyVersionBanner } from "./methodology-version-banner";
import { SgTrendChart } from "./sg-trend-chart";
import { BiggestMoverCard } from "./biggest-mover-card";
import { RoundHistoryList } from "./round-history-list";
import { StarterHistoryDashboard } from "./starter-history-dashboard";

interface HistoryDashboardProps {
  rounds: RoundSgSnapshot[];
  entitlements: ViewerEntitlements;
}

type DashboardVariant = "empty" | "starter" | "full";

function getDashboardVariant(roundCount: number): DashboardVariant {
  if (roundCount === 0) return "empty";
  if (roundCount < MIN_ROUNDS_FOR_MULTI_ROUND_INSIGHTS) return "starter";
  return "full";
}

function LessonPrepCta({
  roundCount,
  entitlements,
}: {
  roundCount: number;
  entitlements: ViewerEntitlements;
}) {
  useEffect(() => {
    if (roundCount >= MIN_ROUNDS_FOR_MULTI_ROUND_INSIGHTS) {
      trackEvent("premium_cta_viewed", {
        surface: "history_dashboard",
        premium_status: entitlements.status,
        round_count: roundCount,
      });
    }
  }, [entitlements.status, roundCount]);

  if (roundCount < MIN_ROUNDS_FOR_MULTI_ROUND_INSIGHTS) {
    return null;
  }

  const isPremium = entitlements.canGenerateLessonReports;

  return (
    <div className="animate-fade-up overflow-hidden rounded-xl border border-cream-200 bg-card shadow-sm">
      <div className="grid gap-0 md:grid-cols-[1.1fr,0.9fr]">
        <div className="bg-brand-900 px-5 py-5 text-white">
          <p className="text-xs uppercase tracking-[0.22em] text-brand-100/75">
            Premium
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
            Benchmarking and round history are always free.
            Premium adds multi-round coaching reports.
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
            className="mt-4 inline-flex min-h-11 w-fit items-center rounded-lg bg-brand-800 px-4 py-2.5 text-sm font-medium text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-brand-700 hover:shadow-md active:translate-y-0"
          >
            {isPremium ? "Build Lesson Prep Report" : "See What Premium Unlocks"}
          </Link>
        </div>
      </div>
    </div>
  );
}

export function HistoryDashboard({ rounds, entitlements }: HistoryDashboardProps) {
  const dashboardVariant = getDashboardVariant(rounds.length);

  useEffect(() => {
    trackEvent("history_page_viewed", {
      round_count: rounds.length,
      dashboard_variant: dashboardVariant,
    });
  }, [dashboardVariant, rounds.length]);

  if (dashboardVariant === "empty") {
    return <HistoryEmptyState />;
  }

  if (dashboardVariant === "starter") {
    return <StarterHistoryDashboard rounds={rounds} />;
  }

  const series = toTrendSeries(rounds);
  const mover = calculateBiggestMover(rounds);
  const showMethodologyBanner = hasMethodologyMix(rounds);

  return (
    <div className="space-y-6">
      <MethodologyVersionBanner visible={showMethodologyBanner} />

      <Link
        href="/strokes-gained?from=history"
        onClick={() => trackEvent("history_link_clicked", { surface: "history_log_round_cta" })}
        className="inline-flex min-h-11 items-center rounded-lg bg-brand-800 px-6 py-2.5 text-sm font-medium text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-brand-700 hover:shadow-md active:translate-y-0"
      >
        Log a Round
      </Link>

      <SummaryStats rounds={rounds} />

      <LessonPrepCta roundCount={rounds.length} entitlements={entitlements} />

      <div className="animate-fade-up delay-1">
        <BiggestMoverCard mover={mover} />
      </div>

      <div
        className="animate-fade-up delay-2 rounded-xl border border-cream-200 bg-card p-5 shadow-sm"
      >
        <h2 className="mb-3 font-display text-xl tracking-tight text-neutral-950">
          SG Trends
        </h2>
        <SgTrendChart series={series} rounds={rounds} />
      </div>

      <div className="animate-fade-up delay-3">
        <RoundHistoryList rounds={rounds} />
      </div>
    </div>
  );
}
