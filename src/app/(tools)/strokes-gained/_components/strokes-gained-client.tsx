"use client";

import Link from "next/link";
import { useState, useRef, useCallback, useEffect } from "react";
import { trackEvent } from "@/lib/analytics/client";
import type {
  RoundInput,
  StrokesGainedResult,
  RadarChartDatum,
} from "@/lib/golf/types";
import {
  getInterpolatedBenchmark,
  getBenchmarkMeta,
} from "@/lib/golf/benchmarks";
import { getEmphasizedCategories } from "@/lib/golf/emphasis";
import { BRACKET_LABELS } from "@/lib/golf/constants";
import {
  calculateStrokesGained,
  toRadarChartData,
} from "@/lib/golf/strokes-gained";
import { calculateStrokesGainedV3 } from "@/lib/golf/strokes-gained-v3";
import type { SgPhase2Mode } from "@/lib/golf/phase2-mode";
import { encodeRound } from "@/lib/golf/share-codec";
import { captureElementAsPng, downloadBlob } from "@/lib/capture";
import { RoundInputForm } from "./round-input-form";
import { ResultsSummary } from "./results-summary";
import { ShareCard } from "./share-card";
import { RadarChart } from "@/components/charts/radar-chart";
import {
  TurnstileWidget,
  type TurnstileWidgetHandle,
} from "@/components/security/turnstile-widget";
import { saveRound } from "../actions";
import { LaunchTrustPanel } from "./launch-trust-panel";

function getClientPhase2Mode(): SgPhase2Mode {
  const mode = process.env.NEXT_PUBLIC_SG_PHASE2_MODE;
  if (mode === "shadow" || mode === "full") return mode;
  return "off";
}

function getCalculator(mode: SgPhase2Mode) {
  return mode === "full" ? calculateStrokesGainedV3 : calculateStrokesGained;
}

interface StrokesGainedClientProps {
  initialInput?: RoundInput | null;
  saveEnabled?: boolean;
  turnstileSiteKey?: string | null;
}

function getUtmSource(): string | undefined {
  if (typeof window === "undefined") return undefined;
  return new URLSearchParams(window.location.search).get("utm_source") ?? undefined;
}

export default function StrokesGainedClient({
  initialInput,
  saveEnabled = true,
  turnstileSiteKey = null,
}: StrokesGainedClientProps) {
  const benchmarkMeta = getBenchmarkMeta();

  const phase2Mode = getClientPhase2Mode();
  const calculate = getCalculator(phase2Mode);

  // Precompute initial state from shared URL (avoids useEffect + setState cascade)
  const initialComputed = initialInput
    ? (() => {
        const benchmark = getInterpolatedBenchmark(initialInput.handicapIndex);
        const sgResult = calculate(initialInput, benchmark);
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
  const [saveError, setSaveError] = useState<{
    type: "config" | "runtime" | "rate_limited" | "verification";
    message: string;
  } | null>(null);
  const [saveOptInSelected, setSaveOptInSelected] = useState(false);
  const [savePhase, setSavePhase] = useState<null | "verifying" | "saving">(
    null
  );
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);
  const shareCardRef = useRef<HTMLDivElement>(null);
  const turnstileRef = useRef<TurnstileWidgetHandle | null>(null);
  const formStartedRef = useRef(false);
  const sharedRoundViewedRef = useRef(false);
  const attributionUtmSourceRef = useRef<string | undefined>(undefined);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveSuccessTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const saveRequestIdRef = useRef(0);

  if (
    attributionUtmSourceRef.current === undefined &&
    typeof window !== "undefined"
  ) {
    attributionUtmSourceRef.current = getUtmSource();
  }

  function getAttributionUtmSource(): string | undefined {
    return attributionUtmSourceRef.current ?? getUtmSource();
  }

  // Fire shared_round_viewed when viewing a shared link
  useEffect(() => {
    if (initialInput && !sharedRoundViewedRef.current) {
      sharedRoundViewedRef.current = true;
      const referrer =
        typeof document !== "undefined" && document.referrer
          ? (() => {
              try {
                return new URL(document.referrer).hostname;
              } catch {
                return "";
              }
            })()
          : "";
      const utmSource = attributionUtmSourceRef.current ?? "";
      trackEvent("shared_round_viewed", { referrer, utm_source: utmSource });

      // Fire emphasis impression for shared-link initial loads
      if (initialComputed?.result) {
        const emphasizedCats = getEmphasizedCategories(initialComputed.result);
        if (emphasizedCats.length > 0) {
          trackEvent("results_emphasis_impression", {
            emphasized_categories: emphasizedCats.join(","),
            surface: "results_page",
          });
        }
      }
    }
  }, [initialInput]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      if (saveSuccessTimerRef.current)
        clearTimeout(saveSuccessTimerRef.current);
    };
  }, []);

  function handleFormSubmit(
    input: RoundInput,
    options?: { saveToCloud: boolean }
  ) {
    setIsCalculating(true);

    const benchmark = getInterpolatedBenchmark(input.handicapIndex);
    const sgResult = calculate(input, benchmark);
    const radar = toRadarChartData(sgResult);

    setResult(sgResult);
    setChartData(radar);
    setLastInput(input);

    // Clear stale feedback from previous submit
    setSavePhase(null);
    setSaveError(null);
    setSaveSuccess(false);
    if (saveSuccessTimerRef.current)
      clearTimeout(saveSuccessTimerRef.current);

    trackEvent("calculation_completed", {
      utm_source: getAttributionUtmSource(),
    });
    if (sgResult.estimatedCategories.length > 0) {
      trackEvent("gir_estimated");
    }

    // Phase 2 analytics
    trackEvent("result_viewed", {
      total_anchor_mode: sgResult.totalAnchorMode,
      methodology_version: sgResult.methodologyVersion,
      benchmark_version: sgResult.benchmarkVersion,
      calibration_version: sgResult.calibrationVersion,
      has_course_rating: input.courseRating > 0,
      has_slope_rating: input.slopeRating >= 55 && input.slopeRating <= 155,
      surface: "results_page",
    });

    // Emphasis impression — fire once per result change, tied to user action
    const emphasizedCats = getEmphasizedCategories(sgResult);
    if (emphasizedCats.length > 0) {
      trackEvent("results_emphasis_impression", {
        emphasized_categories: emphasizedCats.join(","),
        surface: "results_page",
      });
    }

    if (sgResult.reconciliationScaleFactor != null) {
      trackEvent("reconciliation_applied", {
        scale_factor: sgResult.reconciliationScaleFactor,
        flags: (sgResult.reconciliationFlags ?? []).join(","),
      });
    }

    // Update URL with shareable param (no navigation)
    const encoded = encodeRound(input);
    window.history.replaceState(null, "", `?d=${encoded}`);

    // Keep loading state visible for at least one paint + 300ms
    requestAnimationFrame(() => {
      setTimeout(() => setIsCalculating(false), 300);
    });

    // Request scoping: only apply the result from the latest submit
    const requestId = ++saveRequestIdRef.current;

    if (saveEnabled && options?.saveToCloud === true) {
      if (!turnstileSiteKey || !turnstileRef.current) {
        trackEvent("round_save_failed", { error_type: "config" });
        setSaveError({
          type: "config",
          message:
            "Cloud save unavailable — your results are still shown below.",
        });
      } else {
        setSavePhase("verifying");

        void (async () => {
          let token: string;

          try {
            token = await turnstileRef.current!.execute();
          } catch (err) {
            if (requestId !== saveRequestIdRef.current) return;
            if (
              typeof err === "object" &&
              err !== null &&
              "code" in err &&
              err.code === "superseded"
            ) {
              return;
            }
            setSavePhase(null);
            console.error("[StrokesGained] Verification failed:", err);
            trackEvent("round_save_failed", { error_type: "verification" });
            setSaveError({
              type: "verification",
              message: "Bot check failed. Your results are still shown below.",
            });
            return;
          }

          if (requestId !== saveRequestIdRef.current) return;

          setSavePhase("saving");

          try {
            const res = await saveRound(input, { turnstileToken: token });
            if (requestId !== saveRequestIdRef.current) return;

            setSavePhase(null);
            if (res.success) {
              trackEvent("round_saved");
              setSaveSuccess(true);
              saveSuccessTimerRef.current = setTimeout(
                () => setSaveSuccess(false),
                3000
              );
            } else if (res.code === "SAVE_DISABLED") {
              trackEvent("round_save_failed", { error_type: "config" });
              setSaveError({
                type: "config",
                message:
                  "Cloud save unavailable — your results are still shown below.",
              });
            } else if (res.code === "RATE_LIMITED") {
              trackEvent("round_save_failed", { error_type: "rate_limited" });
              setSaveError({
                type: "rate_limited",
                message: res.message,
              });
            } else if (
              res.code === "VERIFICATION_REQUIRED" ||
              res.code === "VERIFICATION_FAILED"
            ) {
              trackEvent("round_save_failed", {
                error_type: "verification",
              });
              setSaveError({
                type: "verification",
                message: "Bot check failed. Your results are still shown below.",
              });
            } else {
              console.error(
                "[StrokesGained] Save failed:",
                res.code,
                res.message
              );
              trackEvent("round_save_failed", { error_type: "runtime" });
              setSaveError({
                type: "runtime",
                message:
                  "Round could not be saved. Your results are still shown below.",
              });
            }
          } catch (err) {
            if (requestId !== saveRequestIdRef.current) return;
            setSavePhase(null);
            console.error("[StrokesGained] Save transport failed:", err);
            trackEvent("round_save_failed", { error_type: "network" });
            setSaveError({
              type: "runtime",
              message:
                "Round could not be saved. Your results are still shown below.",
            });
          }
        })();
      }
    }

    // Smooth scroll to results
    setTimeout(() => {
      resultsRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  }

  const handleDownloadPng = useCallback(async () => {
    if (!shareCardRef.current || downloading) return;
    setDownloading(true);
    const start = Date.now();
    try {
      trackEvent("download_png_clicked", {
        has_share_param: window.location.search.includes("d="),
        utm_source: getAttributionUtmSource(),
      });
      const blob = await captureElementAsPng(shareCardRef.current);
      downloadBlob(blob, "strokes-gained.png");
    } finally {
      // Ensure loading state is visible for at least 300ms
      const elapsed = Date.now() - start;
      const remaining = Math.max(0, 300 - elapsed);
      setTimeout(() => setDownloading(false), remaining);
    }
  }, [downloading]);

  const handleCopyLink = useCallback(async () => {
    trackEvent("copy_link_clicked", {
      has_share_param: window.location.search.includes("d="),
      utm_source: getAttributionUtmSource(),
    });

    if (copyTimerRef.current) clearTimeout(copyTimerRef.current);

    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopyFailed(false);
      setCopied(true);
      copyTimerRef.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: hidden textarea + execCommand
      const textarea = document.createElement("textarea");
      textarea.value = window.location.href;
      textarea.style.position = "fixed";
      textarea.style.left = "-9999px";
      document.body.appendChild(textarea);
      try {
        textarea.select();
        const ok = document.execCommand("copy");
        if (!ok) throw new Error("execCommand returned false");
        setCopyFailed(false);
        setCopied(true);
        copyTimerRef.current = setTimeout(() => setCopied(false), 2000);
      } catch {
        setCopied(false);
        setCopyFailed(true);
        copyTimerRef.current = setTimeout(() => setCopyFailed(false), 2000);
      } finally {
        document.body.removeChild(textarea);
      }
    }
  }, []);

  const copyButtonText = copyFailed
    ? "Failed to copy"
    : copied
      ? "Copied!"
      : "Copy Link";

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="font-display text-3xl tracking-tight text-neutral-950">
        Proxy Strokes Gained Benchmarker
      </h1>
      <p className="mt-2 text-neutral-600">
        Free post-round benchmark from manual scorecard stats.
      </p>
      <p className="mt-1 max-w-lg text-sm text-neutral-500">
        Most strokes gained tools compare you to Tour pros, which is less
        useful when you&apos;re deciding what to practice. This benchmarks your
        scorecard stats against golfers at your handicap level. Best for
        golfers already tracking manual round stats, and not a replacement for
        Arccos or Shot Scope if you already use sensors.{" "}
        <Link href="/methodology" className="underline hover:text-neutral-700">
          See full methodology &rarr;
        </Link>
      </p>
      <LaunchTrustPanel />

      <div
        className="mt-8 rounded-xl border border-card-border bg-card p-6 shadow-sm"
        data-testid="form-wrapper"
        onFocusCapture={() => {
          if (!formStartedRef.current) {
            formStartedRef.current = true;
            trackEvent("form_started", {
              utm_source: getAttributionUtmSource(),
            });
          }
        }}
      >
        <RoundInputForm
          onSubmit={handleFormSubmit}
          onSavePreferenceChange={setSaveOptInSelected}
          initialValues={initialInput}
          isCalculating={isCalculating}
          saveEnabled={saveEnabled}
        />
      </div>

      {saveEnabled && turnstileSiteKey && saveOptInSelected && (
        <TurnstileWidget ref={turnstileRef} siteKey={turnstileSiteKey} />
      )}

      {savePhase && (
        <div
          data-testid="save-pending"
          role="status"
          className="mt-6 rounded-md border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-600"
        >
          {savePhase === "verifying"
            ? "Verifying you're human..."
            : "Saving round..."}
        </div>
      )}

      {saveSuccess && (
        <div
          data-testid="save-success"
          role="status"
          className="mt-6 flex items-center gap-2 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="h-5 w-5 shrink-0"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
              clipRule="evenodd"
            />
          </svg>
          Round saved.
        </div>
      )}

      {saveError && (
        <div
          data-testid="save-error"
          role="alert"
          className={`mt-6 flex items-center justify-between rounded-md px-4 py-3 text-sm ${
            saveError.type === "config"
              ? "border border-neutral-200 bg-neutral-50 text-neutral-600"
              : "border border-amber-200 bg-amber-50 text-amber-800"
          }`}
        >
          <span>{saveError.message}</span>
          <button
            type="button"
            onClick={() => setSaveError(null)}
            className={`ml-4 font-medium ${
              saveError.type === "config"
                ? "text-neutral-500 hover:text-neutral-700"
                : "text-amber-600 hover:text-amber-800"
            }`}
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
          <h2 className="font-display text-2xl tracking-tight text-neutral-950">
            Your Proxy SG Breakdown
          </h2>
          <details className="mt-2 text-sm text-neutral-500">
            <summary className="cursor-pointer font-medium text-neutral-600">
              How to read these results
            </summary>
            <div className="mt-2 space-y-1 border-l-2 border-cream-200 pl-4">
              <p>Outside the dashed ring = better than peers. Inside = worse.</p>
              <p>Positive (+) = you gained strokes. Negative (−) = you lost strokes.</p>
              <p>Focus on your weakest category — that&apos;s where practice helps most.</p>
              <p>Confidence badges (High/Med/Low) show how much data each category uses. See the methodology page for details.</p>
            </div>
          </details>
          <div style={{ height: 400 }}>
            <RadarChart
              data={chartData}
              bracketLabel={BRACKET_LABELS[result.benchmarkBracket]}
            />
          </div>
          <ResultsSummary result={result} benchmarkMeta={benchmarkMeta} />

          {/* Share actions */}
          <div className="flex gap-3">
            <button
              type="button"
              data-testid="download-png"
              onClick={handleDownloadPng}
              disabled={downloading}
              className="rounded-lg bg-brand-800 px-4 py-2 text-sm font-medium text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-brand-700 hover:shadow-md active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {downloading ? "Preparing..." : "Download PNG"}
            </button>
            <button
              type="button"
              data-testid="copy-link"
              onClick={handleCopyLink}
              className={`rounded-lg border-2 border-cream-200 bg-white px-4 py-2 text-sm font-medium transition-all duration-200 hover:border-brand-800/30 hover:bg-cream-50 ${
                copyFailed ? "text-red-600" : "text-neutral-800"
              }`}
            >
              {copyButtonText}
            </button>
          </div>
          <p className="text-xs text-neutral-500">
            Shared links include your entered round stats in encoded (reversible)
            form.
          </p>

          {/* Off-screen share card for PNG capture */}
          <div className="fixed left-[-9999px] top-0" aria-hidden="true">
            <ShareCard
              ref={shareCardRef}
              result={result}
              chartData={chartData}
              courseName={lastInput.course}
              score={lastInput.score}
              benchmarkMeta={benchmarkMeta}
            />
          </div>
        </div>
      )}
    </main>
  );
}
