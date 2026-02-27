import { describe, it, expect } from "vitest";
import {
  calculateStrokesGained,
  toRadarChartData,
} from "@/lib/golf/strokes-gained";
import { getBracketForHandicap } from "@/lib/golf/benchmarks";
import type { StrokesGainedResult } from "@/lib/golf/types";
import { makeRound } from "../fixtures/factories";

// === Fixture rounds ===

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
});

const fifteenHcpBadRound = makeRound({
  handicapIndex: 15.0,
  score: 98,
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

// === Tests ===

describe("calculateStrokesGained", () => {
  // Structure
  it("returns a StrokesGainedResult with all 4 categories", () => {
    const benchmark = getBracketForHandicap(14.3);
    const result = calculateStrokesGained(makeRound(), benchmark);
    expect(result.benchmarkBracket).toBe("10-15");
    expect(result.categories).toHaveProperty("off-the-tee");
    expect(result.categories).toHaveProperty("approach");
    expect(result.categories).toHaveProperty("around-the-green");
    expect(result.categories).toHaveProperty("putting");
    expect(typeof result.total).toBe("number");
  });

  // Invariant: sgTotal = sum of categories
  it("sgTotal equals sum of all four categories", () => {
    const benchmark = getBracketForHandicap(14.3);
    const result = calculateStrokesGained(makeRound(), benchmark);
    const categorySum =
      result.categories["off-the-tee"] +
      result.categories["approach"] +
      result.categories["around-the-green"] +
      result.categories["putting"];
    expect(result.total).toBeCloseTo(categorySum, 10);
  });

  // Directionality tests
  it("scratch good round yields positive sgTotal", () => {
    const benchmark = getBracketForHandicap(scratchGoodRound.handicapIndex);
    const result = calculateStrokesGained(scratchGoodRound, benchmark);
    expect(result.total).toBeGreaterThan(0);
  });

  it("15-hcp bad round yields negative sgTotal", () => {
    const benchmark = getBracketForHandicap(fifteenHcpBadRound.handicapIndex);
    const result = calculateStrokesGained(fifteenHcpBadRound, benchmark);
    expect(result.total).toBeLessThan(0);
  });

  it("20-hcp typical round yields sgTotal near zero (within ±5)", () => {
    const benchmark = getBracketForHandicap(twentyHcpTypical.handicapIndex);
    const result = calculateStrokesGained(twentyHcpTypical, benchmark);
    expect(Math.abs(result.total)).toBeLessThan(5);
  });

  it("10-hcp average round yields sgTotal near zero (within ±6)", () => {
    const benchmark = getBracketForHandicap(tenHcpAverage.handicapIndex);
    const result = calculateStrokesGained(tenHcpAverage, benchmark);
    expect(Math.abs(result.total)).toBeLessThan(6);
  });

  it("30+ hcp round yields negative sgTotal", () => {
    const benchmark = getBracketForHandicap(highHcpRound.handicapIndex);
    const result = calculateStrokesGained(highHcpRound, benchmark);
    expect(result.total).toBeLessThan(0);
  });

  // Category direction tests
  it("SG:OTT is positive when hitting more fairways with fewer penalties", () => {
    const round = makeRound({
      handicapIndex: 14.3,
      fairwaysHit: 11, // 78.6% vs peer 47%
      fairwayAttempts: 14,
      penaltyStrokes: 0, // vs peer 2.2
    });
    const benchmark = getBracketForHandicap(14.3);
    const result = calculateStrokesGained(round, benchmark);
    expect(result.categories["off-the-tee"]).toBeGreaterThan(0);
  });

  it("SG:Approach is positive when GIR is above peer average", () => {
    const round = makeRound({
      handicapIndex: 14.3,
      greensInRegulation: 10, // 55.6% vs peer 32%
    });
    const benchmark = getBracketForHandicap(14.3);
    const result = calculateStrokesGained(round, benchmark);
    expect(result.categories["approach"]).toBeGreaterThan(0);
  });

  it("SG:Putting is positive when putting fewer than peer benchmark", () => {
    const round = makeRound({
      handicapIndex: 14.3,
      totalPutts: 28,
      greensInRegulation: 6,
    });
    const benchmark = getBracketForHandicap(14.3);
    const result = calculateStrokesGained(round, benchmark);
    expect(result.categories["putting"]).toBeGreaterThan(0);
  });

  // All categories return finite numbers (D1)
  it("all categories return finite numbers for every fixture round", () => {
    const fixtures = [
      scratchGoodRound,
      tenHcpAverage,
      fifteenHcpBadRound,
      twentyHcpTypical,
      highHcpRound,
    ];
    for (const round of fixtures) {
      const benchmark = getBracketForHandicap(round.handicapIndex);
      const result = calculateStrokesGained(round, benchmark);
      expect(Number.isFinite(result.total)).toBe(true);
      expect(Number.isFinite(result.categories["off-the-tee"])).toBe(true);
      expect(Number.isFinite(result.categories["approach"])).toBe(true);
      expect(Number.isFinite(result.categories["around-the-green"])).toBe(true);
      expect(Number.isFinite(result.categories["putting"])).toBe(true);
    }
  });

  // Edge cases
  it("handles par-3 course (0 fairway attempts) without error", () => {
    const round = makeRound({
      fairwaysHit: 0,
      fairwayAttempts: 0,
    });
    const benchmark = getBracketForHandicap(14.3);
    const result = calculateStrokesGained(round, benchmark);
    expect(Number.isFinite(result.categories["off-the-tee"])).toBe(true);
    expect(Number.isFinite(result.total)).toBe(true);
  });

  it("handles all optional fields missing", () => {
    const round = makeRound();
    delete round.upAndDownAttempts;
    delete round.upAndDownConverted;
    delete round.sandSaves;
    delete round.sandSaveAttempts;
    delete round.threePutts;
    const benchmark = getBracketForHandicap(14.3);
    const result = calculateStrokesGained(round, benchmark);
    expect(Number.isFinite(result.total)).toBe(true);
    expect(Number.isFinite(result.categories["around-the-green"])).toBe(true);
    expect(Number.isFinite(result.categories["putting"])).toBe(true);
  });

  it("handles optional up-and-down data when provided", () => {
    const round = makeRound({
      upAndDownAttempts: 8,
      upAndDownConverted: 4,
    });
    const benchmark = getBracketForHandicap(14.3);
    const result = calculateStrokesGained(round, benchmark);
    expect(Number.isFinite(result.categories["around-the-green"])).toBe(true);
  });

  it("handles three-putt data when provided", () => {
    const round = makeRound({
      threePutts: 4,
    });
    const benchmark = getBracketForHandicap(14.3);
    const result = calculateStrokesGained(round, benchmark);
    expect(Number.isFinite(result.categories["putting"])).toBe(true);
  });

  it("putting SG stays within reasonable range when GIR is 0", () => {
    const round = makeRound({
      greensInRegulation: 0,
      totalPutts: 36,
    });
    const benchmark = getBracketForHandicap(14.3);
    const result = calculateStrokesGained(round, benchmark);
    expect(Math.abs(result.categories["putting"])).toBeLessThan(10);
    expect(Math.abs(result.total)).toBeLessThan(20);
  });

  it("handles 0 GIR without division by zero", () => {
    const round = makeRound({
      greensInRegulation: 0,
      totalPutts: 36,
    });
    const benchmark = getBracketForHandicap(14.3);
    const result = calculateStrokesGained(round, benchmark);
    expect(Number.isFinite(result.categories["putting"])).toBe(true);
    expect(Number.isFinite(result.total)).toBe(true);
  });

  // ATG fallback: estimates from scoring when optional data is missing
  it("ATG fallback returns finite number from scoring pattern", () => {
    const round = makeRound({
      greensInRegulation: 6,
      pars: 7,
      // No upAndDownAttempts/upAndDownConverted
    });
    delete round.upAndDownAttempts;
    delete round.upAndDownConverted;
    const benchmark = getBracketForHandicap(14.3);
    const result = calculateStrokesGained(round, benchmark);
    expect(Number.isFinite(result.categories["around-the-green"])).toBe(true);
  });
});

describe("toRadarChartData", () => {
  it("returns 4 RadarChartDatum entries", () => {
    const benchmark = getBracketForHandicap(14.3);
    const result = calculateStrokesGained(makeRound(), benchmark);
    const chartData = toRadarChartData(result);
    expect(chartData).toHaveLength(4);
  });

  it("each datum has category, player, and peerAverage fields", () => {
    const benchmark = getBracketForHandicap(14.3);
    const result = calculateStrokesGained(makeRound(), benchmark);
    const chartData = toRadarChartData(result);
    for (const datum of chartData) {
      expect(typeof datum.category).toBe("string");
      expect(typeof datum.player).toBe("number");
      expect(typeof datum.peerAverage).toBe("number");
    }
  });

  it("peerAverage is always 50 (baseline) for all categories", () => {
    const benchmark = getBracketForHandicap(14.3);
    const result = calculateStrokesGained(makeRound(), benchmark);
    const chartData = toRadarChartData(result);
    for (const datum of chartData) {
      expect(datum.peerAverage).toBe(50);
    }
  });

  it("player values are clamped to [0, 100]", () => {
    // Extreme positive SG: fabricate a result with large values
    const extremePositive: StrokesGainedResult = {
      total: 24,
      categories: {
        "off-the-tee": 6,
        approach: 6,
        "around-the-green": 6,
        putting: 6,
      },
      benchmarkBracket: "10-15",
    };
    const chartHigh = toRadarChartData(extremePositive);
    for (const datum of chartHigh) {
      expect(datum.player).toBeLessThanOrEqual(100);
      expect(datum.player).toBeGreaterThanOrEqual(0);
    }

    // Extreme negative SG
    const extremeNegative: StrokesGainedResult = {
      total: -24,
      categories: {
        "off-the-tee": -6,
        approach: -6,
        "around-the-green": -6,
        putting: -6,
      },
      benchmarkBracket: "10-15",
    };
    const chartLow = toRadarChartData(extremeNegative);
    for (const datum of chartLow) {
      expect(datum.player).toBeLessThanOrEqual(100);
      expect(datum.player).toBeGreaterThanOrEqual(0);
    }
  });

  it("category labels are human-readable", () => {
    const benchmark = getBracketForHandicap(14.3);
    const result = calculateStrokesGained(makeRound(), benchmark);
    const chartData = toRadarChartData(result);
    const labels = chartData.map((d) => d.category);
    expect(labels).toContain("Off the Tee");
    expect(labels).toContain("Approach");
    expect(labels).toContain("Around the Green");
    expect(labels).toContain("Putting");
  });
});
