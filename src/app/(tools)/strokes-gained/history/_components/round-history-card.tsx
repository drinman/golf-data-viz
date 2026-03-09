import type { RoundSgSnapshot } from "@/lib/golf/trends";
import { CATEGORY_ORDER, CATEGORY_LABELS } from "@/lib/golf/constants";
import { TREND_CATEGORY_COLORS } from "@/lib/golf/trends";

interface RoundHistoryCardProps {
  round: RoundSgSnapshot;
  currentMethodologyVersion?: string;
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
  currentMethodologyVersion,
}: RoundHistoryCardProps) {
  const showVersionBadge =
    currentMethodologyVersion &&
    round.methodologyVersion &&
    round.methodologyVersion !== currentMethodologyVersion;

  return (
    <div
      data-testid="round-history-card"
      className="rounded-xl border border-card-border bg-card shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="flex items-start gap-4 p-4">
        {/* Left color bar */}
        <div
          className="mt-0.5 h-12 w-1 shrink-0 rounded-full bg-brand-600"
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
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {showVersionBadge && (
                <span className="rounded bg-neutral-100 px-1.5 py-0.5 font-mono text-[10px] text-neutral-400">
                  v{round.methodologyVersion}
                </span>
              )}
              <span
                className={`font-mono text-lg font-semibold ${sgColor(round.sgTotal)}`}
              >
                {sgSign(round.sgTotal)}
              </span>
            </div>
          </div>

          {/* Category mini-bars */}
          <div className="mt-3 grid grid-cols-4 gap-2">
            {CATEGORY_ORDER.map((cat) => {
              const value = round[CATEGORY_SG_KEYS[cat]];
              const color = TREND_CATEGORY_COLORS[cat];
              const maxBar = 3; // clamp visual width
              const width = Math.min(Math.abs(value) / maxBar, 1) * 100;

              return (
                <div key={cat} className="min-w-0">
                  <p className="truncate text-[10px] font-medium text-neutral-500">
                    {CATEGORY_LABELS[cat]}
                  </p>
                  <div className="mt-0.5 flex items-center gap-1">
                    <div className="h-1.5 flex-1 rounded-full bg-neutral-100">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${width}%`,
                          backgroundColor: color,
                          opacity: value === 0 ? 0.3 : 0.8,
                        }}
                      />
                    </div>
                    <span
                      className={`font-mono text-[10px] ${sgColor(value)}`}
                    >
                      {sgSign(value)}
                    </span>
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
