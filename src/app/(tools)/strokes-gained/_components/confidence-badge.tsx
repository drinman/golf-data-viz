"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { ConfidenceLevel, StrokesGainedCategory } from "@/lib/golf/types";
import { CONFIDENCE_LABELS, CONFIDENCE_COLORS_TW } from "@/lib/golf/constants";
import { trackEvent } from "@/lib/analytics/client";

const CATEGORY_EXPLANATIONS: Record<
  StrokesGainedCategory,
  Record<ConfidenceLevel, string>
> = {
  "off-the-tee": {
    high: "Reserved for future inputs (distance, miss quality). Currently unreachable.",
    medium:
      "Based on fairway accuracy and penalty data only. Does not measure driving distance or miss quality.",
    low: "Based on penalty strokes only. Fairway data not provided.",
  },
  approach: {
    high: "Greens in regulation provided directly.",
    medium: "GIR estimated from scoring distribution.",
    low: "Insufficient data for approach calculation.",
  },
  "around-the-green": {
    high: "Up-and-down data provided directly.",
    medium: "Scramble rate estimated from GIR and scoring.",
    low: "Scramble rate estimated from estimated GIR — double estimation.",
  },
  putting: {
    high: "Total putts provided directly.",
    medium: "Putting data partially available.",
    low: "Insufficient putting data.",
  },
};

interface ConfidenceBadgeProps {
  level: ConfidenceLevel;
  category: StrokesGainedCategory;
  interactive?: boolean;
  /** Controlled open state — pass from parent to enforce only-one-open. */
  isOpen?: boolean;
  /** Called when the badge wants to toggle. Parent decides final state. */
  onToggle?: () => void;
}

export function ConfidenceBadge({
  level,
  category,
  interactive = true,
  isOpen,
  onToggle,
}: ConfidenceBadgeProps) {
  // Uncontrolled fallback when used without parent coordination (e.g. tests, standalone)
  const [internalOpen, setInternalOpen] = useState(false);
  const controlled = isOpen !== undefined;
  const open = controlled ? isOpen : internalOpen;

  const wrapperRef = useRef<HTMLSpanElement>(null);

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
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        close();
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open, close]);

  const handleClick = useCallback(() => {
    if (controlled) {
      onToggle?.();
      if (!open) {
        trackEvent("confidence_badge_clicked", { category, level });
      }
    } else {
      setInternalOpen((prev) => {
        if (!prev) trackEvent("confidence_badge_clicked", { category, level });
        return !prev;
      });
    }
  }, [controlled, onToggle, open, category, level]);

  const style = CONFIDENCE_COLORS_TW[level];
  const label = CONFIDENCE_LABELS[level];

  if (!interactive) {
    return (
      <span
        className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide ${style.bg} ${style.text}`}
      >
        {label}
      </span>
    );
  }

  return (
    <span className="relative" ref={wrapperRef}>
      <button
        type="button"
        aria-label={`${label} confidence`}
        aria-expanded={open}
        aria-controls={`confidence-help-${category}`}
        onClick={handleClick}
        className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide transition-colors hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-brand-800/30 ${style.bg} ${style.text}`}
      >
        {label}
      </button>
      {open && (
        <div
          id={`confidence-help-${category}`}
          role="dialog"
          aria-label={`${label} confidence explanation`}
          className="absolute right-0 top-full z-10 mt-2 w-56 rounded-lg border border-cream-200 bg-white p-3 text-left text-xs leading-relaxed text-neutral-600 shadow-lg"
        >
          {CATEGORY_EXPLANATIONS[category][level]}
        </div>
      )}
    </span>
  );
}
