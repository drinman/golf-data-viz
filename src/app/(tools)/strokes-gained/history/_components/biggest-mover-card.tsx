"use client";

import { useEffect } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";
import type { BiggestMover } from "@/lib/golf/trends";
import { trackEvent } from "@/lib/analytics/client";

interface BiggestMoverCardProps {
  mover: BiggestMover | null;
}

export function BiggestMoverCard({ mover }: BiggestMoverCardProps) {
  useEffect(() => {
    if (mover) {
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
          ? "border-green-200 bg-green-50"
          : "border-amber-200 bg-amber-50"
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`mt-0.5 rounded-lg p-2 ${
            isImproving ? "bg-green-100" : "bg-amber-100"
          }`}
        >
          <Icon
            className={`h-5 w-5 ${
              isImproving ? "text-green-700" : "text-amber-700"
            }`}
          />
        </div>
        <div>
          <h3
            className={`font-display text-lg tracking-tight ${
              isImproving ? "text-green-900" : "text-amber-900"
            }`}
          >
            Biggest Mover: {mover.label}
          </h3>
          <p
            className={`mt-1 text-sm ${
              isImproving ? "text-green-800" : "text-amber-800"
            }`}
          >
            {mover.copyText}
          </p>
        </div>
      </div>
    </div>
  );
}
