import { describe, it, expect } from "vitest";
import {
  loadBrackets,
  getBracketForHandicap,
  getBenchmarkMeta,
} from "@/lib/golf/benchmarks";
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

describe("getBenchmarkMeta", () => {
  it("returns version, updatedAt, provisional, and sources", () => {
    const meta = getBenchmarkMeta();
    expect(typeof meta.version).toBe("string");
    expect(typeof meta.updatedAt).toBe("string");
    expect(typeof meta.provisional).toBe("boolean");
    expect(Array.isArray(meta.sources)).toBe(true);
    expect(meta.sources.length).toBeGreaterThan(0);
  });
});

describe("handicap-brackets.json sanity", () => {
  const brackets = loadBrackets();

  // Value ranges
  it("all averageScore values are between 70 and 120", () => {
    for (const b of brackets) {
      expect(b.averageScore).toBeGreaterThanOrEqual(70);
      expect(b.averageScore).toBeLessThanOrEqual(120);
    }
  });

  it("all fairwayPercentage values are between 10 and 80", () => {
    for (const b of brackets) {
      expect(b.fairwayPercentage).toBeGreaterThanOrEqual(10);
      expect(b.fairwayPercentage).toBeLessThanOrEqual(80);
    }
  });

  it("all girPercentage values are between 5 and 60", () => {
    for (const b of brackets) {
      expect(b.girPercentage).toBeGreaterThanOrEqual(5);
      expect(b.girPercentage).toBeLessThanOrEqual(60);
    }
  });

  it("all puttsPerRound values are between 28 and 42", () => {
    for (const b of brackets) {
      expect(b.puttsPerRound).toBeGreaterThanOrEqual(28);
      expect(b.puttsPerRound).toBeLessThanOrEqual(42);
    }
  });

  it("all penaltiesPerRound values are between 0 and 8", () => {
    for (const b of brackets) {
      expect(b.penaltiesPerRound).toBeGreaterThanOrEqual(0);
      expect(b.penaltiesPerRound).toBeLessThanOrEqual(8);
    }
  });

  // Monotonic trends — worsen with handicap
  it("averageScore increases monotonically across brackets", () => {
    for (let i = 1; i < brackets.length; i++) {
      expect(brackets[i].averageScore).toBeGreaterThan(
        brackets[i - 1].averageScore
      );
    }
  });

  it("puttsPerRound increases monotonically across brackets", () => {
    for (let i = 1; i < brackets.length; i++) {
      expect(brackets[i].puttsPerRound).toBeGreaterThanOrEqual(
        brackets[i - 1].puttsPerRound
      );
    }
  });

  it("penaltiesPerRound increases monotonically across brackets", () => {
    for (let i = 1; i < brackets.length; i++) {
      expect(brackets[i].penaltiesPerRound).toBeGreaterThanOrEqual(
        brackets[i - 1].penaltiesPerRound
      );
    }
  });

  // Monotonic trends — improve with handicap (decrease)
  it("fairwayPercentage decreases monotonically across brackets", () => {
    for (let i = 1; i < brackets.length; i++) {
      expect(brackets[i].fairwayPercentage).toBeLessThan(
        brackets[i - 1].fairwayPercentage
      );
    }
  });

  it("girPercentage decreases monotonically across brackets", () => {
    for (let i = 1; i < brackets.length; i++) {
      expect(brackets[i].girPercentage).toBeLessThan(
        brackets[i - 1].girPercentage
      );
    }
  });

  it("upAndDownPercentage decreases monotonically across brackets", () => {
    for (let i = 1; i < brackets.length; i++) {
      expect(brackets[i].upAndDownPercentage).toBeLessThan(
        brackets[i - 1].upAndDownPercentage
      );
    }
  });

  // Scoring sanity
  it("scoring distribution sums to 18 holes (±0.5) for each bracket", () => {
    for (const b of brackets) {
      const sum =
        b.scoring.eaglesPerRound +
        b.scoring.birdiesPerRound +
        b.scoring.parsPerRound +
        b.scoring.bogeysPerRound +
        b.scoring.doublesPerRound +
        b.scoring.triplePlusPerRound;
      expect(sum).toBeGreaterThanOrEqual(17.5);
      expect(sum).toBeLessThanOrEqual(18.5);
    }
  });

  it("birdiesPerRound decreases monotonically across brackets", () => {
    for (let i = 1; i < brackets.length; i++) {
      expect(brackets[i].scoring.birdiesPerRound).toBeLessThanOrEqual(
        brackets[i - 1].scoring.birdiesPerRound
      );
    }
  });
});
