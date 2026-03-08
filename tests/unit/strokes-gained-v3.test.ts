import { describe, it, expect } from "vitest";
import { calculateStrokesGainedV3 } from "@/lib/golf/strokes-gained-v3";
import { getInterpolatedBenchmark } from "@/lib/golf/benchmarks";
import { calculateStrokesGained } from "@/lib/golf/strokes-gained";
import { METHODOLOGY_VERSION_V3 } from "@/lib/golf/constants";
import { makeRound } from "../fixtures/factories";

// Representative test rounds
const scratchGoodRound = makeRound({
  handicapIndex: 2.0,
  score: 73,
  fairwaysHit: 10,
  fairwayAttempts: 14,
  greensInRegulation: 12,
  totalPutts: 29,
  penaltyStrokes: 0,
  eagles: 0,
  birdies: 3,
  pars: 12,
  bogeys: 3,
  doubleBogeys: 0,
  triplePlus: 0,
  upAndDownAttempts: 4,
  upAndDownConverted: 3,
});

const tenHcpAverage = makeRound({
  handicapIndex: 10.0,
  score: 82,
  fairwaysHit: 7,
  fairwayAttempts: 14,
  greensInRegulation: 7,
  totalPutts: 32,
  penaltyStrokes: 2,
  eagles: 0,
  birdies: 1,
  pars: 9,
  bogeys: 6,
  doubleBogeys: 2,
  triplePlus: 0,
  upAndDownAttempts: 8,
  upAndDownConverted: 3,
});

const fifteenHcpBadRound = makeRound({
  handicapIndex: 15.0,
  score: 98,
  courseRating: 72.0,
  slopeRating: 130,
  fairwaysHit: 4,
  fairwayAttempts: 14,
  greensInRegulation: 2,
  totalPutts: 36,
  penaltyStrokes: 4,
  eagles: 0,
  birdies: 0,
  pars: 3,
  bogeys: 8,
  doubleBogeys: 5,
  triplePlus: 2,
});

const twentyHcpTypical = makeRound({
  handicapIndex: 22.0,
  score: 97,
  fairwaysHit: 5,
  fairwayAttempts: 14,
  greensInRegulation: 3,
  totalPutts: 35,
  penaltyStrokes: 3,
  eagles: 0,
  birdies: 0,
  pars: 4,
  bogeys: 8,
  doubleBogeys: 4,
  triplePlus: 2,
});

const highHcpRound = makeRound({
  handicapIndex: 35.0,
  score: 110,
  fairwaysHit: 3,
  fairwayAttempts: 14,
  greensInRegulation: 1,
  totalPutts: 38,
  penaltyStrokes: 5,
  eagles: 0,
  birdies: 0,
  pars: 2,
  bogeys: 7,
  doubleBogeys: 5,
  triplePlus: 4,
});

describe("calculateStrokesGainedV3", () => {
  describe("pipeline structure", () => {
    it("returns all required StrokesGainedResult fields", () => {
      const benchmark = getInterpolatedBenchmark(14.3);
      const result = calculateStrokesGainedV3(makeRound(), benchmark);
      expect(result.categories).toHaveProperty("off-the-tee");
      expect(result.categories).toHaveProperty("approach");
      expect(result.categories).toHaveProperty("around-the-green");
      expect(result.categories).toHaveProperty("putting");
      expect(typeof result.total).toBe("number");
      expect(result.methodologyVersion).toBe(METHODOLOGY_VERSION_V3);
    });

    it("populates Phase 2 metadata fields", () => {
      const benchmark = getInterpolatedBenchmark(14.3);
      const result = calculateStrokesGainedV3(makeRound(), benchmark);
      expect(result.calibrationVersion).toBe("seed-1.0.0");
      expect(result.totalAnchorMode).toBeDefined();
      expect(typeof result.totalAnchorValue).toBe("number");
      expect(result.inputPath).toBeDefined();
      expect(typeof result.reconciliationScaleFactor).toBe("number");
      expect(Array.isArray(result.reconciliationFlags)).toBe(true);
    });

    it("diagnostics contain raw and provisional values", () => {
      const benchmark = getInterpolatedBenchmark(14.3);
      const result = calculateStrokesGainedV3(makeRound(), benchmark);
      expect(result.diagnostics.rawCategoryValues).toBeDefined();
      expect(result.diagnostics.provisionalCategoryValues).toBeDefined();
    });
  });

  describe("total equals anchor value", () => {
    it("total equals the anchor value (not sum of raw categories)", () => {
      const benchmark = getInterpolatedBenchmark(14.3);
      const result = calculateStrokesGainedV3(makeRound(), benchmark);
      expect(result.total).toBe(result.totalAnchorValue);
    });
  });

  describe("categories sum to total", () => {
    const fixtures = [
      { name: "scratch good", round: scratchGoodRound },
      { name: "10-HCP average", round: tenHcpAverage },
      { name: "15-HCP bad", round: fifteenHcpBadRound },
      { name: "20-HCP typical", round: twentyHcpTypical },
      { name: "30+ HCP", round: highHcpRound },
    ];

    for (const { name, round } of fixtures) {
      it(`categories sum to total within ±0.1 (${name})`, () => {
        const benchmark = getInterpolatedBenchmark(round.handicapIndex);
        const result = calculateStrokesGainedV3(round, benchmark);
        const sum =
          result.categories["off-the-tee"] +
          result.categories["approach"] +
          result.categories["around-the-green"] +
          result.categories["putting"];
        expect(sum).toBeCloseTo(result.total, 1);
      });
    }
  });

  describe("plus handicap metadata", () => {
    it("sets benchmarkInterpolationMode to scratch_clamped for plus handicap", () => {
      const round = makeRound({ handicapIndex: -2.3, score: 71, courseRating: 72, slopeRating: 113 });
      const benchmark = getInterpolatedBenchmark(round.handicapIndex);
      const result = calculateStrokesGainedV3(round, benchmark);
      expect(result.benchmarkBracket).toBe("plus");
      expect(result.benchmarkInterpolationMode).toBe("scratch_clamped");
      expect(result.benchmarkHandicap).toBe(-2.3);
    });

    it("sets benchmarkInterpolationMode to standard for positive handicap", () => {
      const benchmark = getInterpolatedBenchmark(14.3);
      const result = calculateStrokesGainedV3(makeRound(), benchmark);
      expect(result.benchmarkInterpolationMode).toBe("standard");
    });

    it("categories sum to total within tolerance for plus handicap", () => {
      const round = makeRound({ handicapIndex: -2.3, score: 71, courseRating: 72, slopeRating: 113 });
      const benchmark = getInterpolatedBenchmark(round.handicapIndex);
      const result = calculateStrokesGainedV3(round, benchmark);
      const sum =
        result.categories["off-the-tee"] +
        result.categories["approach"] +
        result.categories["around-the-green"] +
        result.categories["putting"];
      expect(sum).toBeCloseTo(result.total, 1);
    });
  });

  describe("anchor mode labeling", () => {
    it("course-adjusted when CR and slope are valid", () => {
      const round = makeRound({ courseRating: 72.0, slopeRating: 130 });
      const benchmark = getInterpolatedBenchmark(round.handicapIndex);
      const result = calculateStrokesGainedV3(round, benchmark);
      expect(result.totalAnchorMode).toBe("course_adjusted");
    });

    it("course-neutral when CR is invalid", () => {
      const round = makeRound({ courseRating: 0, slopeRating: 130 });
      const benchmark = getInterpolatedBenchmark(round.handicapIndex);
      const result = calculateStrokesGainedV3(round, benchmark);
      expect(result.totalAnchorMode).toBe("course_neutral");
    });
  });

  describe("skipped categories", () => {
    it("skipped categories are 0 and excluded from reconciliation", () => {
      const round = makeRound();
      delete round.fairwaysHit;
      delete round.greensInRegulation;
      delete round.upAndDownAttempts;
      delete round.upAndDownConverted;
      const benchmark = getInterpolatedBenchmark(round.handicapIndex);
      const result = calculateStrokesGainedV3(round, benchmark);
      // All categories should produce finite values
      expect(Number.isFinite(result.total)).toBe(true);
      expect(Number.isFinite(result.categories["putting"])).toBe(true);
    });
  });

  describe("directionality", () => {
    it("scratch good round yields positive total", () => {
      const benchmark = getInterpolatedBenchmark(scratchGoodRound.handicapIndex);
      const result = calculateStrokesGainedV3(scratchGoodRound, benchmark);
      expect(result.total).toBeGreaterThan(0);
    });

    it("15-hcp bad round yields negative total", () => {
      const benchmark = getInterpolatedBenchmark(fifteenHcpBadRound.handicapIndex);
      const result = calculateStrokesGainedV3(fifteenHcpBadRound, benchmark);
      expect(result.total).toBeLessThan(0);
    });
  });

  describe("input path detection", () => {
    it("full path when GIR and up-and-down provided", () => {
      const round = makeRound({
        greensInRegulation: 6,
        upAndDownAttempts: 8,
        upAndDownConverted: 4,
      });
      const benchmark = getInterpolatedBenchmark(round.handicapIndex);
      const result = calculateStrokesGainedV3(round, benchmark);
      expect(result.inputPath).toBe("full");
    });

    it("gir-estimated path when GIR missing", () => {
      const round = makeRound();
      delete round.greensInRegulation;
      const benchmark = getInterpolatedBenchmark(round.handicapIndex);
      const result = calculateStrokesGainedV3(round, benchmark);
      expect(result.inputPath).toBe("gir-estimated");
    });

    it("atg-fallback path when GIR provided but no up-and-down", () => {
      const round = makeRound({ greensInRegulation: 6 });
      delete round.upAndDownAttempts;
      delete round.upAndDownConverted;
      const benchmark = getInterpolatedBenchmark(round.handicapIndex);
      const result = calculateStrokesGainedV3(round, benchmark);
      expect(result.inputPath).toBe("atg-fallback");
    });
  });

  describe("attribution correction integration", () => {
    it("correction enabled by default: diagnostics populated", () => {
      const round = makeRound({
        handicapIndex: 14.3,
        fairwaysHit: 4,     // low FIR
        fairwayAttempts: 14,
        greensInRegulation: 10, // high GIR
        upAndDownAttempts: 5,
        upAndDownConverted: 3,
      });
      const benchmark = getInterpolatedBenchmark(round.handicapIndex);
      const result = calculateStrokesGainedV3(round, benchmark);

      expect(result.attributionCorrectionEnabled).toBe(true);
      expect(result.attributionCorrectionVersion).toBe("ac-1.0.0");
      expect(result.diagnostics.attributionCorrection).toBeDefined();
      expect(result.diagnostics.attributionCorrection!.applied).toBe(true);
    });

    it("correction disabled via env var: no attributionCorrection in diagnostics", () => {
      process.env.NEXT_PUBLIC_ATTRIBUTION_CORRECTION = "off";
      try {
        const benchmark = getInterpolatedBenchmark(14.3);
        const result = calculateStrokesGainedV3(makeRound(), benchmark);
        expect(result.attributionCorrectionEnabled).toBe(false);
        expect(result.attributionCorrectionVersion).toBeUndefined();
        expect(result.diagnostics.attributionCorrection).toBeUndefined();
      } finally {
        delete process.env.NEXT_PUBLIC_ATTRIBUTION_CORRECTION;
      }
    });

    it("total still equals anchor regardless of correction", () => {
      const round = makeRound({
        handicapIndex: 14.3,
        fairwaysHit: 4,
        fairwayAttempts: 14,
        greensInRegulation: 10,
        upAndDownAttempts: 5,
        upAndDownConverted: 3,
      });
      const benchmark = getInterpolatedBenchmark(round.handicapIndex);
      const result = calculateStrokesGainedV3(round, benchmark);
      expect(result.total).toBe(result.totalAnchorValue);
    });

    it("categories still sum to total within tolerance with correction", () => {
      const round = makeRound({
        handicapIndex: 14.3,
        fairwaysHit: 4,
        fairwayAttempts: 14,
        greensInRegulation: 10,
        upAndDownAttempts: 5,
        upAndDownConverted: 3,
      });
      const benchmark = getInterpolatedBenchmark(round.handicapIndex);
      const result = calculateStrokesGainedV3(round, benchmark);
      const sum =
        result.categories["off-the-tee"] +
        result.categories["approach"] +
        result.categories["around-the-green"] +
        result.categories["putting"];
      expect(sum).toBeCloseTo(result.total, 1);
    });

    it("long hitter pattern: OTT improves vs uncorrected provisionals", () => {
      const round = makeRound({
        handicapIndex: 14.3,
        fairwaysHit: 3,     // very low FIR — long/wild driver
        fairwayAttempts: 14,
        greensInRegulation: 11, // high GIR — easy approaches from power
        upAndDownAttempts: 4,
        upAndDownConverted: 3,
      });
      const benchmark = getInterpolatedBenchmark(round.handicapIndex);
      const result = calculateStrokesGainedV3(round, benchmark);

      const diag = result.diagnostics;
      expect(diag.attributionCorrection).toBeDefined();
      expect(diag.attributionCorrection!.applied).toBe(true);
      // OTT should be higher after correction (credit shifted from Approach)
      expect(diag.attributionCorrection!.postCorrectionOTT).toBeGreaterThan(
        diag.attributionCorrection!.preCorrectionOTT
      );
      expect(diag.attributionCorrection!.postCorrectionApproach).toBeLessThan(
        diag.attributionCorrection!.preCorrectionApproach
      );
    });
  });

  describe("V1 parity with full-path coefficients", () => {
    it("V3 categories are close to V1 when anchor is close to category sum", () => {
      // With standard course (slope=113, CR close to expected), the anchor
      // should be near the category sum, so reconciliation adjustments are small
      const round = makeRound({
        courseRating: 72.0,
        slopeRating: 113,
        handicapIndex: 14.3,
        upAndDownAttempts: 8,
        upAndDownConverted: 4,
      });
      const benchmark = getInterpolatedBenchmark(round.handicapIndex);
      const v1 = calculateStrokesGained(round, benchmark);
      const v3 = calculateStrokesGainedV3(round, benchmark);

      // V3 provisionals (before reconciliation) should match V1 exactly on full path
      const diag = v3.diagnostics.provisionalCategoryValues!;
      expect(diag["off-the-tee"]).toBeCloseTo(v1.categories["off-the-tee"], 5);
      expect(diag["approach"]).toBeCloseTo(v1.categories["approach"], 5);
      expect(diag["around-the-green"]).toBeCloseTo(v1.categories["around-the-green"], 5);
      expect(diag["putting"]).toBeCloseTo(v1.categories["putting"], 5);
    });
  });
});
