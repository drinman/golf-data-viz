import { describe, it, expect } from "vitest";
import { makeRoundSnapshot } from "../fixtures/factories";
import {
  toTrendSeries,
  calculateBiggestMover,
  hasMethodologyMix,
  computeYDomain,
  TREND_CATEGORY_COLORS,
} from "@/lib/golf/trends";
import { CATEGORY_LABELS, CATEGORY_ORDER } from "@/lib/golf/constants";
import { getMajorVersion } from "@/lib/golf/constants";

describe("toTrendSeries", () => {
  it("returns empty array for empty input", () => {
    expect(toTrendSeries([])).toEqual([]);
  });

  it("returns 4 series with 1 data point each for a single round", () => {
    const rounds = [makeRoundSnapshot()];
    const series = toTrendSeries(rounds);

    expect(series).toHaveLength(4);
    for (const s of series) {
      expect(s.data).toHaveLength(1);
      expect(s.data[0].x).toBe("Round 1");
    }
  });

  it("sorts rounds ascending by playedAt and uses ordinal x-axis", () => {
    const rounds = [
      makeRoundSnapshot({ roundId: "r3", playedAt: "2026-03-03", sgOffTheTee: 1.0 }),
      makeRoundSnapshot({ roundId: "r1", playedAt: "2026-03-01", sgOffTheTee: 0.2 }),
      makeRoundSnapshot({ roundId: "r2", playedAt: "2026-03-02", sgOffTheTee: 0.5 }),
    ];

    const series = toTrendSeries(rounds);
    const ottSeries = series.find((s) => s.id === "Off the Tee")!;

    expect(ottSeries.data).toEqual([
      { x: "Round 1", y: 0.2 },
      { x: "Round 2", y: 0.5 },
      { x: "Round 3", y: 1.0 },
    ]);
  });

  it("assigns colors matching TREND_CATEGORY_COLORS", () => {
    const rounds = [makeRoundSnapshot()];
    const series = toTrendSeries(rounds);

    for (const [i, s] of series.entries()) {
      expect(s.color).toBe(TREND_CATEGORY_COLORS[CATEGORY_ORDER[i]]);
    }
  });

  it("uses display labels as series ids", () => {
    const rounds = [makeRoundSnapshot()];
    const series = toTrendSeries(rounds);
    const ids = series.map((s) => s.id);

    expect(ids).toEqual(CATEGORY_ORDER.map((c) => CATEGORY_LABELS[c]));
  });

  it("maps correct SG values per category", () => {
    const rounds = [
      makeRoundSnapshot({
        sgOffTheTee: 0.3,
        sgApproach: -0.8,
        sgAroundTheGreen: -0.5,
        sgPutting: -0.5,
      }),
    ];

    const series = toTrendSeries(rounds);

    expect(series.find((s) => s.id === "Off the Tee")!.data[0].y).toBe(0.3);
    expect(series.find((s) => s.id === "Approach")!.data[0].y).toBe(-0.8);
    expect(series.find((s) => s.id === "Around the Green")!.data[0].y).toBe(-0.5);
    expect(series.find((s) => s.id === "Putting")!.data[0].y).toBe(-0.5);
  });
});

describe("calculateBiggestMover", () => {
  it("returns null for 0 rounds", () => {
    expect(calculateBiggestMover([])).toBeNull();
  });

  it("returns null for 1 round", () => {
    expect(calculateBiggestMover([makeRoundSnapshot()])).toBeNull();
  });

  it("returns null for 2 rounds", () => {
    const rounds = [
      makeRoundSnapshot({ playedAt: "2026-03-01" }),
      makeRoundSnapshot({ playedAt: "2026-03-02" }),
    ];
    expect(calculateBiggestMover(rounds)).toBeNull();
  });

  it("uses latest 2 vs earliest 2 for 3 rounds with confidence = recent_movement", () => {
    const rounds = [
      makeRoundSnapshot({ playedAt: "2026-03-01", sgApproach: -1.0 }),
      makeRoundSnapshot({ playedAt: "2026-03-02", sgApproach: -0.8 }),
      makeRoundSnapshot({ playedAt: "2026-03-03", sgApproach: 0.2 }),
    ];

    const result = calculateBiggestMover(rounds);

    expect(result).not.toBeNull();
    expect(result!.category).toBe("approach");
    expect(result!.confidence).toBe("recent_movement");
    expect(result!.direction).toBe("improving");
  });

  it("uses latest 2 vs earliest 2 for 4 rounds with confidence = recent_movement", () => {
    const rounds = [
      makeRoundSnapshot({ playedAt: "2026-03-01", sgPutting: 0.5 }),
      makeRoundSnapshot({ playedAt: "2026-03-02", sgPutting: 0.3 }),
      makeRoundSnapshot({ playedAt: "2026-03-03", sgPutting: -0.5 }),
      makeRoundSnapshot({ playedAt: "2026-03-04", sgPutting: -0.7 }),
    ];

    const result = calculateBiggestMover(rounds);

    expect(result).not.toBeNull();
    expect(result!.category).toBe("putting");
    expect(result!.confidence).toBe("recent_movement");
    expect(result!.direction).toBe("declining");
  });

  it("uses latest 3 vs earliest 3 for 5 rounds with confidence = emerging_pattern", () => {
    const rounds = [
      makeRoundSnapshot({ playedAt: "2026-03-01", sgOffTheTee: -0.5 }),
      makeRoundSnapshot({ playedAt: "2026-03-02", sgOffTheTee: -0.6 }),
      makeRoundSnapshot({ playedAt: "2026-03-03", sgOffTheTee: -0.4 }),
      makeRoundSnapshot({ playedAt: "2026-03-04", sgOffTheTee: 0.2 }),
      makeRoundSnapshot({ playedAt: "2026-03-05", sgOffTheTee: 0.4 }),
    ];

    const result = calculateBiggestMover(rounds);

    expect(result).not.toBeNull();
    expect(result!.category).toBe("off-the-tee");
    expect(result!.confidence).toBe("emerging_pattern");
    expect(result!.direction).toBe("improving");
  });

  it("returns null when all deltas are below 0.15 threshold", () => {
    const rounds = [
      makeRoundSnapshot({
        playedAt: "2026-03-01",
        sgOffTheTee: 0.3,
        sgApproach: -0.8,
        sgAroundTheGreen: -0.5,
        sgPutting: -0.5,
      }),
      makeRoundSnapshot({
        playedAt: "2026-03-02",
        sgOffTheTee: 0.35,
        sgApproach: -0.75,
        sgAroundTheGreen: -0.45,
        sgPutting: -0.45,
      }),
      makeRoundSnapshot({
        playedAt: "2026-03-03",
        sgOffTheTee: 0.32,
        sgApproach: -0.78,
        sgAroundTheGreen: -0.48,
        sgPutting: -0.48,
      }),
    ];

    expect(calculateBiggestMover(rounds)).toBeNull();
  });

  it("picks category with largest absolute delta", () => {
    const rounds = [
      makeRoundSnapshot({
        playedAt: "2026-03-01",
        sgOffTheTee: 0.0,
        sgApproach: 0.0,
        sgAroundTheGreen: 0.0,
        sgPutting: 0.0,
      }),
      makeRoundSnapshot({
        playedAt: "2026-03-02",
        sgOffTheTee: 0.0,
        sgApproach: 0.0,
        sgAroundTheGreen: 0.0,
        sgPutting: 0.0,
      }),
      makeRoundSnapshot({
        playedAt: "2026-03-03",
        sgOffTheTee: 0.2,   // delta = +0.2
        sgApproach: 0.5,     // delta = +0.5 (largest)
        sgAroundTheGreen: -0.3,  // delta = -0.3
        sgPutting: 0.1,
      }),
    ];

    const result = calculateBiggestMover(rounds);

    expect(result).not.toBeNull();
    expect(result!.category).toBe("approach");
  });

  it("returns improving direction when delta is positive", () => {
    const rounds = [
      makeRoundSnapshot({ playedAt: "2026-03-01", sgApproach: -1.0 }),
      makeRoundSnapshot({ playedAt: "2026-03-02", sgApproach: -0.9 }),
      makeRoundSnapshot({ playedAt: "2026-03-03", sgApproach: 0.0 }),
    ];

    const result = calculateBiggestMover(rounds);

    expect(result!.direction).toBe("improving");
    expect(result!.delta).toBeGreaterThan(0);
  });

  it("returns declining direction when delta is negative", () => {
    const rounds = [
      makeRoundSnapshot({ playedAt: "2026-03-01", sgPutting: 1.0 }),
      makeRoundSnapshot({ playedAt: "2026-03-02", sgPutting: 0.9 }),
      makeRoundSnapshot({ playedAt: "2026-03-03", sgPutting: -0.5 }),
    ];

    const result = calculateBiggestMover(rounds);

    expect(result!.direction).toBe("declining");
    expect(result!.delta).toBeLessThan(0);
  });

  it("generates copy text with cautious language", () => {
    const rounds = [
      makeRoundSnapshot({ playedAt: "2026-03-01", sgApproach: -1.0 }),
      makeRoundSnapshot({ playedAt: "2026-03-02", sgApproach: -0.8 }),
      makeRoundSnapshot({ playedAt: "2026-03-03", sgApproach: 0.2 }),
    ];

    const result = calculateBiggestMover(rounds);

    expect(result!.copyText).toBeTruthy();
    expect(result!.copyText.length).toBeGreaterThan(20);
    // Should include the category label
    expect(result!.copyText.toLowerCase()).toContain("approach");
  });
});

describe("getMajorVersion", () => {
  it("extracts major from a semver string", () => {
    expect(getMajorVersion("3.1.0")).toBe("3");
  });

  it("returns null for null input", () => {
    expect(getMajorVersion(null)).toBeNull();
  });

  it("returns null for malformed input", () => {
    expect(getMajorVersion("bad")).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(getMajorVersion("")).toBeNull();
  });
});

describe("hasMethodologyMix", () => {
  it("returns false for empty array", () => {
    expect(hasMethodologyMix([])).toBe(false);
  });

  it("returns false when all rounds have the same major version", () => {
    const rounds = [
      makeRoundSnapshot({ methodologyVersion: "2.0.0" }),
      makeRoundSnapshot({ methodologyVersion: "2.0.0" }),
    ];
    expect(hasMethodologyMix(rounds)).toBe(false);
  });

  it("returns false for same major, different minor", () => {
    const rounds = [
      makeRoundSnapshot({ methodologyVersion: "3.0.0" }),
      makeRoundSnapshot({ methodologyVersion: "3.1.0" }),
    ];
    expect(hasMethodologyMix(rounds)).toBe(false);
  });

  it("returns true for different major versions", () => {
    const rounds = [
      makeRoundSnapshot({ methodologyVersion: "2.0.0" }),
      makeRoundSnapshot({ methodologyVersion: "3.1.0" }),
    ];
    expect(hasMethodologyMix(rounds)).toBe(true);
  });

  it("returns false when all methodologyVersion values are null", () => {
    const rounds = [
      makeRoundSnapshot({ methodologyVersion: null }),
      makeRoundSnapshot({ methodologyVersion: null }),
    ];
    expect(hasMethodologyMix(rounds)).toBe(false);
  });

  it("returns false for one non-null and rest null", () => {
    const rounds = [
      makeRoundSnapshot({ methodologyVersion: "2.0.0" }),
      makeRoundSnapshot({ methodologyVersion: null }),
      makeRoundSnapshot({ methodologyVersion: null }),
    ];
    expect(hasMethodologyMix(rounds)).toBe(false);
  });

  it("returns true for two different majors with nulls", () => {
    const rounds = [
      makeRoundSnapshot({ methodologyVersion: "2.0.0" }),
      makeRoundSnapshot({ methodologyVersion: null }),
      makeRoundSnapshot({ methodologyVersion: "3.0.0" }),
    ];
    expect(hasMethodologyMix(rounds)).toBe(true);
  });

  it("returns false for malformed + valid (malformed filtered out)", () => {
    const rounds = [
      makeRoundSnapshot({ methodologyVersion: "bad" }),
      makeRoundSnapshot({ methodologyVersion: "3.1.0" }),
    ];
    expect(hasMethodologyMix(rounds)).toBe(false);
  });

  it("returns false for null + valid (null filtered out)", () => {
    const rounds = [
      makeRoundSnapshot({ methodologyVersion: null }),
      makeRoundSnapshot({ methodologyVersion: "3.1.0" }),
    ];
    expect(hasMethodologyMix(rounds)).toBe(false);
  });
});

describe("computeYDomain", () => {
  it("returns { min: -1, max: 1 } for empty series", () => {
    expect(computeYDomain([])).toEqual({ min: -1, max: 1 });
  });

  it("returns zero-centered domain for all-positive values", () => {
    const series = toTrendSeries([
      makeRoundSnapshot({ sgOffTheTee: 1.0, sgApproach: 0.5, sgAroundTheGreen: 0.3, sgPutting: 0.2 }),
    ]);
    const domain = computeYDomain(series);
    expect(domain.min).toBeLessThan(0);
    expect(domain.max).toBeGreaterThan(0);
    expect(Math.abs(domain.min)).toBeCloseTo(domain.max, 1);
  });

  it("returns zero-centered domain for mixed positive/negative values", () => {
    const series = toTrendSeries([
      makeRoundSnapshot({ sgOffTheTee: 1.5, sgApproach: -1.2, sgAroundTheGreen: -0.6, sgPutting: -0.5 }),
    ]);
    const domain = computeYDomain(series);
    expect(domain.min).toBeLessThan(-1.2);
    expect(domain.max).toBeGreaterThan(1.5);
    expect(0).toBeGreaterThan(domain.min);
    expect(0).toBeLessThan(domain.max);
    expect(Math.abs(domain.min)).toBeCloseTo(domain.max, 1);
  });

  it("gives negatives readable space when positive spike dominates", () => {
    const series = toTrendSeries([
      makeRoundSnapshot({ sgOffTheTee: 3.0, sgApproach: -0.5, sgAroundTheGreen: -0.2, sgPutting: -0.3 }),
    ]);
    const domain = computeYDomain(series);
    expect(domain.min).toBeLessThanOrEqual(-3.0);
    expect(domain.max).toBeGreaterThanOrEqual(3.0);
  });

  it("always includes zero in the domain", () => {
    const allPositive = toTrendSeries([
      makeRoundSnapshot({ sgOffTheTee: 0.5, sgApproach: 0.3, sgAroundTheGreen: 0.2, sgPutting: 0.1 }),
    ]);
    const d1 = computeYDomain(allPositive);
    expect(d1.min).toBeLessThan(0);
    expect(d1.max).toBeGreaterThan(0);

    const allNegative = toTrendSeries([
      makeRoundSnapshot({ sgOffTheTee: -0.5, sgApproach: -0.3, sgAroundTheGreen: -0.2, sgPutting: -0.1 }),
    ]);
    const d2 = computeYDomain(allNegative);
    expect(d2.min).toBeLessThan(0);
    expect(d2.max).toBeGreaterThan(0);
  });

  it("snaps to 0.2 increments", () => {
    const series = toTrendSeries([
      makeRoundSnapshot({ sgOffTheTee: 0.7, sgApproach: -0.3, sgAroundTheGreen: 0.1, sgPutting: -0.1 }),
    ]);
    const domain = computeYDomain(series);
    expect((domain.min * 5) % 1).toBeCloseTo(0, 5);
    expect((domain.max * 5) % 1).toBeCloseTo(0, 5);
  });
});
