import { describe, it, expect } from "vitest";
import { getSampleResult, SAMPLE_ROUND } from "@/lib/golf/sample-round";

describe("sample-round", () => {
  it("getSampleResult returns deterministic output", () => {
    const a = getSampleResult();
    const b = getSampleResult();
    expect(a.result.total).toBe(b.result.total);
    expect(a.chartData).toEqual(b.chartData);
  });

  it("result.total is a finite number", () => {
    const { result } = getSampleResult();
    expect(Number.isFinite(result.total)).toBe(true);
  });

  it("result.categories has all 4 keys", () => {
    const { result } = getSampleResult();
    expect(result.categories).toHaveProperty("off-the-tee");
    expect(result.categories).toHaveProperty("approach");
    expect(result.categories).toHaveProperty("around-the-green");
    expect(result.categories).toHaveProperty("putting");
  });

  it("chartData has 4 entries with numeric player values", () => {
    const { chartData } = getSampleResult();
    expect(chartData).toHaveLength(4);
    for (const datum of chartData) {
      expect(typeof datum.player).toBe("number");
      expect(Number.isFinite(datum.player)).toBe(true);
    }
  });

  it("bracketLabel is a non-empty string", () => {
    const { bracketLabel } = getSampleResult();
    expect(typeof bracketLabel).toBe("string");
    expect(bracketLabel.length).toBeGreaterThan(0);
  });

  it("sample input sums scoring to 18", () => {
    const sum =
      SAMPLE_ROUND.eagles +
      SAMPLE_ROUND.birdies +
      SAMPLE_ROUND.pars +
      SAMPLE_ROUND.bogeys +
      SAMPLE_ROUND.doubleBogeys +
      SAMPLE_ROUND.triplePlus;
    expect(sum).toBe(18);
  });
});
