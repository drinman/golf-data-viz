import { describe, it, expect } from "vitest";
import {
  findWeakestCategory,
  formatScoringBreakdown,
  buildFamiliarStats,
} from "@/lib/golf/format";
import {
  buildCompactSGRow,
  findWeakestCategoryFromResult,
} from "@/lib/golf/og-card-data";
import { makeSGResult } from "../fixtures/factories";

describe("findWeakestCategory", () => {
  it("returns the most negative category", () => {
    expect(
      findWeakestCategory({
        sgOffTheTee: -0.5,
        sgApproach: -1.2,
        sgAroundTheGreen: -0.3,
        sgPutting: 0.1,
      })
    ).toBe("Approach");
  });

  it("returns null when all values are positive", () => {
    expect(
      findWeakestCategory({
        sgOffTheTee: 0.5,
        sgApproach: 1.2,
        sgAroundTheGreen: 0.3,
        sgPutting: 0.1,
      })
    ).toBeNull();
  });

  it("returns null when all values are zero", () => {
    expect(
      findWeakestCategory({
        sgOffTheTee: 0,
        sgApproach: 0,
        sgAroundTheGreen: 0,
        sgPutting: 0,
      })
    ).toBeNull();
  });

  it("returns first category on tie (stable order)", () => {
    const result = findWeakestCategory({
      sgOffTheTee: -1.0,
      sgApproach: -1.0,
      sgAroundTheGreen: 0,
      sgPutting: 0,
    });
    // Iteration order: off-the-tee first → wins the tie
    expect(result).toBe("Off the Tee");
  });

  it("skips categories in skippedCategories", () => {
    expect(
      findWeakestCategory({
        sgOffTheTee: -2.0,
        sgApproach: -0.5,
        sgAroundTheGreen: -0.3,
        sgPutting: 0.1,
        skippedCategories: ["off-the-tee"],
      })
    ).toBe("Approach");
  });

  it("returns null when all negative categories are skipped", () => {
    expect(
      findWeakestCategory({
        sgOffTheTee: -2.0,
        sgApproach: 0.5,
        sgAroundTheGreen: 0.3,
        sgPutting: 0.1,
        skippedCategories: ["off-the-tee"],
      })
    ).toBeNull();
  });
});

describe("formatScoringBreakdown", () => {
  it("formats non-zero scoring categories", () => {
    const parts = formatScoringBreakdown({
      eagles: 0,
      birdies: 1,
      pars: 7,
      bogeys: 7,
      doubleBogeys: 2,
      triplePlus: 1,
    });
    expect(parts).toEqual(["1 birdie", "7 pars", "7 bogeys", "2 doubles", "1 triple+"]);
  });

  it("returns empty array when all zeros", () => {
    const parts = formatScoringBreakdown({
      eagles: 0,
      birdies: 0,
      pars: 0,
      bogeys: 0,
      doubleBogeys: 0,
      triplePlus: 0,
    });
    expect(parts).toEqual([]);
  });

  it("pluralizes correctly for singular values", () => {
    const parts = formatScoringBreakdown({
      eagles: 1,
      birdies: 1,
      pars: 1,
      bogeys: 1,
      doubleBogeys: 1,
      triplePlus: 1,
    });
    expect(parts).toEqual(["1 eagle", "1 birdie", "1 par", "1 bogey", "1 double", "1 triple+"]);
  });
});

describe("buildFamiliarStats", () => {
  it("builds stats from available data", () => {
    const parts = buildFamiliarStats({
      greensInRegulation: 6,
      totalPutts: 33,
      fairwaysHit: 7,
      fairwayAttempts: 14,
    });
    expect(parts).toEqual(["6 GIR", "33 putts", "7/14 fairways"]);
  });

  it("returns empty array when all null", () => {
    const parts = buildFamiliarStats({
      greensInRegulation: null,
      totalPutts: null,
      fairwaysHit: null,
      fairwayAttempts: null,
    });
    expect(parts).toEqual([]);
  });

  it("omits fairways when only one of hit/attempts is provided", () => {
    const parts = buildFamiliarStats({
      greensInRegulation: 6,
      totalPutts: null,
      fairwaysHit: 7,
      fairwayAttempts: null,
    });
    expect(parts).toEqual(["6 GIR"]);
  });

  it("prepends handicap index when provided", () => {
    const parts = buildFamiliarStats({
      handicapIndex: 14.3,
      greensInRegulation: 6,
      totalPutts: 33,
    });
    expect(parts).toEqual(["14.3 index", "6 GIR", "33 putts"]);
  });

  it("formats plus handicap with + prefix", () => {
    const parts = buildFamiliarStats({
      handicapIndex: -2.3,
      greensInRegulation: 12,
    });
    expect(parts).toEqual(["+2.3 index", "12 GIR"]);
  });

  it("omits handicap index when null", () => {
    const parts = buildFamiliarStats({
      handicapIndex: null,
      greensInRegulation: 6,
    });
    expect(parts).toEqual(["6 GIR"]);
  });
});

describe("buildCompactSGRow", () => {
  it("builds compact SG string", () => {
    const result = makeSGResult({
      categories: {
        "off-the-tee": 0.3,
        approach: -0.8,
        "around-the-green": -0.5,
        putting: -0.5,
      },
    });
    expect(buildCompactSGRow(result)).toBe("OTT +0.30  APP -0.80  ATG -0.50  PUTT -0.50");
  });

  it("skips skipped categories", () => {
    const result = makeSGResult({
      categories: {
        "off-the-tee": 0.3,
        approach: -0.8,
        "around-the-green": -0.5,
        putting: -0.5,
      },
      skippedCategories: ["around-the-green"],
    });
    expect(buildCompactSGRow(result)).toBe("OTT +0.30  APP -0.80  PUTT -0.50");
  });
});

describe("findWeakestCategoryFromResult", () => {
  it("returns weakest non-skipped category", () => {
    const result = makeSGResult({
      categories: {
        "off-the-tee": -2.0,
        approach: -0.5,
        "around-the-green": -0.3,
        putting: 0.1,
      },
      skippedCategories: ["off-the-tee"],
    });
    expect(findWeakestCategoryFromResult(result)).toBe("Approach");
  });

  it("returns null when all non-skipped are positive", () => {
    const result = makeSGResult({
      categories: {
        "off-the-tee": -2.0,
        approach: 0.5,
        "around-the-green": 0.3,
        putting: 0.1,
      },
      skippedCategories: ["off-the-tee"],
    });
    expect(findWeakestCategoryFromResult(result)).toBeNull();
  });
});
