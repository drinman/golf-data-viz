"use client";

import { useMemo } from "react";
import type { RoundSgSnapshot } from "@/lib/golf/trends";

export function SummaryStats({ rounds }: { rounds: RoundSgSnapshot[] }) {
  const stats = useMemo(() => {
    if (rounds.length === 0) {
      return {
        roundsPlayed: 0,
        avgScore: "—",
        lastPlayed: "—",
      };
    }

    const avgScore = rounds.reduce((sum, r) => sum + r.score, 0) / rounds.length;
    const sorted = [...rounds].sort(
      (a, b) =>
        new Date(b.playedAt + "T00:00:00").getTime() -
        new Date(a.playedAt + "T00:00:00").getTime()
    );
    const lastPlayed = new Date(sorted[0].playedAt + "T00:00:00").toLocaleDateString(
      "en-US",
      {
        month: "short",
        day: "numeric",
      }
    );
    return {
      roundsPlayed: rounds.length,
      avgScore: avgScore.toFixed(1),
      lastPlayed,
    };
  }, [rounds]);

  const items = [
    { label: "Rounds Played", value: stats.roundsPlayed },
    { label: "Avg Score", value: stats.avgScore },
    { label: "Last Played", value: stats.lastPlayed },
  ];

  return (
    <div className="animate-fade-up grid grid-cols-2 gap-3 sm:grid-cols-3">
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-lg border border-cream-200 bg-card px-4 py-3"
        >
          <p className="text-xs font-medium uppercase tracking-[0.15em] text-neutral-400">
            {item.label}
          </p>
          <p className="mt-0.5 font-mono text-lg font-semibold text-neutral-950">
            {item.value}
          </p>
        </div>
      ))}
    </div>
  );
}
