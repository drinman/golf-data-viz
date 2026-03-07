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
      "Use this as an accuracy-and-trouble signal, not a full measure of driving value.",
  },
  approach: {
    measures: "GIR rate vs peer benchmarks.",
    doesntCapture:
      "Binary GIR — great shots narrowly missing still count as misses.",
    interpret:
      "Directional signal across rounds, not shot-quality grade.",
  },
  "around-the-green": {
    measures: "Up-and-down / scramble performance.",
    doesntCapture:
      "Fallback estimates blur approach leaves, chip quality, putting.",
    interpret: "Trust most with direct short-game data.",
  },
  putting: {
    measures: "Total putts vs peer benchmarks.",
    doesntCapture: "Putt starting distance (3 ft vs 30 ft).",
    interpret: "Cleaner scorecard category, but outcome-based.",
  },
};

interface MethodologyTooltipProps {
  category: StrokesGainedCategory;
  /** Controlled open state — pass from parent to enforce only-one-open. */
  isOpen?: boolean;
  /** Called when the tooltip wants to toggle. Parent decides final state. */
  onToggle?: () => void;
}

export function MethodologyTooltip({
  category,
  isOpen,
  onToggle,
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
        className="text-neutral-400 transition-colors hover:text-neutral-600 focus:outline-none focus:ring-2 focus:ring-brand-800/30 focus:ring-offset-1 rounded-sm"
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
        </div>
      )}
    </span>
  );
}
