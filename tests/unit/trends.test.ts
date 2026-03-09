import { describe, it, expect } from "vitest";
import { makeRoundSnapshot } from "../fixtures/factories";
import {
  toTrendSeries,
  calculateBiggestMover,
  hasMethodologyMix,
  TREND_CATEGORY_COLORS,
} from "@/lib/golf/trends";
import { CATEGORY_ORDER } from "@/lib/golf/constants";

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
    const ottSeries = series.find((s) => s.id === "off-the-tee")!;

    expect(ottSeries.data).toEqual([
      { x: "Round 1", y: 0.2 },
      { x: "Round 2", y: 0.5 },
      { x: "Round 3", y: 1.0 },
    ]);
  });

  it("assigns colors matching TREND_CATEGORY_COLORS", () => {
    const rounds = [makeRoundSnapshot()];
    const series = toTrendSeries(rounds);

    for (const s of series) {
      expect(s.color).toBe(
        TREND_CATEGORY_COLORS[s.id as keyof typeof TREND_CATEGORY_COLORS]
      );
    }
  });

  it("uses category slugs as series ids in CATEGORY_ORDER", () => {
    const rounds = [makeRoundSnapshot()];
    const series = toTrendSeries(rounds);
    const ids = series.map((s) => s.id);

    expect(ids).toEqual(CATEGORY_ORDER);
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

    expect(series.find((s) => s.id === "off-the-tee")!.data[0].y).toBe(0.3);
    expect(series.find((s) => s.id === "approach")!.data[0].y).toBe(-0.8);
    expect(series.find((s) => s.id === "around-the-green")!.data[0].y).toBe(-0.5);
    expect(series.find((s) => s.id === "putting")!.data[0].y).toBe(-0.5);
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

describe("hasMethodologyMix", () => {
  it("returns false for empty array", () => {
    expect(hasMethodologyMix([])).toBe(false);
  });

  it("returns false when all rounds have the same version", () => {
    const rounds = [
      makeRoundSnapshot({ methodologyVersion: "2.0.0" }),
      makeRoundSnapshot({ methodologyVersion: "2.0.0" }),
    ];
    expect(hasMethodologyMix(rounds)).toBe(false);
  });

  it("returns true when rounds have different versions", () => {
    const rounds = [
      makeRoundSnapshot({ methodologyVersion: "2.0.0" }),
      makeRoundSnapshot({ methodologyVersion: "3.0.0" }),
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

  it("returns false for one non-null and rest null (only one unique non-null)", () => {
    const rounds = [
      makeRoundSnapshot({ methodologyVersion: "2.0.0" }),
      makeRoundSnapshot({ methodologyVersion: null }),
      makeRoundSnapshot({ methodologyVersion: null }),
    ];
    expect(hasMethodologyMix(rounds)).toBe(false);
  });

  it("returns true for two different non-null versions even with nulls", () => {
    const rounds = [
      makeRoundSnapshot({ methodologyVersion: "2.0.0" }),
      makeRoundSnapshot({ methodologyVersion: null }),
      makeRoundSnapshot({ methodologyVersion: "3.0.0" }),
    ];
    expect(hasMethodologyMix(rounds)).toBe(true);
  });
});
