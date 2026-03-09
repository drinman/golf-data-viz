import type { RoundSgSnapshot } from "@/lib/golf/trends";
import { RoundHistoryCard } from "./round-history-card";

interface RoundHistoryListProps {
  rounds: RoundSgSnapshot[];
}

export function RoundHistoryList({ rounds }: RoundHistoryListProps) {
  return (
    <div data-testid="round-history-list" className="space-y-3">
      <h2 className="font-display text-xl tracking-tight text-neutral-950">
        Your Rounds
      </h2>
      {rounds.map((round, i) => (
        <RoundHistoryCard
          key={round.roundId}
          round={round}
          style={i < 6 ? { animationDelay: `${(i + 1) * 80}ms` } : undefined}
          className={i < 6 ? "animate-fade-up" : undefined}
        />
      ))}
    </div>
  );
}
