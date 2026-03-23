"use client";

import { useEffect, useRef, useState } from "react";
import { CircleCheck, Loader2 } from "lucide-react";
import * as Sentry from "@sentry/nextjs";
import { trackEvent } from "@/lib/analytics/client";
import type { RoundInput } from "@/lib/golf/types";
import type { SaveRoundResult } from "../actions";
import { saveRound } from "../actions";

function getUserAgentClass(): "mobile" | "desktop" {
  if (typeof navigator === "undefined") return "desktop";
  return /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ? "mobile" : "desktop";
}

interface PostResultsSaveCtaProps {
  input: RoundInput;
  isAuthenticated: boolean;
  onSaveComplete: (result: SaveRoundResult & { success: true }) => void;
}

type Phase = "idle" | "saving" | "success" | "error" | "already_saved";

function classifyError(
  code: string
): "config" | "runtime" | "network" | "rate_limited" | "duplicate" {
  switch (code) {
    case "DUPLICATE_ROUND":
      return "duplicate";
    case "SAVE_DISABLED":
      return "config";
    case "RATE_LIMITED":
      return "rate_limited";
    default:
      return "runtime";
  }
}

export function PostResultsSaveCta({
  input,
  isAuthenticated,
  onSaveComplete,
}: PostResultsSaveCtaProps) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const honeypotRef = useRef<HTMLInputElement | null>(null);
  const viewedRef = useRef(false);

  useEffect(() => {
    if (!viewedRef.current) {
      viewedRef.current = true;
      trackEvent("post_results_save_cta_viewed");
    }
  }, []);

  async function handleSave() {
    trackEvent("post_results_save_cta_clicked");
    trackEvent("save_attempted", {
      auth_state: isAuthenticated ? "authenticated" : "anonymous",
    });

    setPhase("saving");
    setErrorMessage(null);

    let res: SaveRoundResult;
    try {
      const savePromise = saveRound(input, { honeypot: honeypotRef.current?.value });
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Save request timed out after 15s")), 15000)
      );
      res = await Promise.race([savePromise, timeoutPromise]);
    } catch (networkErr) {
      trackEvent("round_save_failed", {
        error_type: "network",
        error_code: networkErr instanceof Error ? networkErr.message : "unknown",
        auth_state: isAuthenticated ? "authenticated" : "anonymous",
        user_agent_class: getUserAgentClass(),
      });
      Sentry.captureException(networkErr, {
        extra: {
          source: "saveRound_client",
          isAuthenticated,
          error: networkErr instanceof Error ? networkErr.message : String(networkErr),
        },
      });
      setPhase("error");
      setErrorMessage("Round could not be saved. Check your connection and try again.");
      return;
    }

    if (res.success) {
      trackEvent("round_saved", {
        auth_state: isAuthenticated ? "authenticated" : "anonymous",
        user_agent_class: getUserAgentClass(),
      });
      setPhase("success");
      // Brief success micro-interaction beat before notifying parent
      setTimeout(() => {
        onSaveComplete(res);
      }, 300);
      return;
    }

    // Failure
    const errorType = classifyError(res.code);
    trackEvent("round_save_failed", {
      error_type: errorType,
      error_code: res.code,
      auth_state: isAuthenticated ? "authenticated" : "anonymous",
      user_agent_class: getUserAgentClass(),
    });

    if (res.code === "DUPLICATE_ROUND") {
      setPhase("already_saved");
      return;
    }

    setPhase("error");

    Sentry.captureMessage(`Save round failed: ${res.code}`, {
      level: "warning",
      extra: {
        code: res.code,
        message: res.message,
        isAuthenticated,
      },
    });

    setErrorMessage(res.message);
  }

  function handleRetry() {
    setPhase("idle");
    setErrorMessage(null);
  }

  // Already saved — terminal state
  if (phase === "already_saved") {
    return (
      <div
        data-testid="post-results-save-cta"
        className="animate-fade-up [animation-delay:500ms] rounded-xl border border-green-200 bg-green-50 px-5 py-4"
      >
        <div className="flex items-center gap-2 text-sm font-medium text-green-800">
          <CircleCheck className="h-5 w-5 shrink-0" />
          Already saved
        </div>
      </div>
    );
  }

  // Success micro-interaction
  if (phase === "success") {
    return (
      <div
        data-testid="post-results-save-cta"
        className="animate-fade-up [animation-delay:500ms] rounded-xl border border-green-200 bg-green-50 px-5 py-4"
      >
        <div className="flex items-center gap-2 text-sm font-medium text-green-800">
          <CircleCheck className="h-5 w-5 shrink-0 animate-pulse" />
          Saved!
        </div>
      </div>
    );
  }

  const isLoading = phase === "saving";
  const heading = isAuthenticated
    ? "Add to your history"
    : "Want to track your progress?";
  const body = isAuthenticated
    ? "Save this round to your history and track your SG trends."
    : "Save this round and see how your strokes gained changes over time.";
  const buttonText = isAuthenticated ? "Save to History" : "Save This Round";

  return (
    <div
      data-testid="post-results-save-cta"
      className={`${phase === "error" ? "animate-shake" : "animate-fade-up [animation-delay:500ms]"} rounded-xl border border-brand-200 bg-brand-50/30 px-5 py-5`}
    >
      <p className="text-sm font-medium text-neutral-900">{heading}</p>
      <p className="mt-1 text-sm text-neutral-600">{body}</p>
      {!isAuthenticated && (
        <p className="mt-1 text-xs text-brand-800 font-medium">
          Free. No account required.
        </p>
      )}

      <div className="mt-3 flex items-center gap-3">
        {phase === "error" ? (
          <>
            <span className="text-sm text-amber-800">{errorMessage}</span>
            <button
              type="button"
              onClick={handleRetry}
              className="rounded-lg border-2 border-cream-200 bg-white px-4 py-2 text-sm font-medium text-neutral-800 transition-all duration-200 hover:border-brand-800/30 hover:bg-cream-50"
            >
              Try again
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={handleSave}
            disabled={isLoading}
            className="rounded-lg bg-brand-800 px-5 py-2.5 text-sm font-medium text-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </span>
            ) : (
              buttonText
            )}
          </button>
        )}
      </div>

      {/* Honeypot: invisible to humans, filled by bots */}
      <input
        ref={honeypotRef}
        type="text"
        name="website"
        autoComplete="off"
        tabIndex={-1}
        aria-hidden="true"
        className="absolute -left-[9999px] h-0 w-0 overflow-hidden opacity-0"
      />
    </div>
  );
}
