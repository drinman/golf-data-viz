import { describe, it, expect } from "vitest";
import { reconcileCategories } from "@/lib/golf/reconciliation";
import type { StrokesGainedCategory, ConfidenceLevel } from "@/lib/golf/types";

const allCategories: StrokesGainedCategory[] = [
  "off-the-tee",
  "approach",
  "around-the-green",
  "putting",
];

function makeProvisionals(values: [number, number, number, number]): Record<StrokesGainedCategory, number> {
  return {
    "off-the-tee": values[0],
    approach: values[1],
    "around-the-green": values[2],
    putting: values[3],
  };
}

function makeConfidence(levels: [ConfidenceLevel, ConfidenceLevel, ConfidenceLevel, ConfidenceLevel]): Record<StrokesGainedCategory, ConfidenceLevel> {
  return {
    "off-the-tee": levels[0],
    approach: levels[1],
    "around-the-green": levels[2],
    putting: levels[3],
  };
}

describe("reconcileCategories", () => {
  it("no adjustment when sum matches anchor within tolerance", () => {
    const provisionals = makeProvisionals([1.0, 0.5, -0.5, 0.0]);
    const confidence = makeConfidence(["high", "high", "high", "high"]);
    const result = reconcileCategories(provisionals, 1.0, confidence, []);
    expect(result.gap).toBeCloseTo(0, 1);
    expect(result.scaleFactor).toBe(0);
    expect(result.flags).toEqual([]);
    // Categories unchanged
    for (const cat of allCategories) {
      expect(result.categories[cat]).toBeCloseTo(provisionals[cat], 5);
    }
  });

  it("low-confidence categories absorb more of the gap", () => {
    const provisionals = makeProvisionals([1.0, 1.0, 1.0, 1.0]); // sum=4
    const confidence = makeConfidence(["high", "high", "high", "low"]); // putting is low
    const result = reconcileCategories(provisionals, 6.0, confidence, []); // gap=+2

    // Low confidence (weight=1) gets inverseWeight=1, high (weight=3) gets inverseWeight=1/3
    // Putting should get the largest adjustment
    const puttingAdj = result.adjustments["putting"];
    const ottAdj = result.adjustments["off-the-tee"];
    expect(Math.abs(puttingAdj)).toBeGreaterThan(Math.abs(ottAdj));
  });

  it("all same confidence → uniform distribution", () => {
    const provisionals = makeProvisionals([1.0, 1.0, 1.0, 1.0]); // sum=4
    const confidence = makeConfidence(["medium", "medium", "medium", "medium"]);
    const result = reconcileCategories(provisionals, 6.0, confidence, []); // gap=+2

    // Each category should get +0.5
    for (const cat of allCategories) {
      expect(result.adjustments[cat]).toBeCloseTo(0.5, 5);
    }
  });

  it("skipped categories excluded from reconciliation", () => {
    const provisionals = makeProvisionals([1.0, 1.0, 0.0, 1.0]); // sum of non-skipped=3
    const confidence = makeConfidence(["high", "high", "high", "high"]);
    const result = reconcileCategories(provisionals, 4.0, confidence, ["around-the-green"]);

    // ATG stays at 0 and gets no adjustment
    expect(result.categories["around-the-green"]).toBe(0);
    expect(result.adjustments["around-the-green"]).toBe(0);

    // Other three categories absorb the gap
    const nonSkippedSum = result.categories["off-the-tee"] + result.categories["approach"] + result.categories["putting"];
    expect(nonSkippedSum).toBeCloseTo(4.0, 1);
  });

  it("excessive_scaling flag triggers at >50%", () => {
    const provisionals = makeProvisionals([0.1, 0.1, 0.1, 0.1]); // sum=0.4
    const confidence = makeConfidence(["high", "high", "high", "high"]);
    const result = reconcileCategories(provisionals, 2.0, confidence, []); // gap=1.6
    expect(result.flags).toContain("excessive_scaling");
    expect(result.scaleFactor).toBeGreaterThan(0.5);
  });

  it("no excessive_scaling flag when adjustments are small", () => {
    const provisionals = makeProvisionals([1.0, 1.0, 1.0, 1.0]); // sum=4
    const confidence = makeConfidence(["high", "high", "high", "high"]);
    const result = reconcileCategories(provisionals, 4.05, confidence, []); // tiny gap
    expect(result.flags).not.toContain("excessive_scaling");
  });

  it("zero provisional value doesn't cause division by zero", () => {
    const provisionals = makeProvisionals([1.0, 0.0, 1.0, 1.0]); // sum=3
    const confidence = makeConfidence(["high", "high", "high", "high"]);
    // Should not throw
    const result = reconcileCategories(provisionals, 4.0, confidence, []);
    expect(Number.isFinite(result.scaleFactor)).toBe(true);
    for (const cat of allCategories) {
      expect(Number.isFinite(result.categories[cat])).toBe(true);
    }
  });

  it("final values sum to anchor within tolerance", () => {
    const provisionals = makeProvisionals([1.5, -0.5, 0.8, -0.3]); // sum=1.5
    const confidence = makeConfidence(["medium", "high", "low", "high"]);
    const anchor = 3.0;
    const result = reconcileCategories(provisionals, anchor, confidence, []);

    const sum = allCategories.reduce((s, cat) => s + result.categories[cat], 0);
    expect(sum).toBeCloseTo(anchor, 1);
  });

  it("negative gap distributes correctly", () => {
    const provisionals = makeProvisionals([2.0, 2.0, 2.0, 2.0]); // sum=8
    const confidence = makeConfidence(["high", "high", "high", "high"]);
    const result = reconcileCategories(provisionals, 6.0, confidence, []); // gap=-2

    // Each adjustment should be -0.5
    for (const cat of allCategories) {
      expect(result.adjustments[cat]).toBeCloseTo(-0.5, 5);
    }
    expect(result.gap).toBeCloseTo(-2, 5);
  });

  it("preReconciliationSum is recorded correctly", () => {
    const provisionals = makeProvisionals([1.0, 2.0, 0.5, 1.5]); // sum=5
    const confidence = makeConfidence(["high", "high", "high", "high"]);
    const result = reconcileCategories(provisionals, 6.0, confidence, []);
    expect(result.preReconciliationSum).toBeCloseTo(5.0, 5);
  });
});
