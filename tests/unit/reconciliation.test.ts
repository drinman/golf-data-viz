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

  it("all same confidence → Broadie-weighted distribution", () => {
    const provisionals = makeProvisionals([1.0, 1.0, 1.0, 1.0]); // sum=4
    const confidence = makeConfidence(["medium", "medium", "medium", "medium"]);
    const result = reconcileCategories(provisionals, 6.0, confidence, []); // gap=+2

    // With uniform confidence, Broadie shares determine distribution: 28/40/17/15
    expect(result.adjustments["off-the-tee"]).toBeCloseTo(2.0 * 0.28, 2);
    expect(result.adjustments["approach"]).toBeCloseTo(2.0 * 0.40, 2);
    expect(result.adjustments["around-the-green"]).toBeCloseTo(2.0 * 0.17, 2);
    expect(result.adjustments["putting"]).toBeCloseTo(2.0 * 0.15, 2);
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

  it("negative gap distributes correctly with Broadie weights", () => {
    const provisionals = makeProvisionals([2.0, 2.0, 2.0, 2.0]); // sum=8
    const confidence = makeConfidence(["high", "high", "high", "high"]);
    const result = reconcileCategories(provisionals, 6.0, confidence, []); // gap=-2

    // With uniform confidence, Broadie shares determine distribution: 28/40/17/15
    expect(result.adjustments["off-the-tee"]).toBeCloseTo(-2.0 * 0.28, 2);
    expect(result.adjustments["approach"]).toBeCloseTo(-2.0 * 0.40, 2);
    expect(result.adjustments["around-the-green"]).toBeCloseTo(-2.0 * 0.17, 2);
    expect(result.adjustments["putting"]).toBeCloseTo(-2.0 * 0.15, 2);
    expect(result.gap).toBeCloseTo(-2, 5);
  });

  it("preReconciliationSum is recorded correctly", () => {
    const provisionals = makeProvisionals([1.0, 2.0, 0.5, 1.5]); // sum=5
    const confidence = makeConfidence(["high", "high", "high", "high"]);
    const result = reconcileCategories(provisionals, 6.0, confidence, []);
    expect(result.preReconciliationSum).toBeCloseTo(5.0, 5);
  });

  it("unattributed is 0 when no sign flips", () => {
    const provisionals = makeProvisionals([1.0, 1.0, 1.0, 1.0]); // sum=4
    const confidence = makeConfidence(["high", "high", "high", "high"]);
    const result = reconcileCategories(provisionals, 5.0, confidence, []); // gap=+1
    expect(result.unattributed).toBe(0);
    expect(result.flags).not.toContain("sign_flip_prevented");
  });

  it("all-zero provisionals → Broadie-weighted distribution, no division errors", () => {
    const provisionals = makeProvisionals([0, 0, 0, 0]); // sum=0
    const confidence = makeConfidence(["high", "high", "high", "high"]);
    const result = reconcileCategories(provisionals, 2.0, confidence, []); // gap=+2

    // Should distribute via Broadie shares without any NaN or Infinity
    for (const cat of allCategories) {
      expect(Number.isFinite(result.categories[cat])).toBe(true);
    }
    // Sum should equal anchor
    const sum = allCategories.reduce((s, cat) => s + result.categories[cat], 0)
      + result.unattributed;
    expect(sum).toBeCloseTo(2.0, 1);
    // scaleFactor should be 0 (no non-zero provisionals to divide by)
    expect(Number.isFinite(result.scaleFactor)).toBe(true);
  });

  it("mixed confidence → approach absorbs more (Broadie share=40%)", () => {
    const provisionals = makeProvisionals([1.0, 1.0, 1.0, 1.0]); // sum=4
    const confidence = makeConfidence(["high", "medium", "high", "high"]);
    const result = reconcileCategories(provisionals, 6.0, confidence, []); // gap=+2
    // Approach has medium confidence (higher inverse) AND highest Broadie share (0.40)
    const approachAdj = result.adjustments["approach"];
    const ottAdj = result.adjustments["off-the-tee"];
    expect(Math.abs(approachAdj)).toBeGreaterThan(Math.abs(ottAdj));
  });
});

describe("sign-flip prevention", () => {
  it("positive provisional + negative adjustment that would flip → clamped to 0", () => {
    // Provisionals sum to +2.5, anchor is -5 → gap = -7.5
    // This huge negative gap should cause sign flips on small positive provisionals
    const provisionals = makeProvisionals([0.5, 0.5, 0.5, 1.0]);
    const confidence = makeConfidence(["medium", "high", "medium", "high"]);
    const result = reconcileCategories(provisionals, -5.0, confidence, []);

    // At least one category should be clamped to 0
    const hasClamped = allCategories.some((cat) =>
      provisionals[cat] > 0 && result.categories[cat] === 0
    );
    expect(hasClamped).toBe(true);
    expect(result.flags).toContain("sign_flip_prevented");
    // When ALL categories are clamped, unattributed holds the remainder.
    // The invariant is: sum(categories) + unattributed === anchor.
    const sum = allCategories.reduce((s, cat) => s + result.categories[cat], 0);
    expect(sum + result.unattributed).toBeCloseTo(-5.0, 5);
  });

  it("negative provisional + positive adjustment that would flip → clamped to 0", () => {
    // Provisionals sum to -2.5, anchor is +5 → gap = +7.5
    const provisionals = makeProvisionals([-0.5, -0.5, -0.5, -1.0]);
    const confidence = makeConfidence(["medium", "high", "medium", "high"]);
    const result = reconcileCategories(provisionals, 5.0, confidence, []);

    const hasClamped = allCategories.some((cat) =>
      provisionals[cat] < 0 && result.categories[cat] === 0
    );
    expect(hasClamped).toBe(true);
    expect(result.flags).toContain("sign_flip_prevented");
  });

  it("small gap, no flips → unattributed = 0", () => {
    const provisionals = makeProvisionals([1.0, 0.5, -0.5, 0.3]); // sum=1.3
    const confidence = makeConfidence(["high", "high", "high", "high"]);
    const result = reconcileCategories(provisionals, 1.5, confidence, []); // gap=+0.2
    expect(result.unattributed).toBe(0);
    expect(result.flags).not.toContain("sign_flip_prevented");
  });

  it("sum(categories) + unattributed === totalAnchor", () => {
    // Extreme case: provisionals sum positive, anchor very negative
    const provisionals = makeProvisionals([0.3, 0.5, 0.2, 0.5]);
    const confidence = makeConfidence(["medium", "high", "low", "high"]);
    const anchor = -8.0;
    const result = reconcileCategories(provisionals, anchor, confidence, []);

    const sum = allCategories.reduce((s, cat) => s + result.categories[cat], 0)
      + result.unattributed;
    expect(sum).toBeCloseTo(anchor, 1);
  });

  it("sign_flip_prevented flag appears when clamping happens", () => {
    const provisionals = makeProvisionals([0.1, 0.1, 0.1, 0.1]); // sum=0.4
    const confidence = makeConfidence(["high", "high", "high", "high"]);
    const result = reconcileCategories(provisionals, -2.0, confidence, []);
    expect(result.flags).toContain("sign_flip_prevented");
  });

  it("extreme case: redistribution preserves sign invariant and sum", () => {
    // 3 small positives + 1 negative, large negative anchor.
    // All positives flip and get clamped; redistribution goes to the negative.
    const provisionals = makeProvisionals([0.3, 0.3, 0.3, -0.1]);
    const confidence = makeConfidence(["medium", "medium", "medium", "medium"]);
    const anchor = -1.0;
    const result = reconcileCategories(provisionals, anchor, confidence, []);

    expect(result.flags).toContain("sign_flip_prevented");
    const sum = allCategories.reduce((s, cat) => s + result.categories[cat], 0);
    expect(sum + result.unattributed).toBeCloseTo(anchor, 5);
    // No category should have flipped sign from its provisional
    for (const cat of allCategories) {
      if (provisionals[cat] > 0) {
        expect(result.categories[cat]).toBeGreaterThanOrEqual(0);
      } else if (provisionals[cat] < 0) {
        expect(result.categories[cat]).toBeLessThanOrEqual(0);
      }
    }
  });

  it("categories alone sum to totalAnchor after sign-flip redistribution", () => {
    // This is the critical invariant: the displayed category breakdown must
    // add up to the displayed total, without needing to include unattributed.
    const provisionals = makeProvisionals([0.3, 0.5, 0.2, -0.1]);
    const confidence = makeConfidence(["medium", "high", "low", "medium"]);
    const anchor = -2.0;
    const result = reconcileCategories(provisionals, anchor, confidence, []);
    expect(result.flags).toContain("sign_flip_prevented");

    const sum = allCategories.reduce((s, cat) => s + result.categories[cat], 0);
    expect(sum).toBeCloseTo(anchor, 5);
    expect(result.unattributed).toBeCloseTo(0, 5);
  });
});
