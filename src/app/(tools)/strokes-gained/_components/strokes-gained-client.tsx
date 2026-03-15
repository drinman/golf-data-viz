"use client";

import Link from "next/link";
import { useState, useRef, useCallback, useEffect } from "react";
import { CircleCheck } from "lucide-react";
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
import {
  shouldShowTroubleContextPrompt,
  TROUBLE_CAUSES,
  type RoundTroubleContext,
} from "@/lib/golf/trouble-context";
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
import { TroubleContextPrompt } from "./trouble-context-prompt";
import { TroubleContextModal } from "./trouble-context-modal";
import { NarrativeBlock } from "./narrative-block";
import { RadarChart } from "@/components/charts/radar-chart";
import {
  TurnstileWidget,
  type TurnstileWidgetHandle,
} from "@/components/security/turnstile-widget";
import { saveRound, saveTroubleContext, clearTroubleContext, claimRound, createShareToken } from "../actions";
import { LaunchTrustPanel } from "./launch-trust-panel";
import { CompactSamplePreview } from "@/components/compact-sample-preview";
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
  samplePreview?: SamplePreviewData;
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

export default function StrokesGainedClient({
  initialInput,
  saveEnabled = true,
  turnstileSiteKey = null,
  samplePreview,
  from,
}: StrokesGainedClientProps) {
  // from=history adaptation: show returning-user copy unless viewing a shared link
  const isFromHistory = from === "history" && !initialInput;
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
    type: "config" | "runtime" | "rate_limited" | "verification" | "duplicate";
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
  const [troubleContext, setTroubleContext] = useState<RoundTroubleContext | null>(null);
  const [troubleModalOpen, setTroubleModalOpen] = useState(false);
  const [troublePromptDismissed, setTroublePromptDismissed] = useState(false);
  const [savedRoundId, setSavedRoundId] = useState<string | null>(null);
  const [savedRoundOwned, setSavedRoundOwned] = useState(false);
  const [savedClaimToken, setSavedClaimToken] = useState<string | null>(null);
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [claimAuthModalOpen, setClaimAuthModalOpen] = useState(false);
  const [claimStatus, setClaimStatus] = useState<"idle" | "claiming" | "claimed" | "failed">("idle");
  const { user } = useSupabaseUser();
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
      trackEvent("shared_round_viewed", { referrer, utm_source: utmSource });

      // Plus handicap results viewed on share-URL open
      if (initialInput.handicapIndex < 0 && initialComputed?.result) {
        trackEvent("plus_handicap_results_viewed", {
          normalized_value: initialInput.handicapIndex,
          is_plus_handicap: true,
          benchmark_interpolation_mode: initialComputed.result.benchmarkInterpolationMode ?? "scratch_clamped",
        });
      }

      // Fire emphasis impression for shared-link initial loads.
      // This is the only path for shared links — handleFormSubmit only fires
      // on user-initiated recalculations, and this useEffect is ref-guarded
      // (sharedRoundViewedRef) so it fires exactly once.
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

  // Rehydrate pending claim from localStorage after OAuth redirect.
  // Google OAuth navigates away, losing in-memory state. A dedicated
  // "pending-oauth-claim" key is written when Google OAuth starts,
  // and consumed (deleted) here on the next mount. This avoids scanning
  // all claim:* entries and prevents stale rounds from being claimed.
  useEffect(() => {
    try {
      const raw = localStorage.getItem("pending-oauth-claim");
      if (!raw) return;
      localStorage.removeItem("pending-oauth-claim");
      const parsed = JSON.parse(raw) as { roundId?: string; claimToken?: string };
      if (parsed.roundId && parsed.claimToken) {
        setSavedRoundId(parsed.roundId);
        setSavedClaimToken(parsed.claimToken);
      }
    } catch { /* localStorage unavailable or corrupt entry */ }
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
    });

    // Emphasis impression — fire once per result change, tied to user action.
    // Comma-joined because GA4 doesn't support array values; query with CONTAINS
    // if filtering by individual category.
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
              setSavedRoundId(res.roundId);
              setSavedRoundOwned(res.isOwned);
              setSaveSuccess(true);
              // Create a share token for canonical URL sharing (owner only)
              if (res.isOwned) {
                void createShareToken(res.roundId).then((tokenRes) => {
                  if (tokenRes.success) setShareToken(tokenRes.token);
                });
              }
              // Auto-dismiss for anonymous saves; owned rounds get a persistent card
              if (!res.isOwned) {
                saveSuccessTimerRef.current = setTimeout(
                  () => setSaveSuccess(false),
                  3000
                );
              }
              // Store claim token for anonymous round claiming
              if (res.claimToken && !res.isOwned) {
                setSavedClaimToken(res.claimToken);
                try {
                  localStorage.setItem(
                    `claim:${res.roundId}`,
                    JSON.stringify({ roundId: res.roundId, claimToken: res.claimToken })
                  );
                } catch { /* localStorage unavailable */ }
              }
            } else if (res.code === "DUPLICATE_ROUND") {
              // Round already exists but server could not attach it to this user
              trackEvent("round_save_failed", { error_type: "duplicate" });
              setSaveError({
                type: "duplicate",
                message: "This round was already saved.",
              });
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
    await waitForUiPaint();
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
    const url = shareToken
      ? `${window.location.origin}/strokes-gained/shared/round/${shareToken}`
      : window.location.href;

    trackEvent("copy_link_clicked", {
      share_type: shareToken ? "canonical" : "encoded",
      surface: "results_page",
      utm_source: getAttributionUtmSource(),
    });

    if (copyTimerRef.current) clearTimeout(copyTimerRef.current);

    try {
      await navigator.clipboard.writeText(url);
      setCopyFailed(false);
      setCopied(true);
      copyTimerRef.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: hidden textarea + execCommand
      const textarea = document.createElement("textarea");
      textarea.value = url;
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
  }, [shareToken]);

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
            Free post-round benchmark
          </p>
          <h1 className="animate-fade-up [animation-delay:100ms] mt-4 font-display text-4xl tracking-tight text-neutral-950 sm:text-5xl">
            {isFromHistory ? "Log Another Round" : "Strokes Gained Benchmarker"}
          </h1>
          {isFromHistory ? (
            <>
              <p className="animate-fade-up [animation-delay:200ms] mt-4 max-w-xl text-base leading-relaxed text-neutral-600">
                Scorecard-based estimate vs your handicap peers. Add it to your history when you save.
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
                A proxy strokes gained benchmark built from scorecard stats amateurs already track.
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

          {!isFromHistory && samplePreview && (
            <div className="mt-8">
              <CompactSamplePreview {...samplePreview} />
            </div>
          )}

          <LaunchTrustPanel defaultCollapsed={isFromHistory} />
        </div>
      </section>
      <div className="mx-auto max-w-3xl px-4 pb-10 sm:pb-14">

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
          onSubmit={handleFormSubmit}
          onSavePreferenceChange={setSaveOptInSelected}
          initialValues={initialInput}
          isCalculating={isCalculating}
          isSaving={savePhase !== null}
          saveEnabled={saveEnabled}
          isAuthenticated={!!user}
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

      {saveSuccess && savedRoundOwned && (
        <div
          data-testid="save-success-authed"
          className="mt-6 rounded-xl border border-green-200 bg-green-50 px-5 py-4"
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

      {saveSuccess && !savedRoundOwned && (
        <div
          data-testid="save-success"
          role="status"
          className="mt-6 flex items-center gap-2 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800"
        >
          <CircleCheck className="h-5 w-5 shrink-0" />
          Round saved.
        </div>
      )}

      {/* Post-save claim CTA — shown only for truly anonymous users (no client session) */}
      {savedRoundId && savedClaimToken && !savedRoundOwned && !user && claimStatus === "idle" && (
        <div
          data-testid="claim-cta"
          className="mt-6 rounded-xl border border-brand-200 bg-brand-50/50 px-5 py-4"
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
          className="mt-6 rounded-md border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-600"
        >
          Linking round to your account...
        </div>
      )}

      {claimStatus === "claimed" && (
        <div
          data-testid="claim-success"
          className="mt-6 rounded-xl border border-green-200 bg-green-50 px-5 py-4"
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
          className="mt-6 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"
        >
          Could not link round to your account. Your results are still saved.
        </div>
      )}

      <AuthModal
        open={claimAuthModalOpen}
        onClose={() => setClaimAuthModalOpen(false)}
        onSuccess={handleClaimAuthSuccess}
        onGoogleAuthStart={() => {
          // Persist claim context just before Google OAuth redirects away.
          // This key is consumed on the next mount to resume the claim.
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
          className="mt-16 space-y-8"
        >
          <div className="animate-fade-up">
            <p className="text-sm font-semibold uppercase tracking-[0.15em] text-brand-800">
              Results
            </p>
            <h2 className="mt-2 font-display text-3xl tracking-tight text-neutral-950 sm:text-4xl">
              Your Proxy SG Breakdown
            </h2>
          </div>
          <details className="animate-fade-up [animation-delay:100ms] rounded-lg border border-cream-200 bg-cream-50 px-4 py-3 text-sm text-neutral-500">
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
          <div className="animate-fade-up [animation-delay:200ms] rounded-xl border border-cream-200 bg-white p-4 shadow-sm sm:p-6">
            <div style={{ height: 400 }}>
              <RadarChart
                data={chartData}
                bracketLabel={BRACKET_LABELS[result.benchmarkBracket]}
              />
            </div>
          </div>
          <ResultsSummary
            result={result}
            benchmarkMeta={benchmarkMeta}
            troubleContext={troubleContext}
            onRemoveTroubleContext={() => {
              setTroubleContext(null);
              trackEvent("trouble_context_removed");
              if (savedRoundId) {
                void clearTroubleContext(savedRoundId, savedClaimToken);
              }
            }}
          />

          {/* Trouble context prompt — shown when eligible and not yet annotated */}
          {troubleEligible && !troubleContext && !troublePromptDismissed && (
            <TroubleContextPrompt
              onAddContext={() => {
                setTroubleModalOpen(true);
                trackEvent("trouble_context_started");
              }}
              onDismiss={() => setTroublePromptDismissed(true)}
            />
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

          {/* AI Narrative */}
          {lastInput && (
            <NarrativeBlock
              input={lastInput}
              troubleContext={troubleContext}
              isSharedLink={!!initialInput}
            />
          )}

          {/* Share actions */}
          <div className="animate-fade-up [animation-delay:450ms] flex gap-3">
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
