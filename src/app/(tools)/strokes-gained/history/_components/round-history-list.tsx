import type { RoundSgSnapshot } from "@/lib/golf/trends";
import { METHODOLOGY_VERSION } from "@/lib/golf/constants";
import { RoundHistoryCard } from "./round-history-card";

interface RoundHistoryListProps {
  rounds: RoundSgSnapshot[];
}

export function RoundHistoryList({ rounds }: RoundHistoryListProps) {
  return (
    <div data-testid="round-history-list" className="space-y-3">
      <h2 className="font-display text-xl tracking-tight text-neutral-950">
        Round History
      </h2>
      {rounds.map((round) => (
        <RoundHistoryCard
          key={round.roundId}
          round={round}
          currentMethodologyVersion={METHODOLOGY_VERSION}
        />
      ))}
    </div>
  );
}
