import type { RoundInput, StrokesGainedResult, BracketBenchmark } from "./types";

export type TroubleCause = "tee" | "approach" | "around_green" | "putting" | "penalty";
export const TROUBLE_CAUSES: readonly TroubleCause[] = [
  "tee",
  "approach",
  "around_green",
  "putting",
  "penalty",
] as const;
export const MAX_TROUBLE_HOLES = 8;

export interface TroubleHoleInput {
  holeNumber: number | null;
  primaryCause: TroubleCause;
}

export interface RoundTroubleContext {
  troubleHoles: TroubleHoleInput[];
  summary: Record<TroubleCause, number>;
}

export interface TroubleNarrative {
  headline: string;
  body: string;
  weaknessCaveat: string | null;
}

const CAUSE_LABELS: Record<TroubleCause, string> = {
  tee: "tee shots",
  approach: "approach shots",
  around_green: "short game",
  putting: "putting",
  penalty: "penalty strokes",
};

/**
 * Determine if the trouble context prompt should be shown.
 *
 * Trigger heuristic: playerFIR < peerFIR AND (approach_sg <= -0.5 OR atg_sg <= -0.5)
 */
export function shouldShowTroubleContextPrompt(
  input: RoundInput,
  result: StrokesGainedResult,
  benchmark: BracketBenchmark
): boolean {
  if (input.fairwaysHit == null || input.fairwayAttempts === 0) return false;

  const playerFIR = input.fairwaysHit / input.fairwayAttempts;
  const peerFIR = benchmark.fairwayPercentage / 100;

  if (playerFIR >= peerFIR) return false;

  const approachSG = result.categories.approach;
  const atgSG = result.categories["around-the-green"];

  return approachSG <= -0.5 || atgSG <= -0.5;
}

/** Count trouble holes by cause. */
export function buildTroubleContextSummary(
  holes: TroubleHoleInput[]
): Record<TroubleCause, number> {
  const summary: Record<TroubleCause, number> = {
    tee: 0,
    approach: 0,
    around_green: 0,
    putting: 0,
    penalty: 0,
  };
  for (const hole of holes) {
    summary[hole.primaryCause]++;
  }
  return summary;
}

/** Generate narrative text from trouble context. */
export function generateTroubleNarrative(
  context: RoundTroubleContext,
): TroubleNarrative {
  const { summary, troubleHoles } = context;
  const total = troubleHoles.length;
  const teeCount = summary.tee;

  // Find dominant cause
  let dominantCause: TroubleCause = "tee";
  let maxCount = 0;
  for (const cause of TROUBLE_CAUSES) {
    if (summary[cause] > maxCount) {
      maxCount = summary[cause];
      dominantCause = cause;
    }
  }

  let headline: string;
  let body: string;
  let weaknessCaveat: string | null = null;

  if (teeCount >= 2) {
    headline = `Tee trouble contributed to ${total} rough hole${total !== 1 ? "s" : ""}`;
    body = `You flagged ${teeCount} hole${teeCount !== 1 ? "s" : ""} where a tee shot led to downstream damage. This may explain some of the approach or short-game losses shown above — those categories absorb the recovery cost even when the root cause was off the tee.`;
    weaknessCaveat =
      "Some weakness in approach or short game may reflect recovery from tee trouble, not a standalone skill gap.";
  } else if (teeCount === 1) {
    headline = `Context noted for ${total} hole${total !== 1 ? "s" : ""}`;
    body = `You identified ${total} hole${total !== 1 ? "s" : ""} where trouble started with a single bad shot. One tee miss was flagged — this may account for some downstream approach or short-game losses.`;
  } else {
    headline = `Context added for ${total} hole${total !== 1 ? "s" : ""}`;
    const dominantLabel = CAUSE_LABELS[dominantCause];
    body = `You identified ${total} hole${total !== 1 ? "s" : ""} where trouble cascaded from earlier mistakes. The primary source was ${dominantLabel}. This context helps explain the pattern in your results.`;
  }

  return { headline, body, weaknessCaveat };
}

/** Server-side validation for trouble context payloads. */
export function validateTroubleContext(
  context: unknown
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (typeof context !== "object" || context === null) {
    return { valid: false, errors: ["Trouble context must be an object"] };
  }

  const ctx = context as Record<string, unknown>;

  if (!Array.isArray(ctx.troubleHoles)) {
    return { valid: false, errors: ["troubleHoles must be an array"] };
  }

  const holes = ctx.troubleHoles as Array<Record<string, unknown>>;

  if (holes.length > MAX_TROUBLE_HOLES) {
    errors.push(`Too many trouble holes (max ${MAX_TROUBLE_HOLES})`);
  }

  for (let i = 0; i < holes.length; i++) {
    const hole = holes[i];
    const hn = hole.holeNumber;

    if (hn !== null) {
      if (typeof hn !== "number" || hn < 1 || hn > 18 || !Number.isInteger(hn)) {
        errors.push(`Hole ${i}: holeNumber must be 1-18 or null`);
      }
    }

    if (
      typeof hole.primaryCause !== "string" ||
      !(TROUBLE_CAUSES as readonly string[]).includes(hole.primaryCause)
    ) {
      errors.push(
        `Hole ${i}: invalid primaryCause "${String(hole.primaryCause)}"`
      );
    }
  }

  return { valid: errors.length === 0, errors };
}
