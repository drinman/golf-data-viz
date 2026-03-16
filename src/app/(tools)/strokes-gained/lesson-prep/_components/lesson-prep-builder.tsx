"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CreditCard, Lock, Sparkles } from "lucide-react";
import { trackEvent } from "@/lib/analytics/client";
import type { ViewerEntitlements } from "@/lib/billing/entitlements";
import { MIN_ROUNDS_FOR_MULTI_ROUND_INSIGHTS } from "@/lib/golf/constants";
import type { RoundSgSnapshot } from "@/lib/golf/trends";
import { formatDate } from "@/lib/golf/format";
import {
  generateLessonReport,
  openLessonPrepBillingPortal,
  startLessonPrepCheckout,
} from "../actions";
import { RoundSelectionCard } from "./round-selection-card";

interface LessonPrepBuilderProps {
  rounds: RoundSgSnapshot[];
  entitlements: ViewerEntitlements;
  checkoutState: "success" | "cancelled" | null;
}

function getInitialSelection(rounds: RoundSgSnapshot[]): string[] {
  return rounds.slice(0, 5).map((round) => round.roundId);
}

function orderSelection(rounds: RoundSgSnapshot[], roundIds: string[]): string[] {
  const selection = new Set(roundIds);
  return rounds
    .filter((round) => selection.has(round.roundId))
    .map((round) => round.roundId);
}

function formatRoundCountLabel(count: number): string {
  return `${count} ${count === 1 ? "round" : "rounds"}`;
}

export function LessonPrepBuilder({
  rounds,
  entitlements,
  checkoutState,
}: LessonPrepBuilderProps) {
  const router = useRouter();
  const [selectedRoundIds, setSelectedRoundIds] = useState(() => getInitialSelection(rounds));
  const [message, setMessage] = useState<string | null>(
    checkoutState === "success"
      ? "Upgrade confirmed. You can build lesson prep reports now."
      : checkoutState === "cancelled"
        ? "Checkout was cancelled. Your rounds are still ready whenever you want to continue."
        : null
  );
  const [isPending, startTransition] = useTransition();
  const trackedSelection = useRef(false);

  useEffect(() => {
    trackEvent("lesson_report_builder_viewed", {
      round_count: rounds.length,
      premium_status: entitlements.status,
    });

    if (checkoutState === "success") {
      trackEvent("checkout_completed", { surface: "lesson_prep_builder" });
      router.replace("/strokes-gained/lesson-prep", { scroll: false });
    }

    if (
      !entitlements.canGenerateLessonReports &&
      rounds.length >= MIN_ROUNDS_FOR_MULTI_ROUND_INSIGHTS
    ) {
      trackEvent("premium_gate_hit", {
        feature: "lesson_report_generation",
        surface: "lesson_prep_builder",
        premium_status: entitlements.status,
        round_count: rounds.length,
      });
      trackEvent("premium_cta_viewed", {
        surface: "lesson_prep_builder",
        premium_status: entitlements.status,
        round_count: rounds.length,
      });
    }
  }, [checkoutState, entitlements, rounds.length, router]);

  useEffect(() => {
    if (!trackedSelection.current) {
      trackedSelection.current = true;
      return;
    }

    trackEvent("lesson_report_selection_changed", {
      selected_count: selectedRoundIds.length,
    });
  }, [selectedRoundIds]);

  function toggleRound(roundId: string) {
    setMessage(null);
    setSelectedRoundIds((current) => {
      if (current.includes(roundId)) {
        return current.filter((id) => id !== roundId);
      }
      if (current.length >= 8) {
        setMessage("Lesson prep reports support up to 8 rounds so the report stays readable.");
        return current;
      }
      return orderSelection(rounds, [...current, roundId]);
    });
  }

  function handleUpgrade() {
    startTransition(async () => {
      trackEvent("premium_cta_clicked", {
        surface: "lesson_prep_builder",
        premium_status: entitlements.status,
        round_count: rounds.length,
      });
      trackEvent("checkout_started", { surface: "lesson_prep_builder" });

      const result = await startLessonPrepCheckout();
      if (!result.success) {
        setMessage(result.message);
        return;
      }

      window.location.href = result.url;
    });
  }

  function handleGenerate() {
    startTransition(async () => {
      const result = await generateLessonReport(selectedRoundIds);
      if (!result.success) {
        setMessage(result.message);
        return;
      }

      trackEvent(result.regenerated ? "lesson_report_regenerated" : "lesson_report_generated", {
        round_count: selectedRoundIds.length,
      });
      router.push(`/strokes-gained/lesson-prep/${result.reportId}`);
    });
  }

  function handleBillingPortal() {
    startTransition(async () => {
      const result = await openLessonPrepBillingPortal();
      if (!result.success) {
        setMessage(result.message);
        return;
      }
      trackEvent("billing_portal_opened", { surface: "lesson_prep_builder" });
      window.location.href = result.url;
    });
  }

  const selectedRounds = rounds.filter((round) => selectedRoundIds.includes(round.roundId));
  const selectionReady =
    selectedRoundIds.length >= MIN_ROUNDS_FOR_MULTI_ROUND_INSIGHTS &&
    selectedRoundIds.length <= 8;
  const minRoundsMet = rounds.length >= MIN_ROUNDS_FOR_MULTI_ROUND_INSIGHTS;
  const canGenerate = entitlements.canGenerateLessonReports && selectionReady;
  const selectionDateRange =
    selectedRounds.length > 0
      ? `${formatDate(selectedRounds[selectedRounds.length - 1].playedAt)} to ${formatDate(
          selectedRounds[0].playedAt
        )}`
      : "Select rounds to begin";

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <section className="animate-fade-up overflow-hidden rounded-2xl bg-brand-900 px-6 py-7 text-white shadow-lg sm:px-8">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="max-w-3xl">
            <p className="text-xs uppercase tracking-[0.3em] text-brand-100/75">
              Premium
            </p>
            <h1 className="mt-3 font-display text-4xl tracking-tight sm:text-5xl">
              Lesson Prep Report
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-brand-100/80 sm:text-base">
              Build a read-only, coach-shareable multi-round snapshot from your saved
              rounds. Focus areas, trend signals, confidence, and methodology caveats
              stay visible so the report supports a lesson without pretending to replace one.
            </p>
          </div>

          <div className="rounded-3xl border border-white/15 bg-white/10 px-6 py-5 text-center">
            <p className="text-xs uppercase tracking-[0.18em] text-brand-100/75">
              Saved Rounds
            </p>
            <p className="mt-1 font-display text-5xl text-white">{rounds.length}</p>
            <p className="mt-1 text-xs text-brand-100/75">
              {MIN_ROUNDS_FOR_MULTI_ROUND_INSIGHTS}+ required to build
            </p>
          </div>
        </div>
      </section>

      {message && (
        <div className="mt-6 rounded-xl border border-card-border bg-white px-4 py-3 text-sm text-neutral-700 shadow-sm">
          {message}
        </div>
      )}

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.1fr,0.9fr]">
        <section className="space-y-4">
          <div className="rounded-2xl border border-card-border bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-2xl tracking-tight text-neutral-950">
                  Select Rounds
                </h2>
                <p className="mt-1 text-sm text-neutral-500">
                  Most recent five rounds are preselected. Use{" "}
                  {MIN_ROUNDS_FOR_MULTI_ROUND_INSIGHTS} to 8 rounds.
                </p>
              </div>
              <div className="rounded-full bg-cream-100 px-3 py-1 text-xs font-medium uppercase tracking-[0.14em] text-neutral-700">
                {selectedRoundIds.length} selected
              </div>
            </div>
            <div className="mt-4 space-y-3">
              {rounds.map((round) => (
                <RoundSelectionCard
                  key={round.roundId}
                  round={round}
                  selected={selectedRoundIds.includes(round.roundId)}
                  onToggle={() => toggleRound(round.roundId)}
                />
              ))}
            </div>
          </div>
        </section>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-2xl border border-card-border bg-white p-5 shadow-sm">
            <p className="text-xs uppercase tracking-[0.16em] text-neutral-400">
              Current Selection
            </p>
            <h2 className="mt-2 font-display text-3xl tracking-tight text-neutral-950">
              {formatRoundCountLabel(selectedRoundIds.length)}
            </h2>
            <p className="mt-2 text-sm text-neutral-600">{selectionDateRange}</p>

            <div className="mt-5 space-y-3 text-sm text-neutral-600">
              <div className="rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3">
                <p className="font-medium text-neutral-950">What the report includes</p>
                <ul className="mt-2 space-y-1">
                  <li>Average SG and category shape</li>
                  <li>Trend signal and primary focus area</li>
                  <li>Confidence rollups and methodology caveats</li>
                  <li>Read-only share link for your coach</li>
                </ul>
              </div>

              <div className="rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3">
                <p className="font-medium text-neutral-950">Regeneration behavior</p>
                <p className="mt-2">
                  Reusing the same selected rounds refreshes the existing report in place.
                  The share link stays stable.
                </p>
              </div>
            </div>

            {!minRoundsMet && (
              <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                Save at least {MIN_ROUNDS_FOR_MULTI_ROUND_INSIGHTS} rounds first.
                Single-round benchmark, saved detail, and saved-round sharing stay free.
              </div>
            )}

            {!entitlements.canGenerateLessonReports && minRoundsMet && (
              <div className="mt-5 rounded-xl border border-brand-100 bg-brand-50 px-4 py-4">
                <div className="flex items-center gap-2 text-brand-900">
                  <Lock className="h-4 w-4" />
                  <p className="text-sm font-medium">Premium unlock</p>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-brand-900/85">
                  Multi-round synthesis starts here. Single-round benchmark, saved detail,
                  and explicit saved-round sharing remain free.
                </p>
                <button
                  type="button"
                  onClick={handleUpgrade}
                  disabled={isPending}
                  className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-brand-800 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-700 disabled:opacity-50"
                >
                  <Sparkles className="h-4 w-4" />
                  {isPending ? "Redirecting…" : "Upgrade to Premium"}
                </button>
              </div>
            )}

            {entitlements.canGenerateLessonReports && (
              <button
                type="button"
                onClick={handleGenerate}
                disabled={!canGenerate || isPending}
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-neutral-950 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Sparkles className="h-4 w-4" />
                {isPending ? "Building…" : "Generate Report"}
              </button>
            )}

            {entitlements.status !== "free" && (
              <button
                type="button"
                onClick={handleBillingPortal}
                disabled={isPending}
                className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-neutral-200 bg-white px-4 py-2.5 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50 disabled:opacity-50"
              >
                <CreditCard className="h-4 w-4" />
                Manage Billing
              </button>
            )}
          </div>
        </aside>
      </div>
    </main>
  );
}
