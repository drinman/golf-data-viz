import benchmarks from "@/data/benchmarks/handicap-brackets.json";

const anchor = benchmarks.anchors.find((a) => a.handicapIndex === 15);

export function PeerAnchorBlock() {
  if (!anchor) return null;

  return (
    <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-800">
        The average 15-handicap:
      </p>
      <div className="flex flex-wrap gap-x-5 gap-y-1">
        <span className="text-sm text-neutral-600">
          <span className="font-mono tabular-nums font-semibold text-neutral-950">
            {anchor.puttsPerRound}
          </span>{" "}
          putts/round
        </span>
        <span className="text-sm text-neutral-600">
          <span className="font-mono tabular-nums font-semibold text-neutral-950">
            {anchor.fairwayPercentage}%
          </span>{" "}
          fairways
        </span>
        <span className="text-sm text-neutral-600">
          <span className="font-mono tabular-nums font-semibold text-neutral-950">
            {anchor.girPercentage}%
          </span>{" "}
          greens in reg
        </span>
      </div>
    </div>
  );
}
