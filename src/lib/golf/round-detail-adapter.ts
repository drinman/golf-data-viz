/**
 * Adapters for converting a stored RoundDetailSnapshot into
 * domain objects (StrokesGainedResult, RadarChartDatum[]) for
 * the detail and shared pages.
 *
 * These adapters render the historical snapshot as-is.
 * SG values are NOT recomputed — they reflect what was stored at
 * calculation time. Confidence is derived at read time only when
 * the stored columns are null (pre-migration rounds).
 */

import type {
  ConfidenceLevel,
  HandicapBracket,
  RadarChartDatum,
  RoundDetailSnapshot,
  StrokesGainedCategory,
  StrokesGainedResult,
} from "./types";
import { CATEGORY_LABELS, CATEGORY_ORDER } from "./constants";

/** Raw input fields used for confidence derivation. */
interface ConfidenceInputs {
  fairwaysHit: number | null;
  fairwayAttempts: number | null;
  greensInRegulation: number | null;
  upAndDownAttempts: number | null;
  upAndDownConverted: number | null;
}

/**
 * Deterministic confidence derivation from raw round inputs.
 * Mirrors the logic in strokes-gained.ts:183-197.
 * Used as a fallback for pre-migration rounds that lack stored confidence.
 */
export function deriveConfidence(
  inputs: ConfidenceInputs
): Record<StrokesGainedCategory, ConfidenceLevel> {
  const girEstimated = inputs.greensInRegulation == null;
  const hasUpAndDown =
    inputs.upAndDownAttempts != null &&
    inputs.upAndDownConverted != null &&
    inputs.upAndDownAttempts > 0;

  return {
    "off-the-tee":
      inputs.fairwaysHit != null && (inputs.fairwayAttempts ?? 0) > 0
        ? "medium"
        : "low",
    approach: girEstimated ? "medium" : "high",
    "around-the-green": hasUpAndDown
      ? "high"
      : girEstimated
        ? "low"
        : "medium",
    putting: "high",
  };
}

/**
 * Convert a stored RoundDetailSnapshot to a StrokesGainedResult.
 * Renders the stored historical values — no recomputation.
 */
export function toStrokesGainedResult(
  snapshot: RoundDetailSnapshot
): StrokesGainedResult {
  // Resolve confidence: use stored values if available, else derive from raw inputs
  const hasStoredConfidence =
    snapshot.confidenceOffTheTee != null &&
    snapshot.confidenceApproach != null &&
    snapshot.confidenceAroundTheGreen != null &&
    snapshot.confidencePutting != null;

  const confidence: Record<StrokesGainedCategory, ConfidenceLevel> =
    hasStoredConfidence
      ? {
          "off-the-tee": snapshot.confidenceOffTheTee!,
          approach: snapshot.confidenceApproach!,
          "around-the-green": snapshot.confidenceAroundTheGreen!,
          putting: snapshot.confidencePutting!,
        }
      : deriveConfidence({
          fairwaysHit: snapshot.fairwaysHit,
          fairwayAttempts: snapshot.fairwayAttempts,
          greensInRegulation: snapshot.greensInRegulation,
          upAndDownAttempts: snapshot.upAndDownAttempts,
          upAndDownConverted: snapshot.upAndDownConverted,
        });

  return {
    total: snapshot.sgTotal,
    categories: {
      "off-the-tee": snapshot.sgOffTheTee,
      approach: snapshot.sgApproach,
      "around-the-green": snapshot.sgAroundTheGreen,
      putting: snapshot.sgPutting,
    },
    benchmarkBracket: (snapshot.benchmarkBracket ?? "10-15") as HandicapBracket,
    skippedCategories: snapshot.skippedCategories,
    estimatedCategories: snapshot.estimatedCategories,
    confidence,
    methodologyVersion: snapshot.methodologyVersion ?? "unknown",
    benchmarkVersion: snapshot.benchmarkVersion ?? "unknown",
    benchmarkHandicap: snapshot.benchmarkHandicap ?? snapshot.handicapIndex,
    ...(snapshot.benchmarkInterpolationMode != null && {
      benchmarkInterpolationMode: snapshot.benchmarkInterpolationMode as StrokesGainedResult["benchmarkInterpolationMode"],
    }),
    ...(snapshot.calibrationVersion != null && {
      calibrationVersion: snapshot.calibrationVersion,
    }),
    ...(snapshot.totalAnchorMode != null && {
      totalAnchorMode: snapshot.totalAnchorMode as StrokesGainedResult["totalAnchorMode"],
    }),
    diagnostics: { threePuttImpact: null },
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Convert a stored snapshot directly to radar chart data.
 * Same normalization as toRadarChartData() in strokes-gained.ts.
 */
export function toRadarChartDataFromSnapshot(
  snapshot: RoundDetailSnapshot
): RadarChartDatum[] {
  const skippedSet = new Set(snapshot.skippedCategories);
  const sgValues: Record<StrokesGainedCategory, number> = {
    "off-the-tee": snapshot.sgOffTheTee,
    approach: snapshot.sgApproach,
    "around-the-green": snapshot.sgAroundTheGreen,
    putting: snapshot.sgPutting,
  };

  return CATEGORY_ORDER.map((cat) => ({
    category: CATEGORY_LABELS[cat],
    player: skippedSet.has(cat)
      ? 50
      : clamp(50 + sgValues[cat] * 10, 0, 100),
    ...(skippedSet.has(cat) ? { skipped: true } : {}),
  }));
}
