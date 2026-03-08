import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { makeRound } from "../fixtures/factories";
import { getInterpolatedBenchmark } from "@/lib/golf/benchmarks";
import {
  calibrateRawSignals,
  detectInputPath,
} from "@/lib/golf/calibration";
import {
  estimateGIR,
  computeRawOttFirDelta,
  computeRawOttPenaltyDelta,
  computeRawApproachDelta,
  computeRawAtgDelta,
  computeRawPuttingDelta,
} from "@/lib/golf/strokes-gained";
import {
  loadAttributionCorrectionConfig,
  getAttributionCorrectionVersion,
  isAttributionCorrectionEnabled,
  computeDivergence,
  computeAttributionCorrection,
  applyAttributionCorrection,
} from "@/lib/golf/attribution-correction";

describe("attribution-correction", () => {
  describe("config loading", () => {
    it("loads valid config with expected shape", () => {
      const config = loadAttributionCorrectionConfig();
      expect(config.version).toBe("ac-1.0.0");
      expect(config.strokesPerDivergencePoint).toBe(0.6);
      expect(config.maxCorrection).toBe(0.5);
      expect(config.divergenceDeadzone).toBe(0.05);
      expect(config.opportunityShrinkageBase).toBe(14);
      expect(config.enabledPaths).toContain("full");
      expect(config.enabledPaths).toContain("gir-estimated");
      expect(config.enabledPaths).not.toContain("atg-fallback");
    });

    it("returns version string", () => {
      expect(getAttributionCorrectionVersion()).toBe("ac-1.0.0");
    });
  });

  describe("isAttributionCorrectionEnabled", () => {
    beforeEach(() => {
      vi.stubEnv("NEXT_PUBLIC_ATTRIBUTION_CORRECTION", "");
    });

    afterEach(() => {
      vi.unstubAllEnvs();
    });

    it("returns true by default (no env var)", () => {
      delete process.env.NEXT_PUBLIC_ATTRIBUTION_CORRECTION;
      expect(isAttributionCorrectionEnabled()).toBe(true);
    });

    it("returns true when env var is anything other than 'off'", () => {
      vi.stubEnv("NEXT_PUBLIC_ATTRIBUTION_CORRECTION", "on");
      expect(isAttributionCorrectionEnabled()).toBe(true);
    });

    it("returns false when env var is 'off'", () => {
      vi.stubEnv("NEXT_PUBLIC_ATTRIBUTION_CORRECTION", "off");
      expect(isAttributionCorrectionEnabled()).toBe(false);
    });
  });

  describe("computeDivergence", () => {
    it("returns positive divergence for low FIR / high GIR", () => {
      // Player: 40% FIR, 55% GIR. Peer: 55% FIR, 45% GIR.
      // firDelta = -0.15, girDelta = +0.10, divergence = 0.10 - (-0.15) = 0.25
      const d = computeDivergence(0.40, 0.55, 0.55, 0.45);
      expect(d).toBeCloseTo(0.25, 5);
    });

    it("returns negative divergence for high FIR / low GIR", () => {
      // Player: 65% FIR, 30% GIR. Peer: 55% FIR, 45% GIR.
      // firDelta = +0.10, girDelta = -0.15, divergence = -0.15 - 0.10 = -0.25
      const d = computeDivergence(0.65, 0.55, 0.30, 0.45);
      expect(d).toBeCloseTo(-0.25, 5);
    });

    it("returns near-zero divergence for balanced player", () => {
      const d = computeDivergence(0.55, 0.55, 0.45, 0.45);
      expect(d).toBeCloseTo(0, 5);
    });
  });

  describe("archetype sanity checks", () => {
    const benchmark14 = getInterpolatedBenchmark(14.3);

    // Helper to get provisional category values from a round
    function getProvisionals(round: ReturnType<typeof makeRound>) {
      let effectiveInput = round;
      if (round.greensInRegulation == null) {
        effectiveInput = { ...round, greensInRegulation: estimateGIR(round) };
      }

      const rawSignals = {
        firDelta: computeRawOttFirDelta(effectiveInput, benchmark14),
        penaltyDelta: computeRawOttPenaltyDelta(effectiveInput, benchmark14),
        approachDelta: computeRawApproachDelta(effectiveInput, benchmark14),
        atgDelta: computeRawAtgDelta(effectiveInput, benchmark14),
        puttingDelta: computeRawPuttingDelta(effectiveInput, benchmark14),
      };

      const inputPath = detectInputPath(round);
      return { provisionals: calibrateRawSignals(rawSignals, inputPath), inputPath };
    }

    // 1. Positive divergence: low FIR, high GIR → OTT ↑, Approach ↓
    it("positive divergence (low FIR, high GIR): OTT ↑, Approach ↓, total unchanged", () => {
      const round = makeRound({
        handicapIndex: 14.3,
        fairwaysHit: 4,    // low FIR = 4/14 = 28.6%
        fairwayAttempts: 14,
        greensInRegulation: 10, // high GIR = 55.6%
        upAndDownAttempts: 5,
        upAndDownConverted: 3,
      });
      const confidence = {
        "off-the-tee": "medium" as const,
        approach: "high" as const,
        "around-the-green": "high" as const,
        putting: "high" as const,
      };
      const { provisionals, inputPath } = getProvisionals(round);

      const result = computeAttributionCorrection(
        provisionals, round, benchmark14, confidence, inputPath
      );

      expect(result.applied).toBe(true);
      expect(result.divergence).toBeGreaterThan(0);
      expect(result.correctionAmount).toBeGreaterThan(0); // positive = OTT ↑
      expect(result.postCorrectionOTT).toBeGreaterThan(result.preCorrectionOTT);
      expect(result.postCorrectionApproach).toBeLessThan(result.preCorrectionApproach);

      // Total unchanged (zero-sum)
      const preCorrectionTotal = result.preCorrectionOTT + result.preCorrectionApproach;
      const postCorrectionTotal = result.postCorrectionOTT + result.postCorrectionApproach;
      expect(postCorrectionTotal).toBeCloseTo(preCorrectionTotal, 10);
    });

    // 2. Negative divergence: high FIR, low GIR → OTT ↓, Approach ↑
    it("negative divergence (high FIR, low GIR): OTT ↓, Approach ↑, total unchanged", () => {
      const round = makeRound({
        handicapIndex: 14.3,
        fairwaysHit: 12,    // high FIR = 12/14 = 85.7%
        fairwayAttempts: 14,
        greensInRegulation: 3, // low GIR = 16.7%
        upAndDownAttempts: 10,
        upAndDownConverted: 4,
      });
      const confidence = {
        "off-the-tee": "medium" as const,
        approach: "high" as const,
        "around-the-green": "high" as const,
        putting: "high" as const,
      };
      const { provisionals, inputPath } = getProvisionals(round);

      const result = computeAttributionCorrection(
        provisionals, round, benchmark14, confidence, inputPath
      );

      expect(result.applied).toBe(true);
      expect(result.divergence).toBeLessThan(0);
      expect(result.correctionAmount).toBeLessThan(0); // negative = OTT ↓
      expect(result.postCorrectionOTT).toBeLessThan(result.preCorrectionOTT);
      expect(result.postCorrectionApproach).toBeGreaterThan(result.preCorrectionApproach);

      // Total unchanged
      const preCorrectionTotal = result.preCorrectionOTT + result.preCorrectionApproach;
      const postCorrectionTotal = result.postCorrectionOTT + result.postCorrectionApproach;
      expect(postCorrectionTotal).toBeCloseTo(preCorrectionTotal, 10);
    });

    // 3. Balanced: FIR/GIR near peer → deadzone, correction near zero
    it("balanced (FIR/GIR near peer): correction near zero (deadzone)", () => {
      // Use a round whose FIR% and GIR% match peer benchmarks closely
      const peerFIR = benchmark14.fairwayPercentage / 100;
      const peerGIR = benchmark14.girPercentage / 100;
      const round = makeRound({
        handicapIndex: 14.3,
        fairwaysHit: Math.round(peerFIR * 14),
        fairwayAttempts: 14,
        greensInRegulation: Math.round(peerGIR * 18),
        upAndDownAttempts: 8,
        upAndDownConverted: 4,
      });
      const confidence = {
        "off-the-tee": "medium" as const,
        approach: "high" as const,
        "around-the-green": "high" as const,
        putting: "high" as const,
      };
      const { provisionals, inputPath } = getProvisionals(round);

      const result = computeAttributionCorrection(
        provisionals, round, benchmark14, confidence, inputPath
      );

      // Either not applied (deadzone) or very small correction
      if (result.applied) {
        expect(Math.abs(result.correctionAmount)).toBeLessThan(0.1);
      } else {
        expect(result.reason).toContain("deadzone");
      }
    });

    // 4. No FIR data (OTT confidence "low"): skipped entirely
    it("no FIR data (OTT confidence 'low'): skipped entirely", () => {
      const round = makeRound({
        handicapIndex: 14.3,
        greensInRegulation: 8,
        upAndDownAttempts: 6,
        upAndDownConverted: 3,
      });
      delete round.fairwaysHit;
      const confidence = {
        "off-the-tee": "low" as const,
        approach: "high" as const,
        "around-the-green": "high" as const,
        putting: "high" as const,
      };
      const { provisionals, inputPath } = getProvisionals(round);

      const result = computeAttributionCorrection(
        provisionals, round, benchmark14, confidence, inputPath
      );

      expect(result.applied).toBe(false);
      expect(result.correctionAmount).toBe(0);
      expect(result.reason).toContain("FIR");
    });

    // 5. GIR estimated (Approach confidence "medium"): reduced strength
    it("GIR estimated (Approach confidence 'medium'): reduced correction", () => {
      // Same divergent round as test 1, but with estimated GIR
      const round = makeRound({
        handicapIndex: 14.3,
        fairwaysHit: 4,
        fairwayAttempts: 14,
        greensInRegulation: 10,
        upAndDownAttempts: 5,
        upAndDownConverted: 3,
      });
      const confidenceFull = {
        "off-the-tee": "medium" as const,
        approach: "high" as const,
        "around-the-green": "high" as const,
        putting: "high" as const,
      };
      const confidenceEstimated = {
        "off-the-tee": "medium" as const,
        approach: "medium" as const,
        "around-the-green": "high" as const,
        putting: "high" as const,
      };
      const { provisionals } = getProvisionals(round);

      const fullResult = computeAttributionCorrection(
        provisionals, round, benchmark14, confidenceFull, "full"
      );
      const estimatedResult = computeAttributionCorrection(
        provisionals, round, benchmark14, confidenceEstimated, "gir-estimated"
      );

      // Estimated path should produce smaller correction
      expect(Math.abs(estimatedResult.correctionAmount)).toBeLessThan(
        Math.abs(fullResult.correctionAmount)
      );
      expect(estimatedResult.confidenceGating).toContain("gir-estimated-path");
    });

    // 6. Extreme divergence: clamped to maxCorrection
    it("extreme divergence: clamped to maxCorrection", () => {
      // Extreme: 0 FIR, all GIR
      const round = makeRound({
        handicapIndex: 14.3,
        fairwaysHit: 0,
        fairwayAttempts: 14,
        greensInRegulation: 16,
        upAndDownAttempts: 2,
        upAndDownConverted: 2,
      });
      const confidence = {
        "off-the-tee": "medium" as const,
        approach: "high" as const,
        "around-the-green": "high" as const,
        putting: "high" as const,
      };
      const { provisionals, inputPath } = getProvisionals(round);

      const result = computeAttributionCorrection(
        provisionals, round, benchmark14, confidence, inputPath
      );

      expect(result.applied).toBe(true);
      expect(Math.abs(result.correctionAmount)).toBeLessThanOrEqual(0.5 + 1e-10);
    });

    // 7. Low opportunity count (7 fairway attempts): correction shrunk
    it("low opportunity count (7 fairway attempts): correction shrunk by ~50%", () => {
      const round14fa = makeRound({
        handicapIndex: 14.3,
        fairwaysHit: 2,
        fairwayAttempts: 14,
        greensInRegulation: 10,
        upAndDownAttempts: 5,
        upAndDownConverted: 3,
      });
      const round7fa = makeRound({
        handicapIndex: 14.3,
        fairwaysHit: 1,       // Same FIR% ≈ 14%
        fairwayAttempts: 7,
        greensInRegulation: 10,
        upAndDownAttempts: 5,
        upAndDownConverted: 3,
      });
      const confidence = {
        "off-the-tee": "medium" as const,
        approach: "high" as const,
        "around-the-green": "high" as const,
        putting: "high" as const,
      };
      // Use same provisionals to isolate the shrinkage effect
      const { provisionals: prov14 } = getProvisionals(round14fa);

      const result14 = computeAttributionCorrection(
        prov14, round14fa, benchmark14, confidence, "full"
      );
      const result7 = computeAttributionCorrection(
        prov14, round7fa, benchmark14, confidence, "full"
      );

      // 7 fairway attempts → shrinkage = 7/14 = 0.5
      // The correction should be roughly half
      if (result14.applied && result7.applied) {
        expect(Math.abs(result7.correctionAmount)).toBeLessThan(
          Math.abs(result14.correctionAmount)
        );
        const ratio = Math.abs(result7.correctionAmount) / Math.abs(result14.correctionAmount);
        expect(ratio).toBeCloseTo(0.5, 1);
      }
    });
  });

  describe("invariants", () => {
    it("putting and ATG never move", () => {
      const provisionals = {
        "off-the-tee": -0.5,
        approach: 1.2,
        "around-the-green": -0.3,
        putting: 0.1,
      };
      const corrected = applyAttributionCorrection(provisionals, 0.3);
      expect(corrected["around-the-green"]).toBe(provisionals["around-the-green"]);
      expect(corrected["putting"]).toBe(provisionals["putting"]);
    });

    it("zero-sum: OTT + Approach totals unchanged after correction", () => {
      const provisionals = {
        "off-the-tee": -0.5,
        approach: 1.2,
        "around-the-green": -0.3,
        putting: 0.1,
      };
      const correction = 0.35;
      const corrected = applyAttributionCorrection(provisionals, correction);
      const priorSum = provisionals["off-the-tee"] + provisionals["approach"];
      const newSum = corrected["off-the-tee"] + corrected["approach"];
      expect(newSum).toBeCloseTo(priorSum, 10);
    });

    it("atg-fallback path is skipped", () => {
      const round = makeRound({
        handicapIndex: 14.3,
        fairwaysHit: 4,
        fairwayAttempts: 14,
        greensInRegulation: 10,
      });
      delete round.upAndDownAttempts;
      delete round.upAndDownConverted;
      const benchmark = getInterpolatedBenchmark(14.3);
      const confidence = {
        "off-the-tee": "medium" as const,
        approach: "high" as const,
        "around-the-green": "medium" as const,
        putting: "high" as const,
      };
      const provisionals = {
        "off-the-tee": -0.5,
        approach: 1.2,
        "around-the-green": -0.3,
        putting: 0.1,
      };

      const result = computeAttributionCorrection(
        provisionals, round, benchmark, confidence, "atg-fallback"
      );

      expect(result.applied).toBe(false);
      expect(result.reason).toContain("path");
    });
  });

  describe("applyAttributionCorrection", () => {
    it("applies positive correction: OTT ↑, Approach ↓", () => {
      const provisionals = {
        "off-the-tee": -0.5,
        approach: 1.2,
        "around-the-green": -0.3,
        putting: 0.1,
      };
      const corrected = applyAttributionCorrection(provisionals, 0.3);
      expect(corrected["off-the-tee"]).toBeCloseTo(-0.2, 10);
      expect(corrected["approach"]).toBeCloseTo(0.9, 10);
    });

    it("applies negative correction: OTT ↓, Approach ↑", () => {
      const provisionals = {
        "off-the-tee": 0.5,
        approach: -0.8,
        "around-the-green": -0.3,
        putting: 0.1,
      };
      const corrected = applyAttributionCorrection(provisionals, -0.2);
      expect(corrected["off-the-tee"]).toBeCloseTo(0.3, 10);
      expect(corrected["approach"]).toBeCloseTo(-0.6, 10);
    });
  });
});
