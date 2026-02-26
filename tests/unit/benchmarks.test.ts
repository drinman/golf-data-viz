import { describe, it, expect } from "vitest";
import { loadBrackets, getBracketForHandicap } from "@/lib/golf/benchmarks";
import type { HandicapBracket } from "@/lib/golf/types";

describe("loadBrackets", () => {
  it("returns exactly 7 brackets", () => {
    const brackets = loadBrackets();
    expect(brackets).toHaveLength(7);
  });

  it("returns typed BracketBenchmark objects with all required fields", () => {
    const brackets = loadBrackets();
    const first = brackets[0];
    expect(first.bracket).toBe("0-5");
    expect(typeof first.averageScore).toBe("number");
    expect(typeof first.fairwayPercentage).toBe("number");
    expect(typeof first.girPercentage).toBe("number");
    expect(typeof first.puttsPerRound).toBe("number");
    expect(typeof first.upAndDownPercentage).toBe("number");
    expect(typeof first.penaltiesPerRound).toBe("number");
    expect(first.scoring).toBeDefined();
    expect(typeof first.scoring.eaglesPerRound).toBe("number");
    expect(typeof first.scoring.birdiesPerRound).toBe("number");
    expect(typeof first.scoring.parsPerRound).toBe("number");
    expect(typeof first.scoring.bogeysPerRound).toBe("number");
    expect(typeof first.scoring.doublesPerRound).toBe("number");
    expect(typeof first.scoring.triplePlusPerRound).toBe("number");
  });

  it("brackets are ordered from lowest to highest", () => {
    const brackets = loadBrackets();
    const expectedOrder: HandicapBracket[] = [
      "0-5",
      "5-10",
      "10-15",
      "15-20",
      "20-25",
      "25-30",
      "30+",
    ];
    expect(brackets.map((b) => b.bracket)).toEqual(expectedOrder);
  });
});

describe("getBracketForHandicap", () => {
  // Boundary tests
  it("returns '0-5' for handicap 0.0", () => {
    expect(getBracketForHandicap(0.0).bracket).toBe("0-5");
  });

  it("returns '0-5' for handicap 4.9", () => {
    expect(getBracketForHandicap(4.9).bracket).toBe("0-5");
  });

  it("returns '5-10' for handicap 5.0", () => {
    expect(getBracketForHandicap(5.0).bracket).toBe("5-10");
  });

  it("returns '10-15' for handicap 14.9", () => {
    expect(getBracketForHandicap(14.9).bracket).toBe("10-15");
  });

  it("returns '15-20' for handicap 15.0", () => {
    expect(getBracketForHandicap(15.0).bracket).toBe("15-20");
  });

  it("returns '20-25' for handicap 20.0", () => {
    expect(getBracketForHandicap(20.0).bracket).toBe("20-25");
  });

  it("returns '25-30' for handicap 29.9", () => {
    expect(getBracketForHandicap(29.9).bracket).toBe("25-30");
  });

  it("returns '30+' for handicap 30.0", () => {
    expect(getBracketForHandicap(30.0).bracket).toBe("30+");
  });

  it("returns '30+' for handicap 54.0", () => {
    expect(getBracketForHandicap(54.0).bracket).toBe("30+");
  });

  // Target user
  it("returns '10-15' for handicap 14.3 (target user)", () => {
    const bracket = getBracketForHandicap(14.3);
    expect(bracket.bracket).toBe("10-15");
    expect(bracket.averageScore).toBe(87.0);
    expect(bracket.fairwayPercentage).toBe(47);
    expect(bracket.girPercentage).toBe(32);
  });

  // Error cases
  it("throws RangeError for negative handicap", () => {
    expect(() => getBracketForHandicap(-1)).toThrow(RangeError);
  });

  it("throws RangeError for handicap > 54", () => {
    expect(() => getBracketForHandicap(55)).toThrow(RangeError);
  });

  it("throws RangeError for NaN", () => {
    expect(() => getBracketForHandicap(NaN)).toThrow(RangeError);
  });
});
