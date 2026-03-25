"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { trackEvent } from "@/lib/analytics/client";
import type { PresentationTrust, RoundInput } from "@/lib/golf/types";
import type { RoundTroubleContext } from "@/lib/golf/trouble-context";
import { buildTroubleContextSummary } from "@/lib/golf/trouble-context";
import { encodeRound } from "@/lib/golf/share-codec";

interface NarrativeBlockProps {
  input: RoundInput;
  troubleContext?: RoundTroubleContext | null;
  presentationTrust?: PresentationTrust | null;
  isSharedLink?: boolean;
}

type NarrativeState =
  | { status: "loading" }
  | { status: "success"; narrative: string; wordCount: number }
  | { status: "error"; retryable: boolean };

type NarrativeTrustMode = "assertive" | "caveated";

function mapErrorCode(
  httpStatus: number,
  code?: string
): "rate_limited" | "validation" | "generation" | "timeout" | "network" {
  if (code === "RATE_LIMITED" || httpStatus === 429) return "rate_limited";
  if (code === "GATEWAY_TIMEOUT" || httpStatus === 504) return "timeout";
  if (code === "UNAVAILABLE" || httpStatus === 503) return "network";
  if (code === "VALIDATION" || httpStatus === 400) return "validation";
  return "generation";
}

/**
 * Build a composite cache key for the narrative. Used both internally for
 * sessionStorage and externally as the React `key` prop to force remount
 * when the round, trust mode, or trouble context changes.
 */
export function buildNarrativeCacheKey(
  input: RoundInput,
  isCaveated: boolean,
  troubleContext?: RoundTroubleContext | null
): string {
  const promptVariant: NarrativeTrustMode = isCaveated ? "caveated" : "assertive";
  let troubleSuffix = "";
  if (!isCaveated && troubleContext && troubleContext.troubleHoles.length > 0) {
    const summary = buildTroubleContextSummary(troubleContext.troubleHoles);
    troubleSuffix = `:t${summary.tee}a${summary.approach}g${summary.around_green}p${summary.putting}x${summary.penalty}n${troubleContext.troubleHoles.length}`;
  }
  return `narrative:v1:${promptVariant}:${encodeRound(input)}${troubleSuffix}`;
}

export function NarrativeBlock({
  input,
  troubleContext,
  presentationTrust,
  isSharedLink = false,
}: NarrativeBlockProps) {
  const trustMode = presentationTrust?.mode;
  const isCaveated = trustMode === "caveated";
  const isQuarantined = trustMode === "quarantined";
  const narrativeTrustMode: NarrativeTrustMode = isCaveated ? "caveated" : "assertive";

  const cacheKey = useMemo(
    () => buildNarrativeCacheKey(input, isCaveated, troubleContext),
    [input, isCaveated, troubleContext]
  );

  const [state, setState] = useState<NarrativeState>(() => {
    try {
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached) as { narrative: string; wordCount: number };
        return { status: "success", narrative: parsed.narrative, wordCount: parsed.wordCount };
      }
    } catch { /* sessionStorage unavailable or parse failure */ }
    return { status: "loading" };
  });
  const hadCacheHit = useRef(state.status === "success");
  const renderedRef = useRef(false);
  const [copyState, setCopyState] = useState<"idle" | "copied">("idle");
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const retryCountRef = useRef(0);
  // Stabilize object deps to avoid re-fetching on identical-value re-renders
  const inputKey = useMemo(() => JSON.stringify(input), [input]);
  const troubleKey = useMemo(() => JSON.stringify(troubleContext ?? null), [troubleContext]);

  const fetchNarrative = useCallback(async () => {
    // Cancel any in-flight request
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setState({ status: "loading" });
    trackEvent("narrative_fetch_started", { trust_mode: narrativeTrustMode });
    const startTime = Date.now();

    try {
      const parsedInput = JSON.parse(inputKey) as RoundInput;
      const parsedTrouble = JSON.parse(troubleKey) as RoundTroubleContext | null;
      const body: Record<string, unknown> = { ...parsedInput };
      if (parsedTrouble && parsedTrouble.troubleHoles.length > 0) {
        body.troubleContext = parsedTrouble;
      }

      const res = await fetch("/api/narrative", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as {
          code?: string;
        };
        const errorType = mapErrorCode(res.status, data.code);
        trackEvent("narrative_fetch_failed", {
          trust_mode: narrativeTrustMode,
          error_type: errorType,
          http_status: res.status,
          error_code: data.code,
          latency_ms: Date.now() - startTime,
          retry_count: retryCountRef.current,
        });
        const retryable = errorType === "timeout" || errorType === "network" || errorType === "generation";
        setState({ status: "error", retryable });
        return;
      }

      const data = (await res.json()) as {
        narrative: string;
        word_count: number;
      };
      const latencyMs = Date.now() - startTime;

      trackEvent("narrative_fetch_completed", {
        trust_mode: narrativeTrustMode,
        latency_ms: latencyMs,
        word_count: data.word_count,
      });
      try {
        sessionStorage.setItem(cacheKey, JSON.stringify({ narrative: data.narrative, wordCount: data.word_count }));
      } catch { /* quota exceeded or unavailable */ }
      setState({
        status: "success",
        narrative: data.narrative,
        wordCount: data.word_count,
      });
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") return;
      trackEvent("narrative_fetch_failed", {
        trust_mode: narrativeTrustMode,
        error_type: "network",
        latency_ms: Date.now() - startTime,
        retry_count: retryCountRef.current,
      });
      setState({ status: "error", retryable: true });
    }
  }, [inputKey, troubleKey, cacheKey, narrativeTrustMode]);

  useEffect(() => {
    if (isSharedLink || isQuarantined) return;
    if (hadCacheHit.current) return;
    fetchNarrative();

    return () => {
      abortRef.current?.abort();
    };
  }, [fetchNarrative, isQuarantined, isSharedLink]);

  // Fire narrative_rendered once per narrative lifecycle
  useEffect(() => {
    if (state.status === "success" && !renderedRef.current) {
      renderedRef.current = true;
      trackEvent("narrative_rendered", {
        trust_mode: narrativeTrustMode,
        source: hadCacheHit.current ? "cache" : "fetch",
      });
    }
  }, [state.status, narrativeTrustMode]);

  // Cleanup copy timer on unmount
  useEffect(() => {
    return () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    };
  }, []);

  // Don't render for shared links or quarantined rounds
  if (isSharedLink || isQuarantined) return null;
  if (state.status === "error" && !state.retryable) {
    return (
      <div
        className="animate-fade-up [animation-delay:350ms] rounded-xl border border-cream-200 bg-white p-6 shadow-sm"
        data-testid="narrative-unavailable"
      >
        <p className="text-sm text-neutral-400">
          Round analysis is temporarily unavailable.
        </p>
      </div>
    );
  }

  const handleCopy = async () => {
    if (state.status !== "success") return;

    const encoded = encodeRound(input);
    const copyText = `${state.narrative}\n\n\u2014 Golf Data Viz\nSee full breakdown: golfdataviz.com/strokes-gained?d=${encoded}`;

    if (copyTimerRef.current) clearTimeout(copyTimerRef.current);

    try {
      await navigator.clipboard.writeText(copyText);
      setCopyState("copied");
      trackEvent("narrative_copied", {
        word_count: state.wordCount,
        surface: "results_page",
        trust_mode: narrativeTrustMode,
      });
      copyTimerRef.current = setTimeout(() => setCopyState("idle"), 2000);
    } catch {
      // Fallback: hidden textarea + execCommand
      const textarea = document.createElement("textarea");
      textarea.value = copyText;
      textarea.style.position = "fixed";
      textarea.style.left = "-9999px";
      document.body.appendChild(textarea);
      try {
        textarea.select();
        const ok = document.execCommand("copy");
        if (!ok) throw new Error("execCommand returned false");
        setCopyState("copied");
        trackEvent("narrative_copied", {
          word_count: state.wordCount,
          surface: "results_page",
          trust_mode: narrativeTrustMode,
        });
        copyTimerRef.current = setTimeout(() => setCopyState("idle"), 2000);
      } catch {
        // Silently fail — copy is best-effort
      } finally {
        document.body.removeChild(textarea);
      }
    }
  };

  // Retryable error state
  if (state.status === "error" && state.retryable) {
    return (
      <div
        className="animate-fade-up [animation-delay:350ms] rounded-xl border border-cream-200 bg-white p-6 shadow-sm"
        data-testid="narrative-error"
      >
        <p className="text-sm text-neutral-500">
          Couldn&apos;t generate your round analysis.
        </p>
        <button
          type="button"
          onClick={() => { retryCountRef.current++; fetchNarrative(); }}
          data-testid="narrative-retry"
          className="mt-3 rounded-lg border-2 border-cream-200 bg-white px-4 py-2 text-sm font-medium text-neutral-800 transition-all duration-200 hover:border-brand-800/30 hover:bg-cream-50"
        >
          Try Again
        </button>
      </div>
    );
  }

  // Loading skeleton
  if (state.status === "loading") {
    return (
      <div
        className="animate-fade-up [animation-delay:350ms] rounded-xl border border-cream-200 bg-white p-6 shadow-sm"
        data-testid="narrative-loading"
      >
        <p className="mb-3 text-xs text-neutral-400">
          Generating your round analysis...
        </p>
        <div className="space-y-2">
          <div className="h-3 w-full animate-pulse rounded bg-cream-100" />
          <div className="h-3 w-5/6 animate-pulse rounded bg-cream-100" />
          <div className="h-3 w-4/6 animate-pulse rounded bg-cream-100" />
        </div>
      </div>
    );
  }

  // All non-success states handled above
  if (state.status !== "success") return null;

  return (
    <div
      className="animate-fade-up [animation-delay:350ms] rounded-xl border border-cream-200 bg-white p-6 shadow-sm"
      data-testid="narrative-block"
    >
      <p className="mb-3 text-sm font-semibold uppercase tracking-[0.15em] text-brand-800">
        Round Analysis
      </p>
      <p className="text-sm leading-relaxed text-neutral-600">
        {state.narrative}
      </p>
      <div className="mt-4 flex items-center gap-3">
        <button
          type="button"
          onClick={handleCopy}
          data-testid="narrative-copy"
          className="rounded-lg border-2 border-cream-200 bg-white px-4 py-2 text-sm font-medium text-neutral-800 transition-all duration-200 hover:border-brand-800/30 hover:bg-cream-50"
        >
          {copyState === "copied" ? "Copied!" : "Copy Text"}
        </button>
      </div>
      <p className="mt-3 text-[10px] text-neutral-400">Powered by Claude</p>
    </div>
  );
}
