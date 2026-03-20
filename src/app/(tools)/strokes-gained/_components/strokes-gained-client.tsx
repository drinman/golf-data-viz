"use client";

import Link from "next/link";
import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { CircleCheck } from "lucide-react";
import { trackEvent } from "@/lib/analytics/client";
import { buildRoundAnalyticsContext } from "@/lib/golf/analytics";
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
import {
  shouldShowTroubleContextPrompt,
  TROUBLE_CAUSES,
  type RoundTroubleContext,
} from "@/lib/golf/trouble-context";
import { BRACKET_LABELS } from "@/lib/golf/constants";
import { formatHandicap, presentSG } from "@/lib/golf/format";
import {
  calculateStrokesGained,
  toRadarChartData,
} from "@/lib/golf/strokes-gained";
import { calculateStrokesGainedV3 } from "@/lib/golf/strokes-gained-v3";
import type { SgPhase2Mode } from "@/lib/golf/phase2-mode";
import { encodeRound } from "@/lib/golf/share-codec";
import {
  derivePresentationTrust,
  isAssertivePresentationTrust,
  isPresentationTrustEnabled,
} from "@/lib/golf/presentation-trust";
import { generateShareHeadline } from "@/lib/golf/share-headline";
import { captureElementAsPng, downloadBlob } from "@/lib/capture";
import { RoundInputForm } from "./round-input-form";
import { ResultsSummary } from "./results-summary";
import { ShareCard } from "./share-card";
import { TroubleContextPrompt } from "./trouble-context-prompt";
import { TroubleContextModal } from "./trouble-context-modal";
import { NarrativeBlock } from "./narrative-block";
import { PostResultsSaveCta } from "./post-results-save-cta";
import { LastRoundBanner } from "./last-round-banner";
import { RadarChart } from "@/components/charts/radar-chart";
import { readStoredRound, LAST_ROUND_KEY, type StoredRound } from "@/lib/golf/local-storage";
import { saveTroubleContext, clearTroubleContext, claimRound, createShareToken } from "../actions";
import { LaunchTrustPanel } from "./launch-trust-panel";
import { SampleResultPreview } from "@/components/sample-result-preview";
import { ContourBg } from "@/components/contour-bg";
import type { SamplePreviewData } from "@/lib/golf/sample-round";
import { AuthModal } from "@/components/auth/auth-modal";
import { useSupabaseUser } from "@/lib/supabase/auth-client";

function getClientPhase2Mode(): SgPhase2Mode {
  const mode = process.env.NEXT_PUBLIC_SG_PHASE2_MODE;
  if (mode === "off" || mode === "shadow") return mode;
  return "full";
}

function getCalculator(mode: SgPhase2Mode) {
  return mode === "full" ? calculateStrokesGainedV3 : calculateStrokesGained;
}

interface StrokesGainedClientProps {
  initialInput?: RoundInput | null;
  saveEnabled?: boolean;
  turnstileSiteKey?: string | null;
  samplePreview: SamplePreviewData;
  sampleInput: RoundInput;
  from?: "history";
}

function getUtmSource(): string | undefined {
  if (typeof window === "undefined") return undefined;
  return new URLSearchParams(window.location.search).get("utm_source") ?? undefined;
}

async function waitForUiPaint(): Promise<void> {
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
}

function getPresentationEmphasisCategories(
  result: StrokesGainedResult,
  input: RoundInput
) {
  if (!isPresentationTrustEnabled()) {
    return getEmphasizedCategories(result);
  }

  const presentationTrust = derivePresentationTrust({ input, result });
  if (!isAssertivePresentationTrust(presentationTrust)) {
    return [];
  }

  const promotable = new Set(presentationTrust.promotableCategories);
  return getEmphasizedCategories(result).filter((category) => promotable.has(category));
}

export default function StrokesGainedClient({
  initialInput,
  saveEnabled = true,
  turnstileSiteKey = null,
  samplePreview,
  sampleInput,
  from,
}: StrokesGainedClientProps) {
  // from=history adaptation: show returning-user copy unless viewing a shared link
  const isFromHistory = from === "history" && !initialInput;
  // Shared link recipient: initialInput present AND not navigating from history.
  // State so it clears when the recipient submits their own round.
  const [isSharedLink, setIsSharedLink] = useState(!!initialInput && from !== "history");
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
  const initialComputedResult = initialComputed?.result ?? null;

  const [result, setResult] = useState<StrokesGainedResult | null>(
    initialComputed?.result ?? null
  );
  const [chartData, setChartData] = useState<RadarChartDatum[] | null>(
    initialComputed?.chartData ?? null
  );
  const [lastInput, setLastInput] = useState<RoundInput | null>(
    initialInput ?? null
  );
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [troubleContext, setTroubleContext] = useState<RoundTroubleContext | null>(null);
  const [troubleModalOpen, setTroubleModalOpen] = useState(false);
  const [troublePromptDismissed, setTroublePromptDismissed] = useState(false);
  const [savedRoundId, setSavedRoundId] = useState<string | null>(null);
  const [savedRoundOwned, setSavedRoundOwned] = useState(false);
  const [savedClaimToken, setSavedClaimToken] = useState<string | null>(null);
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [claimAuthModalOpen, setClaimAuthModalOpen] = useState(false);
  const [claimStatus, setClaimStatus] = useState<"idle" | "claiming" | "claimed" | "failed">("idle");
  const [storedRound, setStoredRound] = useState<StoredRound | null>(null);
  const [formKey, setFormKey] = useState(0);
  const [formInitialValues, setFormInitialValues] = useState<RoundInput | null | undefined>(initialInput);
  const { user } = useSupabaseUser();
  const resultsRef = useRef<HTMLDivElement>(null);
  const shareCardRef = useRef<HTMLDivElement>(null);
  const formStartedRef = useRef(false);
  const sharedRoundViewedRef = useRef(false);
  const attributionUtmSourceRef = useRef<string | undefined>(undefined);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveSuccessTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const isSampleSubmitRef = useRef(false);
  const claimRequestInFlightRef = useRef(false);

  if (
    attributionUtmSourceRef.current === undefined &&
    typeof window !== "undefined"
  ) {
    attributionUtmSourceRef.current = getUtmSource();
  }

  function getAttributionUtmSource(): string | undefined {
    return attributionUtmSourceRef.current ?? getUtmSource();
  }

  // Auto-scroll to results when opened from a shared ?d= link
  useEffect(() => {
    if (!initialInput) return;
    const id = requestAnimationFrame(() => {
      resultsRef.current?.scrollIntoView({ behavior: "smooth" });
    });
    return () => cancelAnimationFrame(id);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
      trackEvent("shared_round_viewed", {
        referrer,
        utm_source: utmSource,
        ...(initialComputedResult
          ? buildRoundAnalyticsContext(initialInput, initialComputedResult)
          : {}),
      });

      // Plus handicap results viewed on share-URL open
      if (initialInput.handicapIndex < 0 && initialComputedResult) {
        trackEvent("plus_handicap_results_viewed", {
          normalized_value: initialInput.handicapIndex,
          is_plus_handicap: true,
          benchmark_interpolation_mode:
            initialComputedResult.benchmarkInterpolationMode ?? "scratch_clamped",
        });
      }

      // Fire emphasis impression for shared-link initial loads.
      // This is the only path for shared links — handleFormSubmit only fires
      // on user-initiated recalculations, and this useEffect is ref-guarded
      // (sharedRoundViewedRef) so it fires exactly once.
      if (initialComputedResult) {
        const emphasizedCats = getPresentationEmphasisCategories(
          initialComputedResult,
          initialInput
        );
        if (emphasizedCats.length > 0) {
          trackEvent("results_emphasis_impression", {
            emphasized_categories: emphasizedCats.join(","),
            surface: "results_page",
          });
        }
      }
    }
  }, [initialComputedResult, initialInput]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      if (saveSuccessTimerRef.current)
        clearTimeout(saveSuccessTimerRef.current);
    };
  }, []);

  // Rehydrate pending claim from localStorage after OAuth redirect.
  // Google OAuth navigates away, losing in-memory state. A dedicated
  // "pending-oauth-claim" key is written when Google OAuth starts,
  // and consumed (deleted) here on the next mount. This avoids scanning
  // all claim:* entries and prevents stale rounds from being claimed.
  //
  // Also restore the last round from localStorage so the results section
  // renders — claim success/error UI is inside the results block and
  // won't be visible without it.
  useEffect(() => {
    try {
      const raw = localStorage.getItem("pending-oauth-claim");
      if (!raw) return;
      localStorage.removeItem("pending-oauth-claim");
      const parsed = JSON.parse(raw) as { roundId?: string; claimToken?: string };
      if (parsed.roundId && parsed.claimToken) {
        setSavedRoundId(parsed.roundId);
        setSavedClaimToken(parsed.claimToken);

        // Restore results so claim UI is visible (it renders inside the results block)
        const stored = readStoredRound();
        if (stored) {
          setResult(stored.result);
          setChartData(stored.chartData);
          setLastInput(stored.input);
          setSaveSuccess(true); // hide CTA since round is already saved
          const encoded = encodeRound(stored.input);
          window.history.replaceState(null, "", `?d=${encoded}`);
        }
      }
    } catch { /* localStorage unavailable or corrupt entry */ }
  }, []);

  // Read last round from localStorage on mount (no shared link, not from history)
  useEffect(() => {
    if (initialInput || from === "history") return;
    const stored = readStoredRound();
    if (stored) setStoredRound(stored);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function handleRestore() {
    if (!storedRound) return;
    setResult(storedRound.result);
    setChartData(storedRound.chartData);
    setLastInput(storedRound.input);
    setStoredRound(null);

    // Update URL with shareable param
    const encoded = encodeRound(storedRound.input);
    window.history.replaceState(null, "", `?d=${encoded}`);

    trackEvent("local_round_restored");

    setTimeout(() => {
      resultsRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  }

  function handleDismiss() {
    setStoredRound(null);
    try { localStorage.removeItem(LAST_ROUND_KEY); } catch { /* ok */ }
  }

  function handleTrySample() {
    // Ensure form_started fires before calculation_completed for correct funnel ordering
    if (!formStartedRef.current) {
      formStartedRef.current = true;
      trackEvent("form_started", { utm_source: getAttributionUtmSource() });
    }
    trackEvent("sample_data_tried", { utm_source: getAttributionUtmSource() });
    isSampleSubmitRef.current = true;
    setFormInitialValues(sampleInput);
    setFormKey((k) => k + 1);
    handleFormSubmit(sampleInput);
  }

  function handleFormSubmit(input: RoundInput) {
    setIsCalculating(true);

    const benchmark = getInterpolatedBenchmark(input.handicapIndex);
    const sgResult = calculate(input, benchmark);
    const radar = toRadarChartData(sgResult);
    const analyticsContext = buildRoundAnalyticsContext(input, sgResult);

    setResult(sgResult);
    setChartData(radar);
    setLastInput(input);

    // Clear stale feedback from previous submit
    setSaveSuccess(false);
    setIsSharedLink(false);
    setTroubleContext(null);
    setTroubleModalOpen(false);
    setTroublePromptDismissed(false);
    setSavedRoundId(null);
    setSavedClaimToken(null);
    setShareToken(null);
    setClaimStatus("idle");
    claimRequestInFlightRef.current = false;
    if (saveSuccessTimerRef.current)
      clearTimeout(saveSuccessTimerRef.current);

    trackEvent("calculation_completed", {
      utm_source: getAttributionUtmSource(),
      handicap_bracket: sgResult.benchmarkBracket,
      has_course_rating: input.courseRating > 0,
      total_sg: sgResult.total,
      methodology_version: sgResult.methodologyVersion,
      ...analyticsContext,
    });
    if (sgResult.estimatedCategories.length > 0) {
      trackEvent("gir_estimated");
    }

    // Plus handicap analytics — results_viewed fires separately in the
    // shared_round_viewed useEffect so it also covers share-URL opens.
    if (input.handicapIndex < 0) {
      trackEvent("plus_handicap_submitted", {
        normalized_value: input.handicapIndex,
        is_plus_handicap: true,
        benchmark_interpolation_mode: sgResult.benchmarkInterpolationMode ?? "extrapolated",
      });
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
      ...analyticsContext,
    });

    // Emphasis impression — fire once per result change, tied to user action.
    // Comma-joined because GA4 doesn't support array values; query with CONTAINS
    // if filtering by individual category.
    const emphasizedCats = getPresentationEmphasisCategories(sgResult, input);
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

    // Skip URL and localStorage persistence for sample data — the user
    // didn't enter this round so it shouldn't pollute their recall banner
    // or produce a shareable URL with canned data.
    const isSample = isSampleSubmitRef.current;
    isSampleSubmitRef.current = false;

    if (!isSample) {
      // Update URL with shareable param (no navigation)
      const encoded = encodeRound(input);
      window.history.replaceState(null, "", `?d=${encoded}`);

      // Persist to localStorage for recall on return visits
      try {
        localStorage.setItem(LAST_ROUND_KEY, JSON.stringify({
          input, result: sgResult, chartData: radar, timestamp: new Date().toISOString(),
        }));
      } catch { /* localStorage unavailable */ }
    }

    // Clear stored round banner if visible
    setStoredRound(null);

    // Keep loading state visible for at least one paint + 300ms
    requestAnimationFrame(() => {
      setTimeout(() => setIsCalculating(false), 300);
    });

    // Smooth scroll to results
    setTimeout(() => {
      resultsRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  }

  // isPresentationTrustEnabled() reads a NEXT_PUBLIC_ env var that is
  // inlined at build time, so it is stable for the lifetime of the bundle.
  const presentationTrust = useMemo(() => {
    if (!result || !lastInput || !isPresentationTrustEnabled()) {
      return undefined;
    }

    return derivePresentationTrust({ input: lastInput, result });
  }, [lastInput, result]);

  // Memoize headline so both share handlers use the same computation
  const shareHeadline = useMemo(
    () =>
      result && lastInput
        ? generateShareHeadline(
            result,
            {
              score: lastInput.score,
              courseName: lastInput.course,
            },
            { presentationTrust }
          )
        : null,
    [presentationTrust, result, lastInput],
  );
  const roundAnalyticsContext = useMemo(
    () =>
      result && lastInput
        ? buildRoundAnalyticsContext(lastInput, result, presentationTrust)
        : null,
    [lastInput, presentationTrust, result],
  );

  const handleDownloadPng = useCallback(async () => {
    if (!shareCardRef.current || downloading) return;
    setDownloading(true);
    await waitForUiPaint();
    const start = Date.now();
    try {
      trackEvent("download_png_clicked", {
        has_share_param: window.location.search.includes("d="),
        utm_source: getAttributionUtmSource(),
        headline_pattern: shareHeadline?.pattern ?? null,
        ...(roundAnalyticsContext ?? {}),
      });
      const blob = await captureElementAsPng(shareCardRef.current);
      downloadBlob(blob, "strokes-gained.png");
    } finally {
      // Ensure loading state is visible for at least 300ms
      const elapsed = Date.now() - start;
      const remaining = Math.max(0, 300 - elapsed);
      setTimeout(() => setDownloading(false), remaining);
    }
  }, [downloading, roundAnalyticsContext, shareHeadline]);

  const handleCopyLink = useCallback(async () => {
    const url = shareToken
      ? `${window.location.origin}/strokes-gained/shared/round/${shareToken}`
      : window.location.href;

    const text = shareHeadline
      ? `${shareHeadline.clipboardPrefix}\n${url}`
      : url;

    trackEvent("copy_link_clicked", {
      share_type: shareToken ? "canonical" : "encoded",
      surface: "results_page",
      utm_source: getAttributionUtmSource(),
      headline_pattern: shareHeadline?.pattern ?? null,
      ...(roundAnalyticsContext ?? {}),
    });

    if (copyTimerRef.current) clearTimeout(copyTimerRef.current);

    try {
      await navigator.clipboard.writeText(text);
      setCopyFailed(false);
      setCopied(true);
      copyTimerRef.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: hidden textarea + execCommand
      const textarea = document.createElement("textarea");
      textarea.value = text;
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
  }, [roundAnalyticsContext, shareToken, shareHeadline]);

  // Claim a saved round — used both by auth modal callback and auto-claim effect
  const attemptClaim = useCallback(async () => {
    if (!savedRoundId || !savedClaimToken || claimRequestInFlightRef.current) return;

    claimRequestInFlightRef.current = true;
    setClaimAuthModalOpen(false);
    setClaimStatus("claiming");
    try {
      const result = await claimRound(savedRoundId, savedClaimToken);
      if (result.success) {
        setClaimStatus("claimed");
        setSavedClaimToken(null);
        setSavedRoundOwned(true);
        trackEvent("round_claimed");
        try {
          localStorage.removeItem(`claim:${savedRoundId}`);
          localStorage.removeItem("pending-oauth-claim");
        } catch { /* localStorage unavailable */ }
      } else {
        setClaimStatus("failed");
        trackEvent("round_claim_failed", { reason: result.code });
      }
    } catch {
      setClaimStatus("failed");
      trackEvent("round_claim_failed", { reason: "network_error" });
    } finally {
      claimRequestInFlightRef.current = false;
    }
  }, [savedRoundId, savedClaimToken]);

  // After auth modal success, claim the saved round
  const handleClaimAuthSuccess = attemptClaim;

  // Auto-claim: if client already has a session but the server returned isOwned=false
  // (auth-mismatch), claim immediately instead of showing "Create account" CTA
  useEffect(() => {
    if (user && savedRoundId && savedClaimToken && !savedRoundOwned && claimStatus === "idle") {
      void attemptClaim();
    }
  }, [user, savedRoundId, savedClaimToken, savedRoundOwned, claimStatus, attemptClaim]);

  const copyButtonText = copyFailed
    ? "Failed to copy"
    : copied
      ? "Copied!"
      : "Copy Link";

  const troubleEligible = result && lastInput
    ? shouldShowTroubleContextPrompt(
        lastInput,
        result,
        getInterpolatedBenchmark(lastInput.handicapIndex)
      )
    : false;

  return (
    <main>
      <section className="relative overflow-hidden px-4 pb-8 pt-12 sm:pb-10 sm:pt-16">
        <ContourBg className="text-brand-900" />
        <div className="relative mx-auto max-w-3xl">
          {isFromHistory && (
            <Link
              href="/strokes-gained/history"
              className="animate-fade-up mb-4 inline-block text-sm text-brand-800 hover:text-brand-600"
            >
              <span aria-hidden="true">&larr; </span>Back to History
            </Link>
          )}
          <p className="animate-fade-up text-sm font-semibold uppercase tracking-[0.22em] text-brand-800">
            Strokes Gained Benchmarker
          </p>
          <h1 className="animate-fade-up [animation-delay:100ms] mt-4 font-display text-4xl tracking-tight text-neutral-950 sm:text-5xl">
            {isFromHistory ? "Log Another Round" : "Strokes Gained Benchmarker"}
          </h1>
          {isFromHistory ? (
            <>
              <p className="animate-fade-up [animation-delay:200ms] mt-4 max-w-xl text-base leading-relaxed text-neutral-600">
                Log another round and see how your game is changing.
              </p>
              <p className="animate-fade-up [animation-delay:200ms] mt-2 max-w-lg text-sm text-neutral-500">
                No sensors needed.{" "}
                <Link href="/methodology" className="text-brand-800 underline transition-colors hover:text-brand-700">
                  See full methodology &rarr;
                </Link>
              </p>
            </>
          ) : (
            <>
              <p className="animate-fade-up [animation-delay:200ms] mt-4 max-w-xl text-base leading-relaxed text-neutral-600">
                See where your strokes went this round.
              </p>
              <p className="animate-fade-up [animation-delay:200ms] mt-2 max-w-lg text-sm text-neutral-500">
                See where you gain and lose strokes compared to golfers at your handicap
                level. No sensors needed.{" "}
                <Link href="/methodology" className="text-brand-800 underline transition-colors hover:text-brand-700">
                  See full methodology &rarr;
                </Link>
              </p>
            </>
          )}

          {/* Hero cascade: h1=100ms, subhead=200ms, preview=300ms, button=400ms */}
          {!isFromHistory && samplePreview && !result && (
            <div className="animate-fade-up [animation-delay:300ms] mt-8">
              <SampleResultPreview {...samplePreview} />
              <button
                type="button"
                data-testid="try-sample-btn"
                onClick={handleTrySample}
                className="animate-fade-up [animation-delay:400ms] mt-4 w-full rounded-lg border-2 border-brand-800/20 bg-white px-4 py-3 text-sm font-semibold text-brand-800 transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-800/40 hover:bg-brand-50 hover:shadow-md active:translate-y-0"
              >
                Try with Sample Data
              </button>
            </div>
          )}

          <LaunchTrustPanel defaultCollapsed={isFromHistory} />
        </div>
      </section>
      <div className="mx-auto max-w-3xl px-4 pb-10 sm:pb-14">

      {/* Last round recall banner */}
      {storedRound && !result && (
        <div className="mt-6">
          <LastRoundBanner
            courseName={storedRound.input.course}
            score={storedRound.input.score}
            date={storedRound.input.date}
            onRestore={handleRestore}
            onDismiss={handleDismiss}
          />
        </div>
      )}

      <div
        className="mt-10 rounded-xl border border-cream-200 bg-white p-6 shadow-md sm:p-8"
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
          key={formKey}
          onSubmit={handleFormSubmit}
          initialValues={formInitialValues}
          isCalculating={isCalculating}
        />
      </div>

      {result && chartData && lastInput && (
        <div
          ref={resultsRef}
          data-testid="sg-results"
          className="mt-16"
        >
          {/* Score-first header band for shared link recipients */}
          {isSharedLink && initialComputed && (
            <div
              data-testid="shared-link-header"
              className="animate-fade-up overflow-hidden rounded-xl bg-brand-900 px-5 py-5 shadow-lg sm:px-8 sm:py-6"
            >
              <div className="sm:flex sm:items-end sm:gap-5">
                <div className="flex items-baseline gap-3">
                  <span className="font-display text-4xl font-bold text-white sm:text-5xl">
                    {lastInput.score}
                  </span>
                  <span className="text-base text-brand-100">at</span>
                  <span className="truncate font-display text-lg font-bold text-brand-100 sm:text-xl">
                    {lastInput.course}
                  </span>
                </div>
                {/* SG badge — inline on mobile, circle on sm+ */}
                {(() => {
                  const totalSg = presentSG(result.total);
                  return (
                <div className="mt-3 sm:mt-0">
                  <span
                    className={`font-mono text-base font-bold sm:hidden ${
                      totalSg.tone === "neutral"
                        ? "text-neutral-300"
                        : totalSg.tone === "positive"
                          ? "text-green-400"
                          : "text-red-300"
                    }`}
                  >
                    {totalSg.formatted} SG
                  </span>
                  <div
                    className={`hidden sm:flex sm:h-16 sm:w-16 sm:items-center sm:justify-center sm:rounded-full sm:border-2 ${
                      totalSg.tone === "neutral"
                        ? "sm:border-neutral-400 sm:bg-neutral-400/15"
                        : totalSg.tone === "positive"
                          ? "sm:border-data-positive sm:bg-data-positive/15"
                          : "sm:border-data-negative sm:bg-data-negative/15"
                    }`}
                  >
                    <span
                      className={`font-mono text-lg font-bold ${
                        totalSg.tone === "neutral"
                          ? "text-neutral-300"
                          : totalSg.tone === "positive"
                            ? "text-green-400"
                            : "text-red-300"
                      }`}
                    >
                      {totalSg.formatted}
                    </span>
                  </div>
                </div>
                  );
                })()}
              </div>
              <p className="mt-2 text-sm text-brand-100/70">
                {formatHandicap(lastInput.handicapIndex)} index &middot; vs {BRACKET_LABELS[result.benchmarkBracket]}
              </p>
            </div>
          )}

          {/* ── CHAPTER 1: AT A GLANCE ── */}
          <div className={`space-y-6 ${isSharedLink && initialComputed ? "mt-10" : ""}`}>
            <div className="animate-fade-up" style={{ animationDelay: "0ms" }}>
              <p className="text-sm font-semibold uppercase tracking-[0.15em] text-brand-800">
                Results
              </p>
              <h2 className="mt-2 font-display text-3xl tracking-tight text-neutral-950 sm:text-4xl">
                Your Round Breakdown
              </h2>
            </div>
            <details className="animate-fade-up rounded-lg border border-cream-200 bg-cream-50 px-4 py-3 text-sm text-neutral-500" style={{ animationDelay: "50ms" }}>
              <summary className="cursor-pointer font-medium text-neutral-800">
                How to read these results
              </summary>
              <div className="mt-2 space-y-1 border-l-2 border-cream-200 pl-4">
                <p>Outside the dashed ring = better than peers. Inside = worse.</p>
                <p>Positive (+) = you gained strokes. Negative (−) = you lost strokes.</p>
                <p>Focus on your weakest category — that&apos;s where practice helps most.</p>
                <p>Confidence badges (High/Med/Low) show how much data each category uses. See the methodology page for details.</p>
              </div>
            </details>
            <div className="animate-fade-up rounded-xl border border-cream-200 bg-white p-4 shadow-sm sm:p-6" style={{ animationDelay: "100ms" }}>
              <div style={{ height: 400 }}>
                <RadarChart
                  data={chartData}
                  bracketLabel={BRACKET_LABELS[result.benchmarkBracket]}
                />
              </div>
            </div>
          </div>

          {/* Gold section separator */}
          <div
            className="mx-auto mt-10 h-px w-16 animate-fade-up bg-accent-500/40"
            style={{ animationDelay: "150ms" }}
          />

          {/* ── CHAPTER 2: DEEP DIVE ── */}
          <div className="mt-10">
            <h3
              className="animate-fade-up text-sm font-semibold uppercase tracking-[0.15em] text-brand-800"
              style={{ animationDelay: "200ms" }}
            >
              Category Breakdown
            </h3>
            <div className="mt-6 animate-fade-up" style={{ animationDelay: "250ms" }}>
              <ResultsSummary
                result={result}
                benchmarkMeta={benchmarkMeta}
                presentationTrust={presentationTrust}
                troubleContext={troubleContext}
                onRemoveTroubleContext={() => {
                  setTroubleContext(null);
                  trackEvent("trouble_context_removed");
                  if (savedRoundId) {
                    void clearTroubleContext(savedRoundId, savedClaimToken);
                  }
                }}
              />
            </div>

            {/* Trouble context prompt — shown when eligible and not yet annotated */}
            {troubleEligible && !troubleContext && !troublePromptDismissed && (
              <div className="mt-6">
                <TroubleContextPrompt
                  onAddContext={() => {
                    setTroubleModalOpen(true);
                    trackEvent("trouble_context_started");
                  }}
                  onDismiss={() => setTroublePromptDismissed(true)}
                />
              </div>
            )}

            {troubleModalOpen && (
              <TroubleContextModal
                onClose={() => setTroubleModalOpen(false)}
                onApply={(ctx) => {
                  setTroubleContext(ctx);
                  setTroubleModalOpen(false);
                  trackEvent("trouble_context_completed", {
                    hole_count: ctx.troubleHoles.length,
                    causes: TROUBLE_CAUSES.filter((c) => ctx.summary[c] > 0),
                  });
                  // Best-effort persistence
                  if (savedRoundId) {
                    void saveTroubleContext(savedRoundId, ctx, savedClaimToken).then((res) => {
                      if (res.success) {
                        trackEvent("trouble_context_saved_with_round", {
                          hole_count: ctx.troubleHoles.length,
                        });
                      } else {
                        trackEvent("trouble_context_save_failed", {
                          error_type: "runtime",
                        });
                      }
                    });
                  }
                }}
              />
            )}
          </div>

          {/* Gold section separator (conditional on insights chapter) */}
          {lastInput && !isSharedLink && (
            <div
              className="mx-auto mt-10 h-px w-16 animate-fade-up bg-accent-500/40"
              style={{ animationDelay: "300ms" }}
            />
          )}

          {/* ── CHAPTER 3: INSIGHTS ── */}
          {lastInput && !isSharedLink && (
            <div className="mt-10 animate-fade-up" style={{ animationDelay: "350ms" }}>
              <NarrativeBlock
                input={lastInput}
                troubleContext={troubleContext}
                presentationTrust={presentationTrust}
                isSharedLink={false}
              />
            </div>
          )}

          {/* Gold section separator */}
          <div
            className="mx-auto mt-10 h-px w-16 animate-fade-up bg-accent-500/40"
            style={{ animationDelay: "400ms" }}
          />

          {/* ── CHAPTER 4: SHARE & SAVE ── */}
          <div className="mt-10 space-y-5">
            {/* Share actions */}
            <div className="animate-fade-up flex gap-3" style={{ animationDelay: "450ms" }}>
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

            {/* Post-results save CTA */}
            {!saveSuccess && saveEnabled && (
              <PostResultsSaveCta
                input={lastInput}
                turnstileSiteKey={turnstileSiteKey}
                isAuthenticated={!!user}
                onSaveComplete={(res) => {
                  setSavedRoundId(res.roundId);
                  setSavedRoundOwned(res.isOwned);
                  setSaveSuccess(true);
                  if (res.isOwned) {
                    void createShareToken(res.roundId).then((tokenRes) => {
                      if (tokenRes.success) setShareToken(tokenRes.token);
                    });
                  }
                  if (!res.isOwned) {
                    saveSuccessTimerRef.current = setTimeout(() => setSaveSuccess(false), 3000);
                  }
                  if (res.claimToken && !res.isOwned) {
                    setSavedClaimToken(res.claimToken);
                    try { localStorage.setItem(`claim:${res.roundId}`, JSON.stringify({ roundId: res.roundId, claimToken: res.claimToken })); } catch { /* localStorage unavailable */ }
                  }
                }}
              />
            )}

            {/* Save success — authenticated */}
            {saveSuccess && savedRoundOwned && (
              <div
                data-testid="save-success-authed"
                className="rounded-xl border border-green-200 bg-green-50 px-5 py-4"
              >
                <div className="flex items-center gap-2 text-sm font-medium text-green-800">
                  <CircleCheck className="h-5 w-5 shrink-0" />
                  Round added to your history.
                </div>
                <Link
                  href="/strokes-gained/history"
                  onClick={() => trackEvent("history_link_clicked", { surface: "post_save_confirmation" })}
                  className="mt-2 inline-block text-sm font-medium text-brand-800 underline hover:text-brand-600"
                >
                  {isFromHistory ? "See updated history" : "View your trends"} &rarr;
                </Link>
              </div>
            )}

            {/* Save success — anonymous */}
            {saveSuccess && !savedRoundOwned && (
              <div
                data-testid="save-success"
                role="status"
                className="flex items-center gap-2 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800"
              >
                <CircleCheck className="h-5 w-5 shrink-0" />
                Round saved.
              </div>
            )}

            {/* Post-save claim CTA — shown only for truly anonymous users (no client session) */}
            {savedRoundId && savedClaimToken && !savedRoundOwned && !user && claimStatus === "idle" && (
              <div
                data-testid="claim-cta"
                className="rounded-xl border border-brand-200 bg-brand-50/50 px-5 py-4"
              >
                <p className="text-sm font-medium text-neutral-900">
                  Keep this round and track what changes
                </p>
                <p className="mt-1 text-xs text-neutral-600">
                  Create a free account to keep this round and see your SG trends, biggest mover, and round history over time.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setClaimAuthModalOpen(true);
                    trackEvent("auth_modal_opened", { surface: "post_save_claim_cta" });
                  }}
                  data-testid="claim-cta-btn"
                  className="mt-3 rounded-lg bg-brand-800 px-4 py-2 text-sm font-medium text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-brand-700 hover:shadow-md active:translate-y-0"
                >
                  Create account
                </button>
              </div>
            )}

            {claimStatus === "claiming" && (
              <div
                data-testid="claim-pending"
                role="status"
                className="rounded-md border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-600"
              >
                Linking round to your account...
              </div>
            )}

            {claimStatus === "claimed" && (
              <div
                data-testid="claim-success"
                className="rounded-xl border border-green-200 bg-green-50 px-5 py-4"
              >
                <p className="text-sm font-medium text-green-800">
                  Round linked to your account!
                </p>
                <Link
                  href="/strokes-gained/history"
                  className="mt-2 inline-block text-sm font-medium text-brand-800 underline hover:text-brand-600"
                >
                  View your round history &rarr;
                </Link>
              </div>
            )}

            {claimStatus === "failed" && (
              <div
                data-testid="claim-error"
                role="alert"
                className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"
              >
                Could not link round to your account. Your results are still saved.
              </div>
            )}

            <AuthModal
              open={claimAuthModalOpen}
              onClose={() => setClaimAuthModalOpen(false)}
              onSuccess={handleClaimAuthSuccess}
              onGoogleAuthStart={() => {
                if (savedRoundId && savedClaimToken) {
                  try {
                    localStorage.setItem(
                      "pending-oauth-claim",
                      JSON.stringify({ roundId: savedRoundId, claimToken: savedClaimToken })
                    );
                  } catch { /* localStorage unavailable */ }
                }
              }}
            />
          </div>

          {/* Recipient CTA — shown only for shared link recipients */}
          {isSharedLink && (
            <div
              data-testid="recipient-cta"
              className="mt-10 animate-fade-up rounded-xl border border-brand-200 bg-brand-50/50 px-5 py-5 text-center"
            >
              <p className="font-display text-lg font-bold tracking-tight text-neutral-950">
                What does your game look like?
              </p>
              <p className="mt-1 text-sm text-neutral-600">
                Enter your round stats and see how you compare to your handicap peers.
              </p>
              <a
                href="/strokes-gained"
                className="mt-3 inline-block rounded-lg bg-brand-800 px-5 py-2.5 text-sm font-medium text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-brand-700 hover:shadow-md active:translate-y-0"
              >
                Try It Free
              </a>
            </div>
          )}

          {/* Methodology footer */}
          <div
            className="mt-10 animate-fade-up border-t border-neutral-100 pt-6 text-center text-xs text-neutral-400"
            style={{ animationDelay: "500ms" }}
          >
            <p>SG &middot; Benchmarks v{benchmarkMeta.version}</p>
          </div>

          {/* Off-screen share card for PNG capture */}
          <div className="fixed left-[-9999px] top-0" aria-hidden="true">
            <ShareCard
              ref={shareCardRef}
              result={result}
              chartData={chartData}
              courseName={lastInput.course}
              score={lastInput.score}
              presentationTrust={presentationTrust}
              hasTroubleContext={troubleContext !== null}
              roundInput={lastInput}
            />
          </div>
        </div>
      )}
      </div>
    </main>
  );
}
