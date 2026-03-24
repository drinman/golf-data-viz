"use client";

import { useRef, useEffect } from "react";
import { trackEvent } from "@/lib/analytics/client";

interface TroubleContextPromptProps {
  onAddContext: () => void;
  onDismiss: () => void;
}

export function TroubleContextPrompt({
  onAddContext,
  onDismiss,
}: TroubleContextPromptProps) {
  const viewedRef = useRef(false);

  useEffect(() => {
    if (!viewedRef.current) {
      viewedRef.current = true;
      trackEvent("trouble_context_prompt_viewed");
    }
  }, []);

  return (
    <div
      data-testid="trouble-context-prompt"
      className="rounded-lg border border-amber-200 bg-amber-50 px-5 py-4"
    >
      <p className="font-display text-sm font-semibold tracking-tight text-neutral-950">
        Improve your results
      </p>
      <p className="mt-1 text-xs leading-relaxed text-neutral-600">
        Some of your missed greens or short-game struggles may have started with
        trouble earlier in the hole. Add a little context and we&apos;ll refine
        the explanation.
      </p>
      <div className="mt-3 flex items-center gap-3">
        <button
          type="button"
          onClick={onAddContext}
          className="min-h-11 rounded-lg bg-brand-800 px-4 py-2 text-sm font-medium text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-brand-700 hover:shadow-md active:translate-y-0"
        >
          Add trouble context
        </button>
        <button
          type="button"
          onClick={() => {
            trackEvent("trouble_context_prompt_dismissed");
            onDismiss();
          }}
          className="inline-flex min-h-11 items-center text-sm font-medium text-neutral-500 transition-colors hover:text-neutral-700"
        >
          Not now
        </button>
      </div>
    </div>
  );
}
