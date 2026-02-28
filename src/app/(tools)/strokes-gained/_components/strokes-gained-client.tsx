"use client";

import { useState, useRef, useCallback } from "react";
import { trackEvent } from "@/lib/analytics/client";
import type {
  RoundInput,
  StrokesGainedResult,
  RadarChartDatum,
} from "@/lib/golf/types";
import { getBracketForHandicap } from "@/lib/golf/benchmarks";
import { BRACKET_LABELS } from "@/lib/golf/constants";
import {
  calculateStrokesGained,
  toRadarChartData,
} from "@/lib/golf/strokes-gained";
import { encodeRound } from "@/lib/golf/share-codec";
import { captureElementAsPng, downloadBlob } from "@/lib/capture";
import { RoundInputForm } from "./round-input-form";
import { ResultsSummary } from "./results-summary";
import { ShareCard } from "./share-card";
import { RadarChart } from "@/components/charts/radar-chart";
import { saveRound } from "../actions";

interface StrokesGainedClientProps {
  initialInput?: RoundInput | null;
}

export default function StrokesGainedClient({
  initialInput,
}: StrokesGainedClientProps) {
  // Precompute initial state from shared URL (avoids useEffect + setState cascade)
  const initialComputed = initialInput
    ? (() => {
        const benchmark = getBracketForHandicap(initialInput.handicapIndex);
        const sgResult = calculateStrokesGained(initialInput, benchmark);
        return { result: sgResult, chartData: toRadarChartData(sgResult) };
      })()
    : null;

  const [result, setResult] = useState<StrokesGainedResult | null>(
    initialComputed?.result ?? null
  );
  const [chartData, setChartData] = useState<RadarChartDatum[] | null>(
    initialComputed?.chartData ?? null
  );
  const [lastInput, setLastInput] = useState<RoundInput | null>(
    initialInput ?? null
  );
  const [saveError, setSaveError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);
  const shareCardRef = useRef<HTMLDivElement>(null);
  const formStartedRef = useRef(false);

  function handleFormSubmit(input: RoundInput) {
    const benchmark = getBracketForHandicap(input.handicapIndex);
    const sgResult = calculateStrokesGained(input, benchmark);
    const radar = toRadarChartData(sgResult);

    setResult(sgResult);
    setChartData(radar);
    setLastInput(input);
    setSaveError(null);

    trackEvent("calculation_completed", {
      benchmark_bracket: sgResult.benchmarkBracket,
      total_sg: sgResult.total,
      score: input.score,
    });

    // Update URL with shareable param (no navigation)
    const encoded = encodeRound(input);
    window.history.replaceState(null, "", `?d=${encoded}`);

    // Save to DB in background — surface errors to user
    saveRound(input, sgResult)
      .then((res) => {
        if (!res.success) {
          console.error("[StrokesGained] Save failed:", res.error);
          setSaveError(
            "Round could not be saved. Your results are still shown below."
          );
        }
      })
      .catch((err) => {
        console.error("[StrokesGained] Save transport error:", err);
        setSaveError(
          "Round could not be saved. Your results are still shown below."
        );
      });

    // Smooth scroll to results
    setTimeout(() => {
      resultsRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  }

  const handleDownloadPng = useCallback(async () => {
    if (!shareCardRef.current) return;
    trackEvent("download_png_clicked", {
      has_share_param: window.location.search.includes("d="),
    });
    const blob = await captureElementAsPng(shareCardRef.current);
    downloadBlob(blob, "strokes-gained.png");
  }, []);

  const handleCopyLink = useCallback(async () => {
    trackEvent("copy_link_clicked", {
      has_share_param: window.location.search.includes("d="),
    });
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, []);

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900">
        Strokes Gained Benchmarker
      </h1>
      <p className="mt-2 text-gray-600">
        See where you gain and lose strokes vs your handicap peers.
      </p>

      <div
        className="mt-8"
        data-testid="form-wrapper"
        onFocusCapture={() => {
          if (!formStartedRef.current) {
            formStartedRef.current = true;
            trackEvent("form_started");
          }
        }}
      >
        <RoundInputForm
          onSubmit={handleFormSubmit}
          initialValues={initialInput}
        />
      </div>

      {saveError && (
        <div
          data-testid="save-error"
          role="alert"
          className="mt-6 flex items-center justify-between rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"
        >
          <span>{saveError}</span>
          <button
            type="button"
            onClick={() => setSaveError(null)}
            className="ml-4 font-medium text-amber-600 hover:text-amber-800"
          >
            Dismiss
          </button>
        </div>
      )}

      {result && chartData && lastInput && (
        <div
          ref={resultsRef}
          data-testid="sg-results"
          className="mt-12 space-y-8"
        >
          <h2 className="text-2xl font-bold text-gray-900">
            Your Strokes Gained Breakdown
          </h2>
          <div style={{ height: 400 }}>
            <RadarChart
              data={chartData}
              bracketLabel={BRACKET_LABELS[result.benchmarkBracket]}
            />
          </div>
          <ResultsSummary result={result} />

          {/* Share actions */}
          <div className="flex gap-3">
            <button
              type="button"
              data-testid="download-png"
              onClick={handleDownloadPng}
              className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
            >
              Download PNG
            </button>
            <button
              type="button"
              data-testid="copy-link"
              onClick={handleCopyLink}
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              {copied ? "Copied!" : "Copy Link"}
            </button>
          </div>

          {/* Off-screen share card for PNG capture */}
          <div className="fixed left-[-9999px] top-0" aria-hidden="true">
            <ShareCard
              ref={shareCardRef}
              result={result}
              chartData={chartData}
              courseName={lastInput.course}
              score={lastInput.score}
            />
          </div>
        </div>
      )}
    </main>
  );
}
