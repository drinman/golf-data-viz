/**
 * Strokes Gained calculation engine.
 *
 * Implements strokes gained methodology adapted for amateur golfers,
 * benchmarking against handicap peer groups rather than PGA Tour averages.
 *
 * Categories with sufficient data return a finite SG value.
 * Categories missing required inputs (e.g., GIR for approach) are skipped:
 * their value is 0 and they appear in `skippedCategories`.
 *
 * Weight constants are starting values from PRD, subject to calibration.
 */

import type {
  RoundInput,
  BracketBenchmark,
  StrokesGainedResult,
  StrokesGainedCategory,
  ConfidenceLevel,
  RadarChartDatum,
} from "./types";
import { METHODOLOGY_VERSION, CATEGORY_LABELS } from "./constants";
import { getBenchmarkVersion } from "./benchmarks";

/**
 * Estimate GIR from scoring distribution when user doesn't track it.
 * Eagles and birdies imply GIR; ~65% of pars imply GIR (accounts for
 * par-3s where par doesn't require GIR, and scramble pars).
 */
export function estimateGIR(input: RoundInput): number {
  return Math.min(
    18,
    Math.round(input.eagles + input.birdies + input.pars * 0.65)
  );
}

/** Weight constants for SG category calculations (subject to calibration). */
export const SG_WEIGHTS = {
  OTT_FIR_WEIGHT: 6.0,
  OTT_PENALTY_WEIGHT: 0.8,
  APPROACH_WEIGHT: 8.0,
  ATG_WEIGHT: 5.0,
  PUTTING_WEIGHT: 4.0,
} as const;

/** Calculate SG: Off-the-Tee */
function calcOTT(input: RoundInput, benchmark: BracketBenchmark): number {
  // Skip FIR component when fairwaysHit not tracked or par-3 course (0 attempts)
  const firComponent =
    input.fairwaysHit != null && input.fairwayAttempts > 0
      ? (input.fairwaysHit / input.fairwayAttempts -
          benchmark.fairwayPercentage / 100) *
        SG_WEIGHTS.OTT_FIR_WEIGHT
      : 0;

  // Positive penaltyDelta = player has fewer penalties = good
  const penaltyDelta = benchmark.penaltiesPerRound - input.penaltyStrokes;
  const penaltyComponent = penaltyDelta * SG_WEIGHTS.OTT_PENALTY_WEIGHT;

  return firComponent + penaltyComponent;
}

/** Calculate SG: Approach */
function calcApproach(input: RoundInput, benchmark: BracketBenchmark): number {
  if (input.greensInRegulation == null) return 0;
  const playerGIR = input.greensInRegulation / 18;
  const peerGIR = benchmark.girPercentage / 100;
  return (playerGIR - peerGIR) * SG_WEIGHTS.APPROACH_WEIGHT;
}

/** Calculate SG: Around-the-Green */
function calcATG(input: RoundInput, benchmark: BracketBenchmark): number {
  // Path 1: Use actual up-and-down data when available
  if (
    input.upAndDownAttempts != null &&
    input.upAndDownConverted != null &&
    input.upAndDownAttempts > 0
  ) {
    const playerUpDown = input.upAndDownConverted / input.upAndDownAttempts;
    const peerUpDown = benchmark.upAndDownPercentage / 100;
    return (playerUpDown - peerUpDown) * SG_WEIGHTS.ATG_WEIGHT;
  }

  // Path 2: Fallback — estimate scramble rate from scoring on missed greens
  if (input.greensInRegulation == null) return 0;
  const missedGreens = 18 - input.greensInRegulation;
  if (missedGreens === 0) return 0;

  // Estimate pars made on GIR (≈90% par rate on GIR for mid-HCP)
  const estimatedParsOnGIR = input.greensInRegulation * 0.9;
  // Cap scramble pars to missed greens — can't scramble more than you missed
  const scramblePars = Math.min(
    missedGreens,
    Math.max(0, input.pars - estimatedParsOnGIR)
  );
  const playerScrambleRate = scramblePars / missedGreens;
  const peerScrambleRate = benchmark.upAndDownPercentage / 100;

  return (playerScrambleRate - peerScrambleRate) * SG_WEIGHTS.ATG_WEIGHT;
}

/** Calculate SG: Putting. Returns sg (without three-putt) and threePuttImpact as diagnostic. */
function calcPutting(
  input: RoundInput,
  benchmark: BracketBenchmark
): { sg: number; threePuttImpact: number | null } {
  const playerPuttsPerHole = input.totalPutts / 18;
  const peerPuttsPerHole = benchmark.puttsPerRound / 18;
  const sg =
    (peerPuttsPerHole - playerPuttsPerHole) * SG_WEIGHTS.PUTTING_WEIGHT;

  // Three-putt impact computed as diagnostic only (not added to sg)
  let threePuttImpact: number | null = null;
  if (input.threePutts != null) {
    const peerThreePutts = benchmark.puttsPerRound * 0.1;
    threePuttImpact = clamp(
      (peerThreePutts - input.threePutts) * 0.3,
      -0.5,
      0.5
    );
  }

  return { sg, threePuttImpact };
}

/** Calculate strokes gained across all 4 categories. */
export function calculateStrokesGained(
  input: RoundInput,
  benchmark: BracketBenchmark
): StrokesGainedResult {
  const estimatedCategories: StrokesGainedCategory[] = [];
  const skippedCategories: StrokesGainedCategory[] = [];

  // Track GIR estimation state for confidence
  const girEstimated = input.greensInRegulation == null;

  // When GIR is missing, estimate it from scoring distribution
  let effectiveInput = input;
  if (girEstimated) {
    const effectiveGIR = estimateGIR(input);
    effectiveInput = { ...input, greensInRegulation: effectiveGIR };
    estimatedCategories.push("approach");

    // ATG only estimated if it uses the GIR path (Path 2), not if real up-and-down data exists (Path 1)
    const hasUpAndDown =
      input.upAndDownAttempts != null &&
      input.upAndDownConverted != null &&
      input.upAndDownAttempts > 0;
    if (!hasUpAndDown) {
      estimatedCategories.push("around-the-green");
    }
  }

  const puttingResult = calcPutting(effectiveInput, benchmark);

  const categories: Record<StrokesGainedCategory, number> = {
    "off-the-tee": calcOTT(effectiveInput, benchmark),
    approach: calcApproach(effectiveInput, benchmark),
    "around-the-green": calcATG(effectiveInput, benchmark),
    putting: puttingResult.sg,
  };

  const skippedSet = new Set(skippedCategories);
  const total = (
    Object.entries(categories) as [StrokesGainedCategory, number][]
  )
    .filter(([cat]) => !skippedSet.has(cat))
    .reduce((sum, [, val]) => sum + val, 0);

  // Compute confidence per category
  const hasUpAndDown =
    input.upAndDownAttempts != null &&
    input.upAndDownConverted != null &&
    input.upAndDownAttempts > 0;

  const confidence: Record<StrokesGainedCategory, ConfidenceLevel> = {
    // TODO: Promote OTT to "high" when richer inputs land (distance, miss
    // quality — Phase 3 / Arccos integration). FIR-only caps at "medium".
    "off-the-tee":
      input.fairwaysHit != null && input.fairwayAttempts > 0
        ? "medium"
        : "low", // penalties only
    approach: girEstimated ? "medium" : "high",
    "around-the-green": hasUpAndDown
      ? "high"
      : girEstimated
        ? "low" // estimated from estimated GIR
        : "medium", // estimated from real GIR + scoring
    putting: "high", // totalPutts always required
  };

  return {
    total,
    categories,
    benchmarkBracket: benchmark.bracket,
    skippedCategories,
    estimatedCategories,
    confidence,
    methodologyVersion: METHODOLOGY_VERSION,
    benchmarkVersion: getBenchmarkVersion(),
    benchmarkHandicap: input.handicapIndex,
    diagnostics: {
      threePuttImpact: puttingResult.threePuttImpact,
    },
  };
}

/** Clamp a value to [min, max]. */
function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Convert SG result to radar chart data.
 * Normalized to 0-100 scale (50 = peer baseline), clamped to [0, 100].
 * Raw SG values stay in StrokesGainedResult for the summary (D2).
 */
export function toRadarChartData(
  result: StrokesGainedResult
): RadarChartDatum[] {
  const categories: StrokesGainedCategory[] = [
    "off-the-tee",
    "approach",
    "around-the-green",
    "putting",
  ];

  const skippedSet = new Set(result.skippedCategories);

  return categories.map((cat) => ({
    category: CATEGORY_LABELS[cat],
    player: skippedSet.has(cat)
      ? 50
      : clamp(50 + result.categories[cat] * 10, 0, 100),
    ...(skippedSet.has(cat) ? { skipped: true } : {}),
  }));
}
