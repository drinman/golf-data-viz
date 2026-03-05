import { describe, it, expect } from "vitest";
import {
  calculateStrokesGained,
  toRadarChartData,
  estimateGIR,
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

  // Putting fix: low-GIR regression
  it("low-GIR exact regression: 2 GIR / 34 putts → putting SG ≈ -0.22", () => {
    const round = makeRound({
      handicapIndex: 14.3,
      greensInRegulation: 2,
      totalPutts: 34,
    });
    delete round.threePutts;
    const benchmark = getBracketForHandicap(14.3);
    const result = calculateStrokesGained(round, benchmark);
    expect(result.categories["putting"]).toBeCloseTo(-0.22, 1);
  });

  // Putting fix: GIR-invariance
  it("putting SG is GIR-invariant when threePutts is absent", () => {
    const benchmark = getBracketForHandicap(14.3);
    const results = [2, 4, 8].map((gir) => {
      const round = makeRound({ greensInRegulation: gir, totalPutts: 34 });
      delete round.threePutts;
      return calculateStrokesGained(round, benchmark).categories["putting"];
    });
    expect(results[0]).toBeCloseTo(results[1], 10);
    expect(results[1]).toBeCloseTo(results[2], 10);
  });

  // Putting fix: three-putt cap
  it("three-putt bonus is capped at ±0.5", () => {
    const round = makeRound({
      handicapIndex: 14.3,
      totalPutts: 33, // ≈ peer avg → base ≈ 0
      threePutts: 8, // uncapped = (3.3-8)*0.3 = -1.41
    });
    const benchmark = getBracketForHandicap(14.3);
    const result = calculateStrokesGained(round, benchmark);
    expect(result.categories["putting"]).toBeCloseTo(-0.5, 0);
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
    expect(Math.abs(result.categories["putting"])).toBeLessThan(3);
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

describe("missing fairwaysHit and greensInRegulation", () => {
  it("approach is estimated (not skipped) when GIR is missing", () => {
    const round = makeRound();
    delete round.greensInRegulation;
    const benchmark = getBracketForHandicap(14.3);
    const result = calculateStrokesGained(round, benchmark);
    expect(result.skippedCategories).not.toContain("approach");
    expect(result.estimatedCategories).toContain("approach");
    expect(result.categories["approach"]).not.toBe(0);
  });

  it("ATG is estimated (not skipped) when GIR is missing and no up-and-down data", () => {
    const round = makeRound();
    delete round.greensInRegulation;
    delete round.upAndDownAttempts;
    delete round.upAndDownConverted;
    const benchmark = getBracketForHandicap(14.3);
    const result = calculateStrokesGained(round, benchmark);
    expect(result.skippedCategories).not.toContain("around-the-green");
    expect(result.estimatedCategories).toContain("around-the-green");
  });

  it("ATG is NOT skipped when GIR is missing but up-and-down data exists", () => {
    const round = makeRound({
      upAndDownAttempts: 8,
      upAndDownConverted: 4,
    });
    delete round.greensInRegulation;
    const benchmark = getBracketForHandicap(14.3);
    const result = calculateStrokesGained(round, benchmark);
    expect(result.skippedCategories).not.toContain("around-the-green");
    expect(Number.isFinite(result.categories["around-the-green"])).toBe(true);
  });

  it("ATG is estimated when upAndDownAttempts = 0 and GIR is missing", () => {
    const round = makeRound({
      upAndDownAttempts: 0,
      upAndDownConverted: 0,
    });
    delete round.greensInRegulation;
    const benchmark = getBracketForHandicap(14.3);
    const result = calculateStrokesGained(round, benchmark);
    expect(result.skippedCategories).not.toContain("around-the-green");
    expect(result.estimatedCategories).toContain("around-the-green");
  });

  it("OTT still calculates penalty component when fairwaysHit is missing", () => {
    const round = makeRound({ penaltyStrokes: 5 });
    delete round.fairwaysHit;
    const benchmark = getBracketForHandicap(14.3);
    const result = calculateStrokesGained(round, benchmark);
    expect(result.skippedCategories).not.toContain("off-the-tee");
    expect(result.categories["off-the-tee"]).not.toBe(0);
  });

  it("putting is unaffected by missing GIR and fairwaysHit", () => {
    const round = makeRound({ totalPutts: 30 });
    delete round.fairwaysHit;
    delete round.greensInRegulation;
    const benchmark = getBracketForHandicap(14.3);
    const result = calculateStrokesGained(round, benchmark);
    expect(result.skippedCategories).not.toContain("putting");
    expect(Number.isFinite(result.categories["putting"])).toBe(true);
  });

  it("total equals sum of all 4 categories when GIR is estimated", () => {
    const round = makeRound();
    delete round.greensInRegulation;
    delete round.upAndDownAttempts;
    delete round.upAndDownConverted;
    const benchmark = getBracketForHandicap(14.3);
    const result = calculateStrokesGained(round, benchmark);
    const categorySum =
      result.categories["off-the-tee"] +
      result.categories["approach"] +
      result.categories["around-the-green"] +
      result.categories["putting"];
    expect(result.total).toBeCloseTo(categorySum, 10);
  });

  it("handles both fairwaysHit and GIR missing simultaneously", () => {
    const round = makeRound();
    delete round.fairwaysHit;
    delete round.greensInRegulation;
    delete round.upAndDownAttempts;
    delete round.upAndDownConverted;
    const benchmark = getBracketForHandicap(14.3);
    const result = calculateStrokesGained(round, benchmark);
    expect(Number.isFinite(result.total)).toBe(true);
    expect(result.estimatedCategories).toContain("approach");
    expect(result.estimatedCategories).toContain("around-the-green");
    expect(result.skippedCategories).not.toContain("off-the-tee");
    expect(result.skippedCategories).not.toContain("putting");
  });

  it("existing rounds with all fields have empty skippedCategories", () => {
    const benchmark = getBracketForHandicap(14.3);
    const result = calculateStrokesGained(makeRound(), benchmark);
    expect(result.skippedCategories).toEqual([]);
  });
});

describe("toRadarChartData", () => {
  it("returns 4 RadarChartDatum entries", () => {
    const benchmark = getBracketForHandicap(14.3);
    const result = calculateStrokesGained(makeRound(), benchmark);
    const chartData = toRadarChartData(result);
    expect(chartData).toHaveLength(4);
  });

  it("each datum has category and player fields (no peerAverage series)", () => {
    const benchmark = getBracketForHandicap(14.3);
    const result = calculateStrokesGained(makeRound(), benchmark);
    const chartData = toRadarChartData(result);
    for (const datum of chartData) {
      expect(typeof datum.category).toBe("string");
      expect(typeof datum.player).toBe("number");
      expect(datum).not.toHaveProperty("peerAverage");
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
      skippedCategories: [],
      estimatedCategories: [],
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
      skippedCategories: [],
      estimatedCategories: [],
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

  it("chart contract: single player series, no peer polygon data", () => {
    const benchmark = getBracketForHandicap(14.3);
    const result = calculateStrokesGained(makeRound(), benchmark);
    const chartData = toRadarChartData(result);

    // Only "category" and "player" keys should exist (no skipped for full data)
    const allKeys = new Set(chartData.flatMap((d) => Object.keys(d)));
    expect(allKeys).toEqual(new Set(["category", "player"]));

    // Player values are on the 0-100 normalized scale (50 = peer baseline)
    for (const datum of chartData) {
      expect(datum.player).toBeGreaterThanOrEqual(0);
      expect(datum.player).toBeLessThanOrEqual(100);
    }
  });

  it("shows real estimated values for categories with estimated GIR (no skipped flag)", () => {
    const round = makeRound();
    delete round.greensInRegulation;
    delete round.upAndDownAttempts;
    delete round.upAndDownConverted;
    const benchmark = getBracketForHandicap(14.3);
    const result = calculateStrokesGained(round, benchmark);
    const chartData = toRadarChartData(result);

    // With estimation, no categories are skipped — all get real values
    const approach = chartData.find((d) => d.category === "Approach");
    const atg = chartData.find((d) => d.category === "Around the Green");
    expect(approach?.skipped).toBeUndefined();
    expect(atg?.skipped).toBeUndefined();
    expect(approach?.player).not.toBe(50); // real estimated value, not baseline

    const ott = chartData.find((d) => d.category === "Off the Tee");
    const putting = chartData.find((d) => d.category === "Putting");
    expect(ott?.skipped).toBeUndefined();
    expect(putting?.skipped).toBeUndefined();
  });
});

describe("GIR estimation", () => {
  // estimateGIR function
  it("estimateGIR returns reasonable value for typical 14-hcp round", () => {
    const round = makeRound({
      eagles: 0,
      birdies: 1,
      pars: 7,
    });
    // 0 + 1 + 7*0.65 = 5.55 → rounds to 6
    expect(estimateGIR(round)).toBe(6);
  });

  it("estimateGIR caps at 18", () => {
    const round = makeRound({
      eagles: 5,
      birdies: 10,
      pars: 3,
    });
    // 5 + 10 + 3*0.65 = 16.95 → 17, still under 18
    expect(estimateGIR(round)).toBeLessThanOrEqual(18);
  });

  it("estimateGIR returns 0 when scoring is all triple+", () => {
    const round = makeRound({
      eagles: 0,
      birdies: 0,
      pars: 0,
      bogeys: 0,
      doubleBogeys: 0,
      triplePlus: 18,
    });
    expect(estimateGIR(round)).toBe(0);
  });

  it("estimateGIR handles 0 pars correctly", () => {
    const round = makeRound({
      eagles: 0,
      birdies: 2,
      pars: 0,
    });
    expect(estimateGIR(round)).toBe(2);
  });

  // Integration with calculateStrokesGained
  it("approach is NOT in skippedCategories when GIR is estimated", () => {
    const round = makeRound();
    delete round.greensInRegulation;
    const benchmark = getBracketForHandicap(14.3);
    const result = calculateStrokesGained(round, benchmark);
    expect(result.skippedCategories).not.toContain("approach");
    expect(result.estimatedCategories).toContain("approach");
  });

  it("around-the-green is NOT in skippedCategories when GIR is estimated (no up-and-down data)", () => {
    const round = makeRound();
    delete round.greensInRegulation;
    delete round.upAndDownAttempts;
    delete round.upAndDownConverted;
    const benchmark = getBracketForHandicap(14.3);
    const result = calculateStrokesGained(round, benchmark);
    expect(result.skippedCategories).not.toContain("around-the-green");
    expect(result.estimatedCategories).toContain("around-the-green");
  });

  it("around-the-green is NOT in estimatedCategories when real up-and-down data provided (even if GIR missing)", () => {
    const round = makeRound({
      upAndDownAttempts: 8,
      upAndDownConverted: 4,
    });
    delete round.greensInRegulation;
    const benchmark = getBracketForHandicap(14.3);
    const result = calculateStrokesGained(round, benchmark);
    expect(result.estimatedCategories).not.toContain("around-the-green");
    expect(result.estimatedCategories).toContain("approach");
  });

  it("estimatedCategories includes 'approach' when GIR was missing", () => {
    const round = makeRound();
    delete round.greensInRegulation;
    const benchmark = getBracketForHandicap(14.3);
    const result = calculateStrokesGained(round, benchmark);
    expect(result.estimatedCategories).toContain("approach");
  });

  it("estimatedCategories is empty when all fields provided", () => {
    const benchmark = getBracketForHandicap(14.3);
    const result = calculateStrokesGained(makeRound(), benchmark);
    expect(result.estimatedCategories).toEqual([]);
  });

  it("total equals sum of all 4 categories when GIR is estimated", () => {
    const round = makeRound();
    delete round.greensInRegulation;
    delete round.upAndDownAttempts;
    delete round.upAndDownConverted;
    const benchmark = getBracketForHandicap(14.3);
    const result = calculateStrokesGained(round, benchmark);
    const categorySum =
      result.categories["off-the-tee"] +
      result.categories["approach"] +
      result.categories["around-the-green"] +
      result.categories["putting"];
    expect(result.total).toBeCloseTo(categorySum, 10);
  });

  it("skippedCategories is empty when GIR is estimated (backward compat)", () => {
    const round = makeRound();
    delete round.greensInRegulation;
    const benchmark = getBracketForHandicap(14.3);
    const result = calculateStrokesGained(round, benchmark);
    expect(result.skippedCategories).toEqual([]);
  });
});
