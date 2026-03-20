"use client";

import { useEffect, useRef, useState } from "react";
import { CircleCheck, Loader2 } from "lucide-react";
import { trackEvent } from "@/lib/analytics/client";
import type { RoundInput } from "@/lib/golf/types";
import type { SaveRoundResult } from "../actions";
import { saveRound } from "../actions";
import {
  TurnstileWidget,
  type TurnstileWidgetHandle,
} from "@/components/security/turnstile-widget";

interface PostResultsSaveCtaProps {
  input: RoundInput;
  turnstileSiteKey: string | null;
  isAuthenticated: boolean;
  onSaveComplete: (result: SaveRoundResult & { success: true }) => void;
}

type Phase = "idle" | "verifying" | "saving" | "success" | "error" | "already_saved";

function classifyError(
  code: string
): "config" | "runtime" | "network" | "rate_limited" | "verification" | "duplicate" {
  switch (code) {
    case "DUPLICATE_ROUND":
      return "duplicate";
    case "SAVE_DISABLED":
      return "config";
    case "RATE_LIMITED":
      return "rate_limited";
    case "VERIFICATION_REQUIRED":
    case "VERIFICATION_FAILED":
      return "verification";
    default:
      return "runtime";
  }
}

export function PostResultsSaveCta({
  input,
  turnstileSiteKey,
  isAuthenticated,
  onSaveComplete,
}: PostResultsSaveCtaProps) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const turnstileRef = useRef<TurnstileWidgetHandle | null>(null);
  const viewedRef = useRef(false);

  useEffect(() => {
    if (!viewedRef.current) {
      viewedRef.current = true;
      trackEvent("post_results_save_cta_viewed");
    }
  }, []);

  async function handleSave() {
    trackEvent("post_results_save_cta_clicked");

    setPhase(isAuthenticated ? "saving" : "verifying");
    setErrorMessage(null);

    // Authenticated users skip Turnstile — they've already proven identity via OAuth.
    // Turnstile is only needed for anonymous saves to prevent bot spam.
    let token: string | null = null;
    if (!isAuthenticated) {
      if (!turnstileSiteKey || !turnstileRef.current) {
        trackEvent("round_save_failed", { error_type: "config" });
        setPhase("error");
        setErrorMessage("Save unavailable — please try again later.");
        return;
      }

      try {
        token = await turnstileRef.current.execute();
      } catch {
        trackEvent("round_save_failed", { error_type: "verification" });
        setPhase("error");
        setErrorMessage(
          "Verification blocked — your ad blocker may be preventing the bot check. Try disabling it or saving from a different browser."
        );
        return;
      }
    }

    setPhase("saving");

    let res: SaveRoundResult;
    try {
      res = await saveRound(input, { turnstileToken: token });
    } catch {
      trackEvent("round_save_failed", { error_type: "network" });
      setPhase("error");
      setErrorMessage("Round could not be saved.");
      return;
    }

    if (res.success) {
      trackEvent("round_saved");
      setPhase("success");
      // Brief success micro-interaction beat before notifying parent
      setTimeout(() => {
        onSaveComplete(res);
      }, 300);
      return;
    }

    // Failure
    const errorType = classifyError(res.code);
    trackEvent("round_save_failed", { error_type: errorType });

    if (res.code === "DUPLICATE_ROUND") {
      setPhase("already_saved");
      return;
    }

    setPhase("error");
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

  const isLoading = phase === "verifying" || phase === "saving";
  const heading = isAuthenticated
    ? "Add to your history"
    : "Want to track your progress?";
  const body = isAuthenticated
    ? "Save this round to your history and track your SG trends."
    : "Save this round and see how your strokes gained changes over time.";
  const buttonText = isAuthenticated ? "Save to History" : "Save This Round";
  const loadingText = phase === "verifying" ? "Verifying..." : "Saving...";

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
                {loadingText}
              </span>
            ) : (
              buttonText
            )}
          </button>
        )}
      </div>

      {!isAuthenticated && (
        <>
          <p className="mt-3 text-xs text-neutral-500">
            Cloudflare Turnstile verifies you&apos;re human.{" "}
            <a
              href="https://www.cloudflare.com/privacypolicy/"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-neutral-700"
            >
              Privacy Policy
            </a>{" "}
            and{" "}
            <a
              href="https://www.cloudflare.com/website-terms/"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-neutral-700"
            >
              Terms
            </a>
            .
          </p>

          {turnstileSiteKey && (
            <TurnstileWidget ref={turnstileRef} siteKey={turnstileSiteKey} />
          )}
        </>
      )}
    </div>
  );
}
