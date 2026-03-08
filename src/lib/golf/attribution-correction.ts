/**
 * Attribution Correction Layer (V1).
 *
 * Detects OTT/Approach divergence patterns (e.g., low FIR + high GIR)
 * and redistributes a bounded amount of strokes between the two categories.
 *
 * Key invariants:
 * - Zero-sum: OTT adjustment + Approach adjustment = 0
 * - Bounded: hard-capped at ±maxCorrection strokes
 * - Confidence-gated: skipped when FIR data missing
 * - Only touches OTT and Approach — putting/ATG never move
 */

import type {
  AttributionCorrectionConfig,
  AttributionCorrectionResult,
  BracketBenchmark,
  CalibrationInputPath,
  ConfidenceLevel,
  RoundInput,
  StrokesGainedCategory,
} from "./types";
import rawConfig from "@/data/calibration/attribution-correction-v1.json";

// ── Config loading (follows calibration.ts pattern) ──

const config: AttributionCorrectionConfig = {
  version: rawConfig.version,
  updatedAt: rawConfig.updatedAt,
  strokesPerDivergencePoint: rawConfig.strokesPerDivergencePoint,
  maxCorrection: rawConfig.maxCorrection,
  divergenceDeadzone: rawConfig.divergenceDeadzone,
  opportunityShrinkageBase: rawConfig.opportunityShrinkageBase,
  enabledPaths: rawConfig.enabledPaths as CalibrationInputPath[],
  pathStrengthMultipliers:
    rawConfig.pathStrengthMultipliers as Partial<Record<CalibrationInputPath, number>>,
};

// Validate on module load
if (config.maxCorrection <= 0) {
  throw new Error(`Attribution correction maxCorrection must be positive, got ${config.maxCorrection}`);
}
if (config.strokesPerDivergencePoint <= 0) {
  throw new Error(`Attribution correction strokesPerDivergencePoint must be positive, got ${config.strokesPerDivergencePoint}`);
}
if (config.opportunityShrinkageBase <= 0) {
  throw new Error(`Attribution correction opportunityShrinkageBase must be positive, got ${config.opportunityShrinkageBase}`);
}

export function loadAttributionCorrectionConfig(): AttributionCorrectionConfig {
  return config;
}

export function getAttributionCorrectionVersion(): string {
  return config.version;
}

// ── Mode reader (follows phase2-mode.ts pattern) ──

export function isAttributionCorrectionEnabled(): boolean {
  return process.env.NEXT_PUBLIC_ATTRIBUTION_CORRECTION !== "off";
}

// ── Pure computation ──

/**
 * Compute divergence between FIR and GIR deltas.
 * Positive divergence = low FIR, high GIR (OTT likely under-credited).
 * Negative divergence = high FIR, low GIR (Approach likely under-credited).
 */
export function computeDivergence(
  playerFIR: number,
  peerFIR: number,
  playerGIR: number,
  peerGIR: number
): number {
  const firDelta = playerFIR - peerFIR;
  const girDelta = playerGIR - peerGIR;
  return girDelta - firDelta;
}

/**
 * Main correction function. Returns correction result with diagnostics.
 */
export function computeAttributionCorrection(
  provisionals: Record<StrokesGainedCategory, number>,
  input: RoundInput,
  benchmark: BracketBenchmark,
  confidence: Record<StrokesGainedCategory, ConfidenceLevel>,
  inputPath: CalibrationInputPath
): AttributionCorrectionResult {
  const base: Omit<AttributionCorrectionResult, "applied" | "reason" | "divergence" | "correctionAmount" | "confidenceGating"> = {
    preCorrectionOTT: provisionals["off-the-tee"],
    preCorrectionApproach: provisionals["approach"],
    postCorrectionOTT: provisionals["off-the-tee"],
    postCorrectionApproach: provisionals["approach"],
  };

  const gating: string[] = [];

  // Gate 1: Input path must be enabled
  if (!config.enabledPaths.includes(inputPath)) {
    return {
      ...base,
      applied: false,
      divergence: 0,
      correctionAmount: 0,
      reason: `path "${inputPath}" not in enabledPaths`,
      confidenceGating: gating,
    };
  }

  // Gate 2: OTT confidence must not be "low" (no FIR data)
  if (confidence["off-the-tee"] === "low") {
    return {
      ...base,
      applied: false,
      divergence: 0,
      correctionAmount: 0,
      reason: "skipped: OTT confidence low (no FIR data)",
      confidenceGating: gating,
    };
  }

  // Compute divergence signal
  const playerFIR = input.fairwaysHit != null && input.fairwayAttempts > 0
    ? input.fairwaysHit / input.fairwayAttempts
    : 0;
  const peerFIR = benchmark.fairwayPercentage / 100;
  const playerGIR = (input.greensInRegulation ?? 0) / 18;
  const peerGIR = benchmark.girPercentage / 100;

  const divergence = computeDivergence(playerFIR, peerFIR, playerGIR, peerGIR);

  // Gate 3: Deadzone
  if (Math.abs(divergence) < config.divergenceDeadzone) {
    return {
      ...base,
      applied: false,
      divergence,
      correctionAmount: 0,
      reason: `divergence ${divergence.toFixed(4)} within deadzone (±${config.divergenceDeadzone})`,
      confidenceGating: gating,
    };
  }

  // Build correction with multipliers and gates
  let multiplier = 1.0;

  // Path strength multiplier
  const pathMultiplier = config.pathStrengthMultipliers[inputPath] ?? 1.0;
  if (pathMultiplier !== 1.0) {
    gating.push("gir-estimated-path");
  }
  multiplier *= pathMultiplier;

  // Confidence gate: reduce when Approach confidence is "medium" (GIR estimated)
  if (confidence["approach"] === "medium") {
    gating.push("approach-confidence-medium");
    multiplier *= 0.5;
  }

  // Opportunity shrinkage
  const fairwayAttempts = input.fairwayAttempts;
  const opportunityShrinkage = Math.min(1.0, fairwayAttempts / config.opportunityShrinkageBase);
  if (opportunityShrinkage < 1.0) {
    gating.push(`opportunity-shrinkage-${opportunityShrinkage.toFixed(2)}`);
  }

  // Compute raw correction
  const rawCorrection = divergence * config.strokesPerDivergencePoint * multiplier * opportunityShrinkage;

  // Clamp to bounds
  const correctionAmount = Math.max(
    -config.maxCorrection,
    Math.min(config.maxCorrection, rawCorrection)
  );

  return {
    applied: true,
    divergence,
    correctionAmount,
    reason: `divergence=${divergence.toFixed(4)}, correction=${correctionAmount.toFixed(4)}`,
    preCorrectionOTT: provisionals["off-the-tee"],
    preCorrectionApproach: provisionals["approach"],
    postCorrectionOTT: provisionals["off-the-tee"] + correctionAmount,
    postCorrectionApproach: provisionals["approach"] - correctionAmount,
    confidenceGating: gating,
  };
}

/**
 * Apply a correction amount to provisionals.
 * OTT += correction, Approach -= correction.
 * Putting and ATG are unchanged.
 */
export function applyAttributionCorrection(
  provisionals: Record<StrokesGainedCategory, number>,
  correctionAmount: number
): Record<StrokesGainedCategory, number> {
  return {
    "off-the-tee": provisionals["off-the-tee"] + correctionAmount,
    approach: provisionals["approach"] - correctionAmount,
    "around-the-green": provisionals["around-the-green"],
    putting: provisionals["putting"],
  };
}
