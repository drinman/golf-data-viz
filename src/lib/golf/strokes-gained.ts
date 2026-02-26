/**
 * Strokes Gained calculation engine.
 *
 * Implements strokes gained methodology adapted for amateur golfers,
 * benchmarking against handicap peer groups rather than PGA Tour averages.
 *
 * All 4 categories always return a finite number (Design Decision D1).
 * When optional stats are missing, values are estimated from available data.
 *
 * Weight constants are starting values from PRD, subject to calibration.
 */

import type {
  RoundInput,
  BracketBenchmark,
  StrokesGainedResult,
  StrokesGainedCategory,
  RadarChartDatum,
} from "./types";

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
  // Skip FIR component on par-3 course (0 fairway attempts)
  const firComponent =
    input.fairwayAttempts > 0
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
  const missedGreens = 18 - input.greensInRegulation;
  if (missedGreens === 0) return 0;

  // Estimate pars made on GIR (≈90% par rate on GIR for mid-HCP)
  const estimatedParsOnGIR = input.greensInRegulation * 0.9;
  const scramblePars = Math.max(0, input.pars - estimatedParsOnGIR);
  const playerScrambleRate = scramblePars / missedGreens;
  const peerScrambleRate = benchmark.upAndDownPercentage / 100;

  return (playerScrambleRate - peerScrambleRate) * SG_WEIGHTS.ATG_WEIGHT;
}

/** Calculate SG: Putting */
function calcPutting(input: RoundInput, benchmark: BracketBenchmark): number {
  // Putts per GIR comparison (guard against div-by-zero)
  const playerGIR = Math.max(input.greensInRegulation, 1);
  const playerPuttsPerGIR = input.totalPutts / playerGIR;

  const peerGIR = Math.max((benchmark.girPercentage / 100) * 18, 1);
  const peerPuttsPerGIR = benchmark.puttsPerRound / peerGIR;

  // Positive = player putts fewer per GIR = good
  const puttsComponent =
    (peerPuttsPerGIR - playerPuttsPerGIR) * SG_WEIGHTS.PUTTING_WEIGHT;

  // Three-putt bonus (if data available)
  let threePuttBonus = 0;
  if (input.threePutts != null) {
    // Estimate peer three-putts (~10% of total putts for mid-handicappers)
    const peerThreePutts = benchmark.puttsPerRound * 0.1;
    threePuttBonus = (peerThreePutts - input.threePutts) * 0.3;
  }

  return puttsComponent + threePuttBonus;
}

/** Calculate strokes gained across all 4 categories. */
export function calculateStrokesGained(
  input: RoundInput,
  benchmark: BracketBenchmark
): StrokesGainedResult {
  const categories: Record<StrokesGainedCategory, number> = {
    "off-the-tee": calcOTT(input, benchmark),
    approach: calcApproach(input, benchmark),
    "around-the-green": calcATG(input, benchmark),
    putting: calcPutting(input, benchmark),
  };

  const total =
    categories["off-the-tee"] +
    categories["approach"] +
    categories["around-the-green"] +
    categories["putting"];

  return {
    total,
    categories,
    benchmarkBracket: benchmark.bracket,
  };
}

/** Category display labels for chart axes. */
const CATEGORY_LABELS: Record<StrokesGainedCategory, string> = {
  "off-the-tee": "Off the Tee",
  approach: "Approach",
  "around-the-green": "Around the Green",
  putting: "Putting",
};

/** Clamp a value to [min, max]. */
function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Convert SG result to radar chart data.
 * Normalized to 0-100 scale (50 = peer baseline), clamped to [0, 100].
 * Raw SG values stay in StrokesGainedResult for the summary (D2).
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function toRadarChartData(
  result: StrokesGainedResult,
  _benchmark?: BracketBenchmark
): RadarChartDatum[] {
  const categories: StrokesGainedCategory[] = [
    "off-the-tee",
    "approach",
    "around-the-green",
    "putting",
  ];

  return categories.map((cat) => ({
    category: CATEGORY_LABELS[cat],
    player: clamp(50 + result.categories[cat] * 10, 0, 100),
    peerAverage: 50,
  }));
}
