/**
 * Strokes Gained V3 Pipeline Orchestrator.
 *
 * 5-layer pipeline:
 * 1. GIR estimation (reuse existing estimateGIR)
 * 2. Total anchor (course-adjusted or course-neutral)
 * 3. Raw signals (unweighted deltas)
 * 4. Calibration (path-specific coefficients)
 * 5. Reconciliation (confidence-weighted scaling to match anchor)
 *
 * Returns StrokesGainedResult with all Phase 2 fields populated.
 */

import type {
  RoundInput,
  BracketBenchmark,
  StrokesGainedResult,
  StrokesGainedCategory,
  ConfidenceLevel,
} from "./types";
import { METHODOLOGY_VERSION_V3 } from "./constants";
import { getBenchmarkVersion } from "./benchmarks";
import {
  estimateGIR,
  computeRawOttFirDelta,
  computeRawOttPenaltyDelta,
  computeRawApproachDelta,
  computeRawAtgDelta,
  computeRawPuttingDelta,
} from "./strokes-gained";
import { computeTotalAnchor } from "./total-anchor";
import {
  detectInputPath,
  calibrateRawSignals,
  getCalibrationVersion,
} from "./calibration";
import { reconcileCategories } from "./reconciliation";

export function calculateStrokesGainedV3(
  input: RoundInput,
  benchmark: BracketBenchmark
): StrokesGainedResult {
  const estimatedCategories: StrokesGainedCategory[] = [];
  const skippedCategories: StrokesGainedCategory[] = [];

  // ── Layer 1: GIR estimation ──
  const girEstimated = input.greensInRegulation == null;
  let effectiveInput = input;
  if (girEstimated) {
    const effectiveGIR = estimateGIR(input);
    effectiveInput = { ...input, greensInRegulation: effectiveGIR };
    estimatedCategories.push("approach");

    const hasUpAndDown =
      input.upAndDownAttempts != null &&
      input.upAndDownConverted != null &&
      input.upAndDownAttempts > 0;
    if (!hasUpAndDown) {
      estimatedCategories.push("around-the-green");
    }
  }

  // ── Layer 2: Total anchor ──
  const anchor = computeTotalAnchor(effectiveInput, benchmark);

  // ── Layer 3: Raw signals ──
  const rawSignals = {
    firDelta: computeRawOttFirDelta(effectiveInput, benchmark),
    penaltyDelta: computeRawOttPenaltyDelta(effectiveInput, benchmark),
    approachDelta: computeRawApproachDelta(effectiveInput, benchmark),
    atgDelta: computeRawAtgDelta(effectiveInput, benchmark),
    puttingDelta: computeRawPuttingDelta(effectiveInput, benchmark),
  };

  const rawCategoryValues: Record<StrokesGainedCategory, number> = {
    "off-the-tee": rawSignals.firDelta,
    approach: rawSignals.approachDelta,
    "around-the-green": rawSignals.atgDelta,
    putting: rawSignals.puttingDelta,
  };

  // ── Layer 4: Calibration ──
  // Detect path from ORIGINAL input (before GIR estimation)
  const inputPath = detectInputPath(input);
  const provisionalCategoryValues = calibrateRawSignals(rawSignals, inputPath);

  // ── Confidence (same logic as V1) ──
  const hasUpAndDown =
    input.upAndDownAttempts != null &&
    input.upAndDownConverted != null &&
    input.upAndDownAttempts > 0;

  const confidence: Record<StrokesGainedCategory, ConfidenceLevel> = {
    "off-the-tee":
      input.fairwaysHit != null && input.fairwayAttempts > 0
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

  // ── Layer 5: Reconciliation ──
  const reconciliation = reconcileCategories(
    provisionalCategoryValues,
    anchor.value,
    confidence,
    skippedCategories
  );

  // Three-putt diagnostic (same as V1)
  let threePuttImpact: number | null = null;
  if (input.threePutts != null) {
    const peerThreePutts = benchmark.puttsPerRound * 0.1;
    threePuttImpact = Math.min(
      0.5,
      Math.max(-0.5, (peerThreePutts - input.threePutts) * 0.3)
    );
  }

  return {
    total: anchor.value,
    categories: reconciliation.categories,
    benchmarkBracket: benchmark.bracket,
    skippedCategories,
    estimatedCategories,
    confidence,
    methodologyVersion: METHODOLOGY_VERSION_V3,
    benchmarkVersion: getBenchmarkVersion(),
    benchmarkHandicap: input.handicapIndex,
    diagnostics: {
      threePuttImpact,
      rawCategoryValues,
      provisionalCategoryValues,
    },
    // Phase 2 fields
    calibrationVersion: getCalibrationVersion(),
    totalAnchorMode: anchor.mode,
    totalAnchorValue: anchor.value,
    inputPath,
    reconciliationScaleFactor: reconciliation.scaleFactor,
    reconciliationFlags: reconciliation.flags,
  };
}
