"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { ArrowLeft, Download, Link2, Check } from "lucide-react";
import type { RoundDetailSnapshot } from "@/lib/golf/types";
import {
  toStrokesGainedResult,
  toRadarChartDataFromSnapshot,
} from "@/lib/golf/round-detail-adapter";
import { getBenchmarkMeta } from "@/lib/golf/benchmarks";
import { BRACKET_LABELS } from "@/lib/golf/constants";
import { formatHandicap, formatSG, formatDate } from "@/lib/golf/format";
import { RadarChart } from "@/components/charts/radar-chart";
import { ResultsSummary } from "@/app/(tools)/strokes-gained/_components/results-summary";
import { ShareCard } from "@/app/(tools)/strokes-gained/_components/share-card";
import { captureElementAsPng, downloadBlob } from "@/lib/capture";
import { trackEvent } from "@/lib/analytics/client";
import { createShareToken } from "@/app/(tools)/strokes-gained/actions";

interface RoundDetailClientProps {
  snapshot: RoundDetailSnapshot;
}

export function RoundDetailClient({ snapshot }: RoundDetailClientProps) {
  const sgResult = toStrokesGainedResult(snapshot);
  const chartData = toRadarChartDataFromSnapshot(snapshot);
  const benchmarkMeta = getBenchmarkMeta();
  const bracketLabel =
    BRACKET_LABELS[sgResult.benchmarkBracket] ?? sgResult.benchmarkBracket;

  const shareCardRef = useRef<HTMLDivElement>(null);
  const [isPending, startTransition] = useTransition();
  const [linkCopied, setLinkCopied] = useState(false);

  useEffect(() => {
    trackEvent("round_detail_viewed", {
      round_id: snapshot.roundId,
      methodology_version: snapshot.methodologyVersion,
    });
  }, [snapshot.roundId, snapshot.methodologyVersion]);

  async function handleDownloadPng() {
    if (!shareCardRef.current) return;
    const blob = await captureElementAsPng(shareCardRef.current);
    const filename = `${snapshot.courseName.replace(/\s+/g, "-").toLowerCase()}-sg-${snapshot.playedAt}.png`;
    downloadBlob(blob, filename);
    trackEvent("saved_round_png_downloaded", {
      round_id: snapshot.roundId,
      surface: "round_detail",
    });
  }

  function handleCopyShareLink() {
    startTransition(async () => {
      const result = await createShareToken(snapshot.roundId);
      if (result.success) {
        await navigator.clipboard.writeText(result.shareUrl);
        setLinkCopied(true);
        setTimeout(() => setLinkCopied(false), 2000);
        trackEvent("share_link_copied", {
          round_id: snapshot.roundId,
          surface: "round_detail",
        });
        if (result.created) {
          trackEvent("share_token_created", {
            round_id: snapshot.roundId,
          });
        }
      }
    });
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      {/* Back link */}
      <div className="animate-fade-up">
        <Link
          href="/strokes-gained/history"
          className="group inline-flex items-center gap-1.5 text-sm font-medium text-brand-800 transition-all hover:-translate-x-0.5"
        >
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
          Back to History
        </Link>
      </div>

      {/* Header band */}
      <div
        className="mt-6 animate-fade-up overflow-hidden rounded-xl bg-brand-900 px-6 py-6 shadow-lg sm:px-8"
        style={{ animationDelay: "50ms" }}
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
        style={{ animationDelay: "100ms" }}
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
        style={{ animationDelay: "150ms" }}
      />

      {/* Results summary */}
      <div
        className="mt-10 animate-fade-up"
        style={{ animationDelay: "200ms" }}
      >
        <ResultsSummary result={sgResult} benchmarkMeta={benchmarkMeta} />
      </div>

      {/* Gold section separator */}
      <div
        className="mx-auto mt-10 h-px w-16 animate-fade-up bg-accent-500/40"
        style={{ animationDelay: "250ms" }}
      />

      {/* Share actions */}
      <div
        className="mt-10 animate-fade-up text-center"
        style={{ animationDelay: "300ms" }}
      >
        <h2 className="font-display text-lg text-neutral-950">
          Share This Round
        </h2>
        <p className="mt-1 text-sm text-neutral-500">
          Send your performance snapshot to a buddy or your coach.
        </p>

        <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={handleDownloadPng}
            className="inline-flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-4 py-2.5 text-sm font-medium text-neutral-700 shadow-sm transition-colors hover:bg-neutral-50"
          >
            <Download className="h-4 w-4" />
            Download PNG
          </button>

          <button
            type="button"
            onClick={handleCopyShareLink}
            disabled={isPending}
            className="inline-flex items-center gap-2 rounded-lg border border-brand-200 bg-brand-50 px-4 py-2.5 text-sm font-medium text-brand-800 shadow-sm transition-colors hover:bg-brand-100 disabled:opacity-50"
          >
            {linkCopied ? (
              <>
                <Check className="h-4 w-4" />
                Copied!
              </>
            ) : (
              <>
                <Link2 className="h-4 w-4" />
                {isPending ? "Creating…" : "Copy Share Link"}
              </>
            )}
          </button>
        </div>

        <p className="mt-3 text-xs text-neutral-400">
          Shared links give read-only access to this round&apos;s data.
        </p>
      </div>

      {/* Methodology note */}
      <div
        className="mt-10 animate-fade-up border-t border-neutral-100 pt-6 text-center text-xs text-neutral-400"
        style={{ animationDelay: "350ms" }}
      >
        <p>
          Proxy SG &middot; Benchmarks v{benchmarkMeta.version}
          {snapshot.methodologyVersion && (
            <> &middot; Methodology v{snapshot.methodologyVersion}</>
          )}
        </p>
        <Link
          href="/methodology"
          className="mt-1 inline-block underline transition-colors hover:text-neutral-600"
        >
          How Proxy Strokes Gained works
        </Link>
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
