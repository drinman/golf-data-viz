"use client";

import { useEffect, useRef } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";
import type { BiggestMover } from "@/lib/golf/trends";
import { trackEvent } from "@/lib/analytics/client";

interface BiggestMoverCardProps {
  mover: BiggestMover | null;
}

export function BiggestMoverCard({ mover }: BiggestMoverCardProps) {
  const trackedCategoryRef = useRef<string | null>(null);

  useEffect(() => {
    if (mover && trackedCategoryRef.current !== mover.category) {
      trackedCategoryRef.current = mover.category;
      trackEvent("biggest_mover_viewed", {
        category: mover.category,
        direction: mover.direction,
        confidence: mover.confidence,
      });
    }
  }, [mover]);

  if (!mover) return null;

  const isImproving = mover.direction === "improving";
  const Icon = isImproving ? TrendingUp : TrendingDown;

  return (
    <div
      data-testid="biggest-mover-card"
      className={`rounded-xl border p-5 shadow-sm ${
        isImproving
          ? "border-brand-100 bg-brand-50"
          : "border-red-100 bg-red-50"
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`mt-0.5 rounded-lg p-2 ${
            isImproving ? "bg-brand-100" : "bg-red-100"
          }`}
        >
          <Icon
            className={`h-5 w-5 ${
              isImproving ? "text-data-positive" : "text-data-negative"
            }`}
          />
        </div>
        <div>
          <h3 className="font-display text-lg tracking-tight text-neutral-950">
            Biggest Mover: {mover.label}
          </h3>
          <p className="mt-1 text-sm text-neutral-600">
            {mover.copyText}
          </p>
        </div>
      </div>
    </div>
  );
}
