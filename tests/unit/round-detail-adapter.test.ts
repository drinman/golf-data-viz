import { describe, it, expect } from "vitest";
import type { RoundDetailSnapshot, StrokesGainedCategory } from "@/lib/golf/types";
import {
  deriveConfidence,
  toStrokesGainedResult,
  toRadarChartDataFromSnapshot,
} from "@/lib/golf/round-detail-adapter";

function makeDetailSnapshot(
  overrides: Partial<RoundDetailSnapshot> = {}
): RoundDetailSnapshot {
  return {
    roundId: "abc-123",
    playedAt: "2026-03-08",
    courseName: "Pine Valley GC",
    score: 82,
    handicapIndex: 14.2,
    sgTotal: 1.52,
    sgOffTheTee: 0.8,
    sgApproach: 0.3,
    sgAroundTheGreen: -0.1,
    sgPutting: 0.52,
    methodologyVersion: "2.0.0",
    benchmarkBracket: "10-15",
    benchmarkVersion: "1.0.0",
    benchmarkHandicap: 14.2,
    benchmarkInterpolationMode: "standard",
    calibrationVersion: null,
    totalAnchorMode: null,
    confidenceOffTheTee: "medium",
    confidenceApproach: "high",
    confidenceAroundTheGreen: "medium",
    confidencePutting: "high",
    estimatedCategories: [],
    skippedCategories: [],
    fairwaysHit: 8,
    fairwayAttempts: 14,
    greensInRegulation: 9,
    upAndDownAttempts: null,
    upAndDownConverted: null,
    ...overrides,
  };
}

describe("deriveConfidence", () => {
  it("returns medium for OTT when fairwaysHit is provided", () => {
    const result = deriveConfidence({
      fairwaysHit: 8,
      fairwayAttempts: 14,
      greensInRegulation: 9,
      upAndDownAttempts: null,
      upAndDownConverted: null,
    });
    expect(result["off-the-tee"]).toBe("medium");
  });

  it("returns low for OTT when fairwaysHit is missing", () => {
    const result = deriveConfidence({
      fairwaysHit: null,
      fairwayAttempts: 14,
      greensInRegulation: 9,
      upAndDownAttempts: null,
      upAndDownConverted: null,
    });
    expect(result["off-the-tee"]).toBe("low");
  });

  it("returns low for OTT when fairwayAttempts is 0", () => {
    const result = deriveConfidence({
      fairwaysHit: 0,
      fairwayAttempts: 0,
      greensInRegulation: 9,
      upAndDownAttempts: null,
      upAndDownConverted: null,
    });
    expect(result["off-the-tee"]).toBe("low");
  });

  it("returns high for approach when GIR is provided", () => {
    const result = deriveConfidence({
      fairwaysHit: 8,
      fairwayAttempts: 14,
      greensInRegulation: 9,
      upAndDownAttempts: null,
      upAndDownConverted: null,
    });
    expect(result.approach).toBe("high");
  });

  it("returns medium for approach when GIR is missing", () => {
    const result = deriveConfidence({
      fairwaysHit: 8,
      fairwayAttempts: 14,
      greensInRegulation: null,
      upAndDownAttempts: null,
      upAndDownConverted: null,
    });
    expect(result.approach).toBe("medium");
  });

  it("returns high for ATG when up-and-down data provided", () => {
    const result = deriveConfidence({
      fairwaysHit: 8,
      fairwayAttempts: 14,
      greensInRegulation: 9,
      upAndDownAttempts: 5,
      upAndDownConverted: 3,
    });
    expect(result["around-the-green"]).toBe("high");
  });

  it("returns low for ATG when GIR and U&D both missing", () => {
    const result = deriveConfidence({
      fairwaysHit: 8,
      fairwayAttempts: 14,
      greensInRegulation: null,
      upAndDownAttempts: null,
      upAndDownConverted: null,
    });
    expect(result["around-the-green"]).toBe("low");
  });

  it("returns medium for ATG when GIR present but U&D missing", () => {
    const result = deriveConfidence({
      fairwaysHit: 8,
      fairwayAttempts: 14,
      greensInRegulation: 9,
      upAndDownAttempts: null,
      upAndDownConverted: null,
    });
    expect(result["around-the-green"]).toBe("medium");
  });

  it("always returns high for putting", () => {
    const result = deriveConfidence({
      fairwaysHit: null,
      fairwayAttempts: 0,
      greensInRegulation: null,
      upAndDownAttempts: null,
      upAndDownConverted: null,
    });
    expect(result.putting).toBe("high");
  });
});

describe("toStrokesGainedResult", () => {
  it("produces correct shape from full snapshot", () => {
    const snapshot = makeDetailSnapshot();
    const result = toStrokesGainedResult(snapshot);

    expect(result.total).toBe(1.52);
    expect(result.categories["off-the-tee"]).toBe(0.8);
    expect(result.categories.approach).toBe(0.3);
    expect(result.categories["around-the-green"]).toBe(-0.1);
    expect(result.categories.putting).toBe(0.52);
    expect(result.benchmarkBracket).toBe("10-15");
    expect(result.methodologyVersion).toBe("2.0.0");
    expect(result.benchmarkVersion).toBe("1.0.0");
    expect(result.benchmarkHandicap).toBe(14.2);
    expect(result.skippedCategories).toEqual([]);
    expect(result.estimatedCategories).toEqual([]);
    expect(result.confidence["off-the-tee"]).toBe("medium");
    expect(result.confidence.approach).toBe("high");
    expect(result.confidence["around-the-green"]).toBe("medium");
    expect(result.confidence.putting).toBe("high");
  });

  it("handles null confidence (falls back to derivation)", () => {
    const snapshot = makeDetailSnapshot({
      confidenceOffTheTee: null,
      confidenceApproach: null,
      confidenceAroundTheGreen: null,
      confidencePutting: null,
    });
    const result = toStrokesGainedResult(snapshot);

    // With fairwaysHit=8, fairwayAttempts=14 → OTT medium
    expect(result.confidence["off-the-tee"]).toBe("medium");
    // With GIR=9 → approach high
    expect(result.confidence.approach).toBe("high");
    // With GIR=9 but no U&D → ATG medium
    expect(result.confidence["around-the-green"]).toBe("medium");
    expect(result.confidence.putting).toBe("high");
  });

  it("handles plus handicap edge case", () => {
    const snapshot = makeDetailSnapshot({
      handicapIndex: -2.5,
      benchmarkBracket: "plus",
      benchmarkInterpolationMode: "scratch_clamped",
    });
    const result = toStrokesGainedResult(snapshot);

    expect(result.benchmarkBracket).toBe("plus");
    expect(result.benchmarkInterpolationMode).toBe("scratch_clamped");
  });

  it("handles missing optional fields", () => {
    const snapshot = makeDetailSnapshot({
      calibrationVersion: null,
      totalAnchorMode: null,
      benchmarkInterpolationMode: null,
    });
    const result = toStrokesGainedResult(snapshot);

    expect(result.calibrationVersion).toBeUndefined();
    expect(result.totalAnchorMode).toBeUndefined();
    expect(result.benchmarkInterpolationMode).toBeUndefined();
  });

  it("includes estimated and skipped categories", () => {
    const snapshot = makeDetailSnapshot({
      estimatedCategories: ["approach"] as StrokesGainedCategory[],
      skippedCategories: ["off-the-tee"] as StrokesGainedCategory[],
    });
    const result = toStrokesGainedResult(snapshot);

    expect(result.estimatedCategories).toEqual(["approach"]);
    expect(result.skippedCategories).toEqual(["off-the-tee"]);
  });
});

describe("toRadarChartDataFromSnapshot", () => {
  it("produces 4 categories with correct player values", () => {
    const snapshot = makeDetailSnapshot();
    const data = toRadarChartDataFromSnapshot(snapshot);

    expect(data).toHaveLength(4);
    expect(data.map((d) => d.category)).toEqual([
      "Off the Tee",
      "Approach",
      "Around the Green",
      "Putting",
    ]);

    // normalized = clamp(50 + sgValue * 10, 0, 100)
    expect(data[0].player).toBe(50 + 0.8 * 10); // OTT: 58
    expect(data[1].player).toBe(50 + 0.3 * 10); // Approach: 53
    expect(data[2].player).toBe(50 + -0.1 * 10); // ATG: 49
    expect(data[3].player).toBe(50 + 0.52 * 10); // Putting: 55.2
  });

  it("marks skipped categories at 50 with skipped flag", () => {
    const snapshot = makeDetailSnapshot({
      skippedCategories: ["off-the-tee"] as StrokesGainedCategory[],
    });
    const data = toRadarChartDataFromSnapshot(snapshot);

    expect(data[0].player).toBe(50);
    expect(data[0].skipped).toBe(true);
  });

  it("clamps extreme values to 0-100 range", () => {
    const snapshot = makeDetailSnapshot({
      sgOffTheTee: 6.0, // 50 + 60 = 110 → clamped to 100
      sgApproach: -6.0, // 50 - 60 = -10 → clamped to 0
    });
    const data = toRadarChartDataFromSnapshot(snapshot);

    expect(data[0].player).toBe(100);
    expect(data[1].player).toBe(0);
  });
});
