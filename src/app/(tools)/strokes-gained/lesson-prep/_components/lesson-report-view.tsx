"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, Download, Link2, RefreshCcw } from "lucide-react";
import { captureElementAsPng, downloadBlob } from "@/lib/capture";
import { RadarChart } from "@/components/charts/radar-chart";
import { ConfidenceBadge } from "@/app/(tools)/strokes-gained/_components/confidence-badge";
import { SgTrendChart } from "@/app/(tools)/strokes-gained/history/_components/sg-trend-chart";
import { trackEvent } from "@/lib/analytics/client";
import type { ViewerEntitlements } from "@/lib/billing/entitlements";
import { buildLessonReportAnalyticsContext } from "@/lib/golf/analytics";
import { CATEGORY_LABELS } from "@/lib/golf/constants";
import type { RoundSgSnapshot } from "@/lib/golf/trends";
import type { LessonReportSnapshot } from "@/lib/golf/round-queries";
import { formatCompactDate, formatDate, formatHandicap, formatSG, presentSG } from "@/lib/golf/format";
import { SG_NEAR_ZERO_THRESHOLD } from "@/lib/golf/constants";
import {
  createLessonReportShareToken,
  generateLessonReport,
} from "../actions";
import { LessonReportShareCard } from "./lesson-report-share-card";

interface LessonReportViewProps {
  snapshot: LessonReportSnapshot;
  entitlements?: ViewerEntitlements;
  surface: "owner" | "shared";
}

function toTrendRounds(snapshot: LessonReportSnapshot): RoundSgSnapshot[] {
  return snapshot.reportData.selectedRounds.map((round) => ({
    roundId: round.roundId,
    playedAt: round.playedAt,
    courseName: round.courseName,
    score: round.score,
    handicapIndex: round.handicapIndex,
    sgTotal: round.sgTotal,
    sgOffTheTee: round.sgOffTheTee,
    sgApproach: round.sgApproach,
    sgAroundTheGreen: round.sgAroundTheGreen,
    sgPutting: round.sgPutting,
    methodologyVersion: round.methodologyVersion,
    benchmarkBracket: null,
  }));
}

function buildPngFilename(snapshot: LessonReportSnapshot): string {
  return `lesson-prep-report-${snapshot.id}.png`;
}

function StatCard({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "neutral" | "positive" | "negative";
}) {
  return (
    <div className="rounded-xl border border-cream-200 bg-white px-4 py-4 shadow-sm">
      <p className="text-xs uppercase tracking-[0.15em] text-neutral-400">{label}</p>
      <p
        className={[
          "mt-1 font-mono tabular-nums text-3xl tracking-tight",
          tone === "positive"
            ? "text-data-positive"
            : tone === "negative"
              ? "text-data-negative"
              : "text-neutral-950",
        ].join(" ")}
      >
        {value}
      </p>
    </div>
  );
}

export function LessonReportView({
  snapshot,
  entitlements,
  surface,
}: LessonReportViewProps) {
  const report = snapshot.reportData;
  const trustMode = report.trustMode;
  const isCaveatedReport = trustMode === "caveated";
  const router = useRouter();
  const shareCardRef = useRef<HTMLDivElement>(null);
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);

  useEffect(() => {
    if (surface === "shared") {
      trackEvent("shared_lesson_report_viewed", {
        referrer: document.referrer || "direct",
        ...buildLessonReportAnalyticsContext(report.assertiveRoundCount),
      });
    }
  }, [report.assertiveRoundCount, surface]);

  async function handleDownloadPng() {
    if (!shareCardRef.current) return;
    const blob = await captureElementAsPng(shareCardRef.current);
    downloadBlob(blob, buildPngFilename(snapshot));
  }

  function handleCopyShareLink() {
    startTransition(async () => {
      const result = await createLessonReportShareToken(snapshot.id);
      if (!result.success) {
        setMessage(result.message);
        return;
      }

      if (result.created) {
        trackEvent("lesson_report_share_token_created", {
          report_id: snapshot.id,
          ...buildLessonReportAnalyticsContext(report.assertiveRoundCount),
        });
      }

      try {
        await navigator.clipboard.writeText(result.shareUrl);
        setMessage(null);
        setLinkCopied(true);
        setTimeout(() => setLinkCopied(false), 2000);
        trackEvent("lesson_report_share_link_copied", {
          report_id: snapshot.id,
          surface: "lesson_report_owner",
          ...buildLessonReportAnalyticsContext(report.assertiveRoundCount),
        });
      } catch {
        setMessage(`Share link ready: ${result.shareUrl}`);
      }
    });
  }

  function handleRegenerate() {
    startTransition(async () => {
      const result = await generateLessonReport(snapshot.selectedRoundIds);
      if (!result.success) {
        setMessage(result.message);
        return;
      }
      trackEvent("lesson_report_regenerated", {
        round_count: snapshot.selectedRoundIds.length,
        ...buildLessonReportAnalyticsContext(report.assertiveRoundCount),
      });
      router.push(`/strokes-gained/lesson-prep/${result.reportId}`);
      router.refresh();
    });
  }

  const rounds = toTrendRounds(snapshot);
  const activeTimestamp = snapshot.regeneratedAt ?? snapshot.generatedAt;
  const canRegenerate = surface === "owner" && !!entitlements?.canGenerateLessonReports;

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      {surface === "owner" && (
        <div className="animate-fade-up">
          <Link
            href="/strokes-gained/lesson-prep"
            className="group inline-flex items-center gap-1.5 text-sm font-medium text-brand-800 transition-all hover:-translate-x-0.5"
          >
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
            Back to Lesson Prep
          </Link>
        </div>
      )}

      <section className="mt-6 animate-fade-up overflow-hidden rounded-2xl bg-brand-900 px-6 py-7 text-white shadow-lg sm:px-8">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="max-w-3xl">
            <p className="text-xs uppercase tracking-[0.3em] text-brand-100/75">
              Lesson Prep Report
            </p>
            <h1 className="mt-3 font-display text-4xl tracking-tight sm:text-5xl">
              {report.summary.roundCount} selected rounds
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-brand-100/80 sm:text-base">
              {formatDate(report.summary.startDate)} to {formatDate(report.summary.endDate)}
              {" · "}
              Generated {new Date(activeTimestamp).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
              {" · "}
              Avg handicap {formatHandicap(report.summary.averageHandicapIndex)}
            </p>
          </div>
          <div className="rounded-3xl border border-white/15 bg-white/10 px-6 py-5 text-center">
            <p className="text-xs uppercase tracking-[0.2em] text-brand-100/75">
              Avg SG
            </p>
            <p className="mt-1 font-display text-5xl text-white">
              {formatSG(report.summary.averageSgTotal)}
            </p>
          </div>
        </div>
      </section>

      {surface === "owner" &&
        entitlements &&
        entitlements.canViewExistingLessonReports &&
        !entitlements.canGenerateLessonReports && (
          <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-900">
            You can review existing lesson prep reports during your grace period,
            but regenerating this report requires an active premium plan.
          </div>
        )}

      {report.caveats.length > 0 && (
        <div className="mt-6 space-y-2">
          {report.caveats.map((caveat) => (
            <div
              key={caveat}
              className="rounded-lg border border-cream-200 bg-white px-4 py-3 text-sm text-neutral-600 shadow-sm"
            >
              {caveat}
            </div>
          ))}
        </div>
      )}

      {message && (
        <div className="mt-6 rounded-xl border border-cream-200 bg-white px-4 py-3 text-sm text-neutral-600 shadow-sm">
          {message}
        </div>
      )}

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Rounds" value={String(report.summary.roundCount)} />
        <StatCard label="Avg Score" value={report.summary.averageScore.toFixed(1)} />
        <StatCard
          label={isCaveatedReport ? "Round Pattern" : "Primary Focus Area"}
          value={report.focusArea.label}
          tone={Math.abs(report.focusArea.averageSg) <= SG_NEAR_ZERO_THRESHOLD ? "neutral" : report.focusArea.averageSg < 0 ? "negative" : "neutral"}
        />
        <StatCard
          label={isCaveatedReport ? "Reliable Signal" : "Strongest Area"}
          value={report.strongestArea.label}
          tone={Math.abs(report.strongestArea.averageSg) <= SG_NEAR_ZERO_THRESHOLD ? "neutral" : report.strongestArea.averageSg >= 0 ? "positive" : "neutral"}
        />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.15fr,0.85fr]">
        <div className="rounded-xl border border-cream-200 bg-white p-5 shadow-sm">
          <h2 className="font-display text-2xl tracking-tight text-neutral-950">
            Average Category Shape
          </h2>
          <p className="mt-1 text-sm text-neutral-500">
            Average SG across the selected rounds. Dashed ring marks peer average.
          </p>
          <div className="mt-4" style={{ height: 380 }}>
            <RadarChart data={report.summary.averageRadar} bracketLabel="Peer" />
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-cream-200 bg-white p-5 shadow-sm">
            <p className="text-xs uppercase tracking-[0.16em] text-neutral-400">
              {isCaveatedReport ? "Round Pattern" : "Primary Focus Area"}
            </p>
            <div className="mt-2 flex items-center gap-2">
              <h2 className="font-display text-2xl tracking-tight text-neutral-950">
                {report.focusArea.label}
              </h2>
              {!isCaveatedReport && (
                <ConfidenceBadge
                  level={report.focusArea.confidence}
                  category={report.focusArea.category}
                  interactive={false}
                />
              )}
            </div>
            {(() => {
              const sg = presentSG(report.focusArea.averageSg);
              return (
              <>
              <p className={`mt-2 font-mono tabular-nums text-lg ${sg.tone === "neutral" ? "text-neutral-500" : "text-data-negative"}`}>
                {sg.formatted}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-neutral-600">
                {isCaveatedReport
                  ? "There are not enough reliable rounds yet to name a primary focus area."
                  : sg.isPeerAverage
                  ? "This category is at peer average across the selected rounds."
                  : "The most negative average category with usable confidence across these rounds."}
              </p>
              </>
              );
            })()}
          </div>

          <div className="rounded-xl border border-cream-200 bg-white p-5 shadow-sm">
            <p className="text-xs uppercase tracking-[0.16em] text-neutral-400">
              {isCaveatedReport ? "Reliable Signal" : "Strongest Area"}
            </p>
            <div className="mt-2 flex items-center gap-2">
              <h2 className="font-display text-2xl tracking-tight text-neutral-950">
                {report.strongestArea.label}
              </h2>
              {!isCaveatedReport && (
                <ConfidenceBadge
                  level={report.strongestArea.confidence}
                  category={report.strongestArea.category}
                  interactive={false}
                />
              )}
            </div>
            {(() => {
              const sg = presentSG(report.strongestArea.averageSg);
              return (
              <>
              <p className={`mt-2 font-mono tabular-nums text-lg ${sg.tone === "neutral" ? "text-neutral-500" : "text-data-positive"}`}>
                {sg.formatted}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-neutral-600">
                {isCaveatedReport
                  ? "There are not enough reliable rounds yet to name a strongest area."
                  : sg.isPeerAverage
                  ? "This category is at peer average across the selected rounds."
                  : "Your most positive average category across the selected rounds."}
              </p>
              </>
              );
            })()}
          </div>

          <div className="rounded-xl border border-cream-200 bg-white p-5 shadow-sm">
            <p className="text-xs uppercase tracking-[0.16em] text-neutral-400">
              Trend Signal
            </p>
            <h2 className="mt-2 font-display text-2xl tracking-tight text-neutral-950">
              {report.trendSignal.label}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-neutral-600">
              {report.trendSignal.copyText}
            </p>
            <p className="mt-3 text-xs uppercase tracking-[0.16em] text-neutral-400">
              Confidence: {report.trendSignal.confidence.replace("_", " ")}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-8 rounded-xl border border-cream-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-2xl tracking-tight text-neutral-950">
              Confidence Summary
            </h2>
            <p className="mt-1 text-sm text-neutral-500">
              Aggregate confidence rolls up the supporting scorecard inputs across all selected rounds.
            </p>
          </div>
          <div className="rounded-full bg-cream-100 px-3 py-1 text-xs font-medium uppercase tracking-[0.14em] text-neutral-600">
            Overall {report.confidenceSummary.overall}
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          {Object.entries(report.confidenceSummary.byCategory).map(([category, level]) => (
            <div
              key={category}
              className="inline-flex items-center gap-2 rounded-full border border-cream-200 bg-neutral-50 px-3 py-1.5"
            >
              <span className="text-sm text-neutral-600">
                {CATEGORY_LABELS[category as keyof typeof report.confidenceSummary.byCategory]}
              </span>
              <ConfidenceBadge
                level={level}
                category={category as keyof typeof report.confidenceSummary.byCategory}
                interactive={false}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="mt-8 rounded-xl border border-cream-200 bg-white p-5 shadow-sm">
        <h2 className="font-display text-2xl tracking-tight text-neutral-950">
          SG Trend Chart
        </h2>
        <p className="mt-1 text-sm text-neutral-500">
          Round-by-round category movement across the selected set.
        </p>
        <div className="mt-4">
          <SgTrendChart series={report.trendSeries} rounds={rounds} />
        </div>
      </div>

      <div className="mt-8 rounded-xl border border-cream-200 bg-white p-5 shadow-sm">
        <h2 className="font-display text-2xl tracking-tight text-neutral-950">
          Selected Rounds
        </h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {report.selectedRounds.map((round) => (
            <div
              key={round.roundId}
              className="rounded-xl border border-cream-200 bg-neutral-50 px-4 py-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-neutral-950">{round.courseName}</p>
                  <p className="mt-1 text-sm text-neutral-500">
                    {formatCompactDate(round.playedAt)} · Score {round.score} ·{" "}
                    {formatHandicap(round.handicapIndex)} HCP
                  </p>
                </div>
                {(() => {
                  const sg = presentSG(round.sgTotal);
                  return (
                <p
                  className={[
                    "font-mono tabular-nums text-lg font-semibold",
                    sg.tone === "neutral"
                      ? "text-neutral-500"
                      : sg.tone === "positive"
                        ? "text-data-positive"
                        : "text-data-negative",
                  ].join(" ")}
                >
                  {sg.formatted}
                </p>
                  );
                })()}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-10 rounded-xl border border-cream-200 bg-white px-5 py-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={handleDownloadPng}
            className="inline-flex min-h-11 items-center gap-2 rounded-lg border-2 border-cream-200 bg-white px-4 py-2.5 text-sm font-medium text-neutral-800 shadow-sm transition-colors hover:border-brand-800/30 hover:bg-cream-50"
          >
            <Download className="h-4 w-4" />
            Download PNG
          </button>

          {surface === "owner" && (
            <button
              type="button"
              onClick={handleCopyShareLink}
              disabled={isPending}
              className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-brand-200 bg-brand-50 px-4 py-2.5 text-sm font-medium text-brand-800 shadow-sm transition-colors hover:bg-brand-100 disabled:opacity-50"
            >
              {linkCopied ? (
                <>
                  <Check className="h-4 w-4" />
                  Copied!
                </>
              ) : (
                <>
                  <Link2 className="h-4 w-4" />
                  {isPending ? "Working…" : "Copy Share Link"}
                </>
              )}
            </button>
          )}

          {canRegenerate && (
            <button
              type="button"
              onClick={handleRegenerate}
              disabled={isPending}
              className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-brand-800 px-4 py-2.5 text-sm font-medium text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-brand-700 hover:shadow-md active:translate-y-0 disabled:opacity-50"
            >
              <RefreshCcw className="h-4 w-4" />
              {isPending ? "Refreshing…" : "Regenerate"}
            </button>
          )}
        </div>

        {surface === "shared" && (
          <div className="mt-8 text-center">
            <p className="text-sm text-neutral-500">
              Want your own strokes gained breakdown?
            </p>
            <Link
              href="/strokes-gained"
              className="mt-2 inline-block text-sm font-medium text-brand-800 underline transition-colors hover:text-brand-700"
            >
              Run the free benchmark →
            </Link>
          </div>
        )}
      </div>

      <div className="mt-8 text-center text-xs text-neutral-400">
        SG Analysis · Report v{snapshot.reportVersion}
        {report.methodologyVersions.length > 0 && (
          <> · Methodology {report.methodologyVersions.join(", ")}</>
        )}
      </div>

      <div className="pointer-events-none fixed left-[-9999px] top-0" aria-hidden="true">
        <LessonReportShareCard ref={shareCardRef} snapshot={snapshot} />
      </div>
    </main>
  );
}
