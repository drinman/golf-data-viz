"use client";

import Link from "next/link";
import { ArrowUpRight, Flag, LineChart, NotebookPen } from "lucide-react";
import { MIN_ROUNDS_FOR_MULTI_ROUND_INSIGHTS } from "@/lib/golf/constants";
import type { RoundSgSnapshot } from "@/lib/golf/trends";
import { SummaryStats } from "./history-summary-stats";
import { RoundHistoryList } from "./round-history-list";

interface StarterHistoryDashboardProps {
  rounds: RoundSgSnapshot[];
}

function StarterReadinessCard({ roundCount }: { roundCount: number }) {
  const title = roundCount === 1 ? "Baseline established" : "Comparison started";
  const kicker =
    roundCount === 1
      ? `Round 1 of ${MIN_ROUNDS_FOR_MULTI_ROUND_INSIGHTS}`
      : `Round 2 of ${MIN_ROUNDS_FOR_MULTI_ROUND_INSIGHTS}`;
  const body =
    roundCount === 1
      ? "You have your first saved benchmark. One more round starts to separate a single day from the shape of your game."
      : "You now have enough history to compare how your game is moving. One more round unlocks the first real pattern view.";

  return (
    <section
      data-testid="starter-readiness-card"
      className="animate-fade-up overflow-hidden rounded-2xl border border-card-border bg-card shadow-sm"
    >
      <div className="border-b border-cream-200 bg-[linear-gradient(135deg,rgba(15,61,34,0.08),rgba(184,134,11,0.06))] px-5 py-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-brand-800/80">
              {kicker}
            </p>
            <h2 className="mt-2 font-display text-2xl tracking-tight text-neutral-950">
              {title}
            </h2>
          </div>
          <div className="rounded-2xl bg-brand-900 p-3 text-white shadow-sm">
            <Flag className="h-5 w-5" />
          </div>
        </div>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-neutral-600">
          {body}
        </p>
      </div>

      <div className="px-5 py-5">
        <div className="grid gap-4 sm:grid-cols-3">
          {[1, 2, 3].map((step) => {
            const active = step <= roundCount;
            const current = step === roundCount + 1;

            return (
              <div
                key={step}
                className={`rounded-xl border px-4 py-3 ${
                  active
                    ? "border-brand-100 bg-brand-50"
                    : current
                      ? "border-accent-500/30 bg-cream-50"
                      : "border-neutral-200 bg-neutral-50"
                }`}
              >
                <p className="text-[11px] uppercase tracking-[0.18em] text-neutral-500">
                  Stage {step}
                </p>
                <p className="mt-1 font-medium text-neutral-950">
                  {step === 1
                    ? "Save baseline"
                    : step === 2
                      ? "Start comparison"
                      : "Unlock patterns"}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function StarterTrendCard({ roundCount }: { roundCount: number }) {
  const roundsNeeded = Math.max(0, MIN_ROUNDS_FOR_MULTI_ROUND_INSIGHTS - roundCount);

  return (
    <section
      data-testid="starter-trend-card"
      className="animate-fade-up delay-1 overflow-hidden rounded-2xl border border-card-border bg-card shadow-sm"
    >
      <div className="grid gap-0 md:grid-cols-[0.95fr,1.05fr]">
        <div className="bg-brand-900 px-5 py-6 text-white">
          <p className="text-xs uppercase tracking-[0.22em] text-brand-100/75">
            Trend View
          </p>
          <h2 className="mt-2 font-display text-2xl tracking-tight">
            SG Trends
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-brand-100/80">
            Your trend line stays locked until the next round gives the chart enough context
            to show movement instead of noise.
          </p>
        </div>

        <div className="px-5 py-6">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-cream-100 p-3 text-brand-800">
              <LineChart className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-neutral-400">
                Locked for now
              </p>
              <p className="font-display text-xl tracking-tight text-neutral-950">
                {roundsNeeded} more {roundsNeeded === 1 ? "round" : "rounds"}
              </p>
            </div>
          </div>

          <p className="mt-4 text-base text-neutral-700">
            {roundsNeeded} more round{roundsNeeded === 1 ? "" : "s"}{" "}
            {roundsNeeded === 1 ? "unlocks" : "unlock"} trends.
          </p>
          <p className="mt-2 text-sm leading-relaxed text-neutral-500">
            Once you reach {MIN_ROUNDS_FOR_MULTI_ROUND_INSIGHTS} saved rounds, this
            section becomes the live strokes gained chart with category lines over time.
          </p>

          <div className="mt-5 grid grid-cols-3 gap-2">
            {[1, 2, 3].map((step) => (
              <div
                key={step}
                className={`h-2 rounded-full ${
                  step <= roundCount ? "bg-brand-700" : "bg-neutral-200"
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function StarterLessonPrepCard({ roundCount }: { roundCount: number }) {
  const roundsNeeded = Math.max(0, MIN_ROUNDS_FOR_MULTI_ROUND_INSIGHTS - roundCount);

  return (
    <section
      data-testid="starter-lesson-prep-card"
      className="animate-fade-up overflow-hidden rounded-2xl border border-card-border bg-card shadow-sm"
    >
      <div className="border-b border-cream-200 px-5 py-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-accent-600/80">
              Coach Prep
            </p>
            <h2 className="mt-2 font-display text-2xl tracking-tight text-neutral-950">
              Lesson Prep Report
            </h2>
          </div>
          <div className="rounded-2xl bg-cream-100 p-3 text-accent-600 shadow-sm">
            <NotebookPen className="h-5 w-5" />
          </div>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-neutral-600">
          Save {roundsNeeded} more round{roundsNeeded === 1 ? "" : "s"} to build a
          coach-ready lesson prep report.
        </p>
      </div>

      <div className="px-5 py-5">
        <div className="rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-4">
          <p className="text-sm text-neutral-700">
            When unlocked, you&apos;ll get multi-round trend signal, a primary focus area,
            and a shareable summary for your next lesson.
          </p>
        </div>

        <Link
          href="/strokes-gained/lesson-prep"
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-neutral-950 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-neutral-800"
        >
          Preview lesson prep flow
          <ArrowUpRight className="h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}

export function StarterHistoryDashboard({
  rounds,
}: StarterHistoryDashboardProps) {
  return (
    <div className="space-y-6">
      <SummaryStats rounds={rounds} />

      <div className="grid gap-6 lg:grid-cols-[1.15fr,0.85fr]">
        <StarterReadinessCard roundCount={rounds.length} />
        <StarterLessonPrepCard roundCount={rounds.length} />
      </div>

      <StarterTrendCard roundCount={rounds.length} />

      <div className="animate-fade-up delay-2">
        <RoundHistoryList rounds={rounds} />
      </div>
    </div>
  );
}
