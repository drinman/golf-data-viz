import type { CSSProperties } from "react";
import type { RoundSgSnapshot } from "@/lib/golf/trends";
import { CATEGORY_ORDER, CATEGORY_LABELS, SG_NEAR_ZERO_THRESHOLD } from "@/lib/golf/constants";
import { cn } from "@/lib/utils";

interface RoundHistoryCardProps {
  round: RoundSgSnapshot;
  className?: string;
  style?: CSSProperties;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function sgColor(value: number): string {
  if (value > 0) return "text-data-positive";
  if (value < 0) return "text-red-600";
  return "text-neutral-600";
}

function sgSign(value: number): string {
  if (value > 0) return `+${value.toFixed(1)}`;
  return value.toFixed(1);
}

function accentBarColor(sgTotal: number): string {
  if (sgTotal > SG_NEAR_ZERO_THRESHOLD) return "bg-data-positive";
  if (sgTotal < -SG_NEAR_ZERO_THRESHOLD) return "bg-data-negative";
  return "bg-neutral-400";
}

const CATEGORY_SG_KEYS: Record<
  (typeof CATEGORY_ORDER)[number],
  keyof Pick<
    RoundSgSnapshot,
    "sgOffTheTee" | "sgApproach" | "sgAroundTheGreen" | "sgPutting"
  >
> = {
  "off-the-tee": "sgOffTheTee",
  approach: "sgApproach",
  "around-the-green": "sgAroundTheGreen",
  putting: "sgPutting",
};

export function RoundHistoryCard({
  round,
  className,
  style,
}: RoundHistoryCardProps) {
  // Shared scale across all 4 categories for proportional comparison within a round
  const categoryValues = CATEGORY_ORDER.map((cat) => round[CATEGORY_SG_KEYS[cat]]);
  // Floor at 0.5 so a round with all tiny SG values (e.g. ±0.1) doesn't fill half the bar
  const scaleCap = Math.max(
    ...categoryValues.map((v) => Math.abs(v)),
    0.5
  );

  return (
    <div
      data-testid="round-history-card"
      className={cn("rounded-xl border border-card-border bg-card shadow-sm transition-shadow hover:shadow-md", className)}
      style={style}
    >
      <div className="flex items-start gap-4 p-4">
        {/* Left accent bar — color reflects overall SG */}
        <div
          className={`mt-0.5 h-12 w-1 shrink-0 rounded-full ${accentBarColor(round.sgTotal)}`}
          aria-hidden="true"
        />

        <div className="min-w-0 flex-1">
          {/* Header row */}
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate font-medium text-neutral-950">
                {round.courseName}
              </p>
              <p className="text-sm text-neutral-500">
                {formatDate(round.playedAt)} &middot; Score: {round.score}
                {round.handicapIndex != null && (
                  <> &middot; {round.handicapIndex.toFixed(1)} HCP</>
                )}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span
                className={`font-mono text-lg font-semibold ${sgColor(round.sgTotal)}`}
              >
                {sgSign(round.sgTotal)}
              </span>
            </div>
          </div>

          {/* Diverging mini-bars */}
          <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4 sm:gap-2">
            {CATEGORY_ORDER.map((cat) => {
              const value = round[CATEGORY_SG_KEYS[cat]];
              const isNearZero = Math.abs(value) <= SG_NEAR_ZERO_THRESHOLD;
              // Width as % of half-bar (50% is center)
              const barPct = isNearZero ? 2 : Math.min(Math.abs(value) / scaleCap, 1) * 48;
              const isPositive = value > 0;

              return (
                <div key={cat} className="min-w-0">
                  <div className="flex items-baseline justify-between gap-1">
                    <p className="truncate text-[10px] font-medium text-neutral-500">
                      {CATEGORY_LABELS[cat]}
                    </p>
                    <span
                      className={`shrink-0 font-mono text-[10px] ${sgColor(value)}`}
                    >
                      {sgSign(value)}
                    </span>
                  </div>
                  {/* Diverging bar — center line at 50% */}
                  <div className="relative mt-0.5 h-1.5 w-full rounded-full bg-neutral-100">
                    {/* Center line */}
                    <div
                      className="absolute left-1/2 top-0 h-full w-px bg-neutral-400"
                      aria-hidden="true"
                    />
                    {/* Value bar */}
                    <div
                      className={`absolute top-0 h-full rounded-full ${
                        isNearZero
                          ? "bg-neutral-400"
                          : isPositive
                            ? "bg-data-positive"
                            : "bg-data-negative"
                      }`}
                      style={{
                        width: `${barPct}%`,
                        opacity: isNearZero ? 0.3 : 0.8,
                        ...(isPositive || isNearZero
                          ? { left: "50%" }
                          : { right: "50%" }),
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
