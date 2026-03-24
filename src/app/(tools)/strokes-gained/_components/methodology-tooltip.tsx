"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Info } from "lucide-react";
import type { StrokesGainedCategory } from "@/lib/golf/types";
import { trackEvent } from "@/lib/analytics/client";

const METHODOLOGY_CONTENT: Record<
  StrokesGainedCategory,
  { measures: string; doesntCapture: string; interpret: string }
> = {
  "off-the-tee": {
    measures: "Fairway hit rate + penalty performance vs handicap peers.",
    doesntCapture:
      "Driving distance, miss direction, playable misses.",
    interpret:
      "OTT and Approach may be lightly rebalanced when your round pattern suggests the default attribution is misleading.",
  },
  approach: {
    measures: "GIR rate vs peer benchmarks.",
    doesntCapture:
      "Binary GIR — great shots narrowly missing still count as misses.",
    interpret:
      "OTT and Approach may be lightly rebalanced when your round pattern suggests the default split is off.",
  },
  "around-the-green": {
    measures: "Up-and-down / scramble performance.",
    doesntCapture:
      "Fallback estimates blur approach leaves, chip quality, putting.",
    interpret: "Trust most with direct short-game data.",
  },
  putting: {
    measures:
      "Total putts vs peer benchmarks, with an optional bounded three-putt adjustment.",
    doesntCapture: "Putt starting distance (3 ft vs 30 ft).",
    interpret:
      "Cleaner scorecard category, but still outcome-based and sensitive to GIR mix.",
  },
};

interface MethodologyTooltipProps {
  category: StrokesGainedCategory;
  /** Controlled open state — pass from parent to enforce only-one-open. */
  isOpen?: boolean;
  /** Called when the tooltip wants to toggle. Parent decides final state. */
  onToggle?: () => void;
  /** Raw signal value before reconciliation (V3 only). */
  signalValue?: number;
  /** Reconciliation adjustment applied to this category (V3 only). */
  reconciliationAdjustment?: number;
  /** Whether the low-GIR putting caveat applies (putting only). */
  lowGirPuttingCaveat?: boolean;
}

function formatSignalValue(value: number): string {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}`;
}

export function MethodologyTooltip({
  category,
  isOpen,
  onToggle,
  signalValue,
  reconciliationAdjustment,
  lowGirPuttingCaveat,
}: MethodologyTooltipProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const controlled = isOpen !== undefined;
  const open = controlled ? isOpen : internalOpen;
  const prevOpenRef = useRef(open);

  const wrapperRef = useRef<HTMLSpanElement>(null);
  const popoverId = `methodology-help-${category}`;

  // Fire analytics on closed→open transition
  useEffect(() => {
    if (open && !prevOpenRef.current) {
      trackEvent("methodology_tooltip_opened", {
        category,
        surface: "results_summary",
      });
    }
    prevOpenRef.current = open;
  }, [open, category]);

  const close = useCallback(() => {
    if (controlled) {
      if (open) onToggle?.();
    } else {
      setInternalOpen(false);
    }
  }, [controlled, open, onToggle]);

  // Escape key dismisses
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, close]);

  // Click outside dismisses
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        close();
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open, close]);

  const handleClick = useCallback(() => {
    if (controlled) {
      onToggle?.();
    } else {
      setInternalOpen((prev) => !prev);
    }
  }, [controlled, onToggle]);

  const content = METHODOLOGY_CONTENT[category];

  return (
    <span className="relative" ref={wrapperRef}>
      <button
        type="button"
        aria-label={`Methodology info for ${category}`}
        aria-expanded={open}
        aria-controls={popoverId}
        onClick={handleClick}
        className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-sm text-neutral-400 transition-colors hover:text-neutral-600 focus:outline-none focus:ring-2 focus:ring-brand-800/30 focus:ring-offset-1"
      >
        <Info className="h-3.5 w-3.5" />
      </button>
      {open && (
        <div
          id={popoverId}
          role="dialog"
          aria-label={`Methodology info for ${category}`}
          className="absolute left-0 top-full z-10 mt-2 w-64 rounded-lg border border-cream-200 bg-white p-3 text-left text-xs leading-relaxed text-neutral-600 shadow-lg"
        >
          <p>
            <strong className="text-neutral-800">Measures:</strong>{" "}
            {content.measures}
          </p>
          <p className="mt-2">
            <strong className="text-neutral-800">Doesn&apos;t capture:</strong>{" "}
            {content.doesntCapture}
          </p>
          <p className="mt-2">
            <strong className="text-neutral-800">Interpret it:</strong>{" "}
            {content.interpret}
          </p>
          {signalValue != null && reconciliationAdjustment != null && (
            <div className="mt-2.5 border-t border-cream-200 pt-2.5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-neutral-400">
                Signal breakdown
              </p>
              <dl className="mt-1.5 space-y-0.5 font-mono text-[11px] tabular-nums">
                <div className="flex items-baseline justify-between">
                  <dt className="text-neutral-500">Signal estimate</dt>
                  <dd className={signalValue >= 0 ? "text-data-positive" : "text-data-negative"}>
                    {formatSignalValue(signalValue)}
                  </dd>
                </div>
                <div className="flex items-baseline justify-between">
                  <dt className="text-neutral-500">Score adjustment</dt>
                  <dd className={reconciliationAdjustment >= 0 ? "text-data-positive" : "text-data-negative"}>
                    {formatSignalValue(reconciliationAdjustment)}
                  </dd>
                </div>
              </dl>
            </div>
          )}
          {category === "putting" && lowGirPuttingCaveat && (
            <div className="mt-2.5 rounded border border-amber-200/60 bg-amber-50/50 px-2 py-1.5">
              <p className="text-amber-800">
                <strong className="text-amber-900">Low GIR note:</strong> With few greens hit,
                most putts come after chips (shorter distances). This may overstate putting
                performance for this round.
              </p>
            </div>
          )}
        </div>
      )}
    </span>
  );
}
