"use client";

import { useRef, useEffect } from "react";
import { trackEvent } from "@/lib/analytics/client";
import type { TroubleNarrative } from "@/lib/golf/trouble-context";

interface TroubleContextNarrativeProps {
  narrative: TroubleNarrative;
  teeCount: number;
  totalHoles: number;
  onRemove?: () => void;
}

export function TroubleContextNarrative({
  narrative,
  teeCount,
  totalHoles,
  onRemove,
}: TroubleContextNarrativeProps) {
  const viewedRef = useRef(false);

  useEffect(() => {
    if (!viewedRef.current) {
      viewedRef.current = true;
      trackEvent("trouble_narrative_viewed", {
        tee_count: teeCount,
        total_holes: totalHoles,
      });
    }
  }, [teeCount, totalHoles]);

  return (
    <div data-testid="trouble-narrative" className="space-y-2">
      <div className="rounded-lg border border-brand-100 bg-brand-50/50 px-5 py-4">
        <p className="font-display text-sm font-semibold tracking-tight text-neutral-950">
          {narrative.headline}
        </p>
        <p className="mt-1 text-xs leading-relaxed text-neutral-600">
          {narrative.body}
        </p>
      </div>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="text-xs font-medium text-neutral-400 transition-colors hover:text-neutral-600"
        >
          Remove trouble context
        </button>
      )}
    </div>
  );
}
