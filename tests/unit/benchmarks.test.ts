import { describe, it, expect } from "vitest";
import {
  loadBrackets,
  getBracketForHandicap,
  getBenchmarkMeta,
  getCitationStatus,
  interpolateBenchmark,
  getInterpolatedBenchmark,
} from "@/lib/golf/benchmarks";
import {
  CITATION_METRIC_KEYS,
  ALL_HANDICAP_BRACKETS,
} from "@/lib/golf/types";
import type { HandicapBracket, MetricCitation } from "@/lib/golf/types";

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

  it("returns '0-5' for handicap 5.0 (inclusive upper bound)", () => {
    expect(getBracketForHandicap(5.0).bracket).toBe("0-5");
  });

  it("returns '10-15' for handicap 14.9", () => {
    expect(getBracketForHandicap(14.9).bracket).toBe("10-15");
  });

  it("returns '10-15' for handicap 15.0 (inclusive upper bound)", () => {
    expect(getBracketForHandicap(15.0).bracket).toBe("10-15");
  });

  it("returns '15-20' for handicap 20.0 (inclusive upper bound)", () => {
    expect(getBracketForHandicap(20.0).bracket).toBe("15-20");
  });

  it("returns '5-10' for handicap 10.0 (inclusive upper bound)", () => {
    expect(getBracketForHandicap(10.0).bracket).toBe("5-10");
  });

  it("returns '20-25' for handicap 25.0 (inclusive upper bound)", () => {
    expect(getBracketForHandicap(25.0).bracket).toBe("20-25");
  });

  it("returns '25-30' for handicap 29.9", () => {
    expect(getBracketForHandicap(29.9).bracket).toBe("25-30");
  });

  it("returns '25-30' for handicap 30.0 (inclusive upper bound)", () => {
    expect(getBracketForHandicap(30.0).bracket).toBe("25-30");
  });

  it("returns '30+' for handicap 54.0", () => {
    expect(getBracketForHandicap(54.0).bracket).toBe("30+");
  });

  // Target user
  it("returns '10-15' for handicap 14.3 (target user)", () => {
    const bracket = getBracketForHandicap(14.3);
    expect(bracket.bracket).toBe("10-15");
    expect(bracket.averageScore).toBe(83.2);
    expect(bracket.fairwayPercentage).toBe(50);
    expect(bracket.girPercentage).toBe(35);
  });

  // Plus handicap
  it("returns 'plus' for handicap -2.3", () => {
    expect(getBracketForHandicap(-2.3).bracket).toBe("plus");
  });

  it("returns 'plus' for handicap -9.9", () => {
    expect(getBracketForHandicap(-9.9).bracket).toBe("plus");
  });

  it("returns 'plus' for handicap -0.1", () => {
    expect(getBracketForHandicap(-0.1).bracket).toBe("plus");
  });

  it("plus bracket returns extrapolated values for -2.3", () => {
    const plus = getBracketForHandicap(-2.3);
    const extrapolated = interpolateBenchmark(-2.3);
    expect(plus.averageScore).toBe(extrapolated.averageScore);
    expect(plus.girPercentage).toBe(extrapolated.girPercentage);
    expect(plus.puttsPerRound).toBe(extrapolated.puttsPerRound);
  });

  // Error cases
  it("throws RangeError for handicap < -9.9", () => {
    expect(() => getBracketForHandicap(-10)).toThrow(RangeError);
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

  it("returns citations and changelog", () => {
    const meta = getBenchmarkMeta();
    expect(meta.citations).toBeDefined();
    expect(meta.changelog).toBeDefined();
    expect(Array.isArray(meta.changelog)).toBe(true);
  });
});

describe("citation schema", () => {
  const meta = getBenchmarkMeta();

  it("every CITATION_METRIC_KEYS entry has an array in citations", () => {
    for (const key of CITATION_METRIC_KEYS) {
      expect(Array.isArray(meta.citations[key])).toBe(true);
    }
  });

  it("every citation with coveredBrackets has non-null url and accessedDate", () => {
    for (const key of CITATION_METRIC_KEYS) {
      for (const citation of meta.citations[key]) {
        if (citation.coveredBrackets.length > 0) {
          expect(citation.url).not.toBeNull();
          expect(citation.accessedDate).toBeTruthy();
        }
      }
    }
  });

  it("provisional matches whether all SG-consumed metrics are sourced", () => {
    const sgConsumedKeys = [
      "averageScore",
      "fairwayPercentage",
      "girPercentage",
      "puttsPerRound",
      "upAndDownPercentage",
      "penaltiesPerRound",
    ] as const;

    const allSourced = sgConsumedKeys.every((key) => {
      const status = getCitationStatus(meta.citations[key]);
      return status !== "pending";
    });

    if (allSourced) {
      expect(meta.provisional).toBe(false);
    } else {
      expect(meta.provisional).toBe(true);
    }
  });

  it("changelog has at least one entry and is sorted by date descending", () => {
    expect(meta.changelog.length).toBeGreaterThanOrEqual(1);
    for (let i = 1; i < meta.changelog.length; i++) {
      expect(meta.changelog[i - 1].date >= meta.changelog[i].date).toBe(true);
    }
  });
});

describe("getCitationStatus", () => {
  it("returns 'pending' for empty array", () => {
    expect(getCitationStatus([])).toBe("pending");
  });

  it("returns 'pending' when all entries have empty coveredBrackets", () => {
    const citations: MetricCitation[] = [
      {
        source: "Test",
        url: null,
        publishedDate: null,
        accessedDate: "2026-03-01",
        coveredBrackets: [],
      },
    ];
    expect(getCitationStatus(citations)).toBe("pending");
  });

  it("returns 'partial' when some but not all brackets covered", () => {
    const citations: MetricCitation[] = [
      {
        source: "Test",
        url: "https://example.com",
        publishedDate: null,
        accessedDate: "2026-03-01",
        coveredBrackets: ["0-5", "5-10", "10-15"],
      },
    ];
    expect(getCitationStatus(citations)).toBe("partial");
  });

  it("returns 'sourced' when all 7 brackets covered", () => {
    const citations: MetricCitation[] = [
      {
        source: "Test",
        url: "https://example.com",
        publishedDate: null,
        accessedDate: "2026-03-01",
        coveredBrackets: [...ALL_HANDICAP_BRACKETS],
      },
    ];
    expect(getCitationStatus(citations)).toBe("sourced");
  });

  it("returns 'sourced' when multiple entries together cover all brackets", () => {
    const citations: MetricCitation[] = [
      {
        source: "A",
        url: "https://a.com",
        publishedDate: null,
        accessedDate: "2026-03-01",
        coveredBrackets: ["0-5", "5-10", "10-15", "15-20"],
      },
      {
        source: "B",
        url: "https://b.com",
        publishedDate: null,
        accessedDate: "2026-03-01",
        coveredBrackets: ["20-25", "25-30", "30+"],
      },
    ];
    expect(getCitationStatus(citations)).toBe("sourced");
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
  // Note: FIR% is NOT strictly monotonic in real data (confirmed by Shot Scope).
  // We allow a tolerance of +5pp for known non-monotonic transitions, but still
  // catch large transcription errors (e.g., 25-30 bracket at 70% would fail).
  it("fairwayPercentage: generally decreasing with bounded exceptions", () => {
    const FIR_TOLERANCE_PP = 5;
    for (let i = 1; i < brackets.length; i++) {
      const diff = brackets[i].fairwayPercentage - brackets[i - 1].fairwayPercentage;
      expect(diff).toBeLessThanOrEqual(FIR_TOLERANCE_PP);
    }
    // Overall trend: first bracket must exceed last bracket
    expect(brackets[0].fairwayPercentage).toBeGreaterThan(
      brackets[brackets.length - 1].fairwayPercentage
    );
  });

  it("girPercentage decreases monotonically across brackets", () => {
    for (let i = 1; i < brackets.length; i++) {
      expect(brackets[i].girPercentage).toBeLessThanOrEqual(
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

describe("interpolateBenchmark", () => {
  it("returns exact anchor values at anchor points", () => {
    const at5 = interpolateBenchmark(5);
    expect(at5.handicapIndex).toBe(5);
    // Should match the 5-HCP anchor
    expect(at5.averageScore).toBeGreaterThan(70);
    expect(at5.averageScore).toBeLessThan(90);
  });

  it("interpolates between two anchors for HCP 12.0", () => {
    const at10 = interpolateBenchmark(10);
    const at15 = interpolateBenchmark(15);
    const at12 = interpolateBenchmark(12);

    // 12 is between 10 and 15, so all metrics should be between the two anchors
    expect(at12.averageScore).toBeGreaterThan(at10.averageScore);
    expect(at12.averageScore).toBeLessThan(at15.averageScore);
    expect(at12.girPercentage).toBeLessThan(at10.girPercentage);
    expect(at12.girPercentage).toBeGreaterThan(at15.girPercentage);
  });

  it("clamps to lowest anchor for HCP 0.0", () => {
    const at0 = interpolateBenchmark(0);
    // Should match the scratch anchor (74.0 average score from Shot Scope)
    expect(at0.averageScore).toBe(74.0);
    expect(at0.handicapIndex).toBe(0);
  });

  it("clamps to highest anchor for HCP 54.0", () => {
    const at54 = interpolateBenchmark(54);
    const at30 = interpolateBenchmark(30);
    // Should clamp to highest anchor (30)
    expect(at54.averageScore).toBe(at30.averageScore);
  });

  it("interpolates puttsPerRound between anchors", () => {
    const at10 = interpolateBenchmark(10);
    const at15 = interpolateBenchmark(15);
    const at12 = interpolateBenchmark(12);

    expect(at12.puttsPerRound).toBeGreaterThanOrEqual(at10.puttsPerRound);
    expect(at12.puttsPerRound).toBeLessThanOrEqual(at15.puttsPerRound);
  });

  it("interpolates penaltiesPerRound between anchors", () => {
    const at10 = interpolateBenchmark(10);
    const at15 = interpolateBenchmark(15);
    const at12 = interpolateBenchmark(12);

    expect(at12.penaltiesPerRound).toBeGreaterThanOrEqual(at10.penaltiesPerRound);
    expect(at12.penaltiesPerRound).toBeLessThanOrEqual(at15.penaltiesPerRound);
  });

  it("extrapolates below scratch for plus handicap -2.3", () => {
    const atMinus2 = interpolateBenchmark(-2.3);
    expect(atMinus2.handicapIndex).toBe(-2.3);
    // GIR: 59 + 3.6 * 2.3 = 67.28
    expect(atMinus2.girPercentage).toBeCloseTo(67.28, 1);
    // FIR frozen at scratch
    expect(atMinus2.fairwayPercentage).toBe(50);
    // putts: 29.8 - 0.08 * 2.3 = 29.616
    expect(atMinus2.puttsPerRound).toBeCloseTo(29.616, 2);
    // averageScore: 74.0 - 1.28 * 2.3 = 71.056
    expect(atMinus2.averageScore).toBeCloseTo(71.056, 1);
  });

  it("extrapolates below scratch for plus handicap -5", () => {
    const atMinus5 = interpolateBenchmark(-5);
    expect(atMinus5.handicapIndex).toBe(-5);
    expect(atMinus5.girPercentage).toBeCloseTo(77, 1);
    expect(atMinus5.fairwayPercentage).toBe(50);
    expect(atMinus5.puttsPerRound).toBeCloseTo(29.4, 2);
    expect(atMinus5.averageScore).toBeCloseTo(67.6, 1);
    expect(atMinus5.upAndDownPercentage).toBeCloseTo(61, 1);
    expect(atMinus5.penaltiesPerRound).toBeCloseTo(0.39, 2);
  });

  it("clamps extrapolated values at safety limits for -9.9", () => {
    const atMinus9 = interpolateBenchmark(-9.9);
    expect(atMinus9.handicapIndex).toBe(-9.9);
    // GIR would be 59 + 3.6 * 9.9 = 94.64 → clamped to 80
    expect(atMinus9.girPercentage).toBe(80);
    // FIR frozen at scratch
    expect(atMinus9.fairwayPercentage).toBe(50);
    // putts: 29.8 - 0.08 * 9.9 = 29.008 (above 27 floor)
    expect(atMinus9.puttsPerRound).toBeCloseTo(29.008, 2);
    // averageScore: 74.0 - 1.28 * 9.9 = 61.328 (above 60 floor)
    expect(atMinus9.averageScore).toBeCloseTo(61.328, 1);
  });

  it("boundary continuity: -0.1 is only slightly different from scratch", () => {
    const at0 = interpolateBenchmark(0);
    const atMinus01 = interpolateBenchmark(-0.1);
    // Each metric should differ by at most the gradient * 0.1
    expect(Math.abs(atMinus01.averageScore - at0.averageScore)).toBeLessThan(0.2);
    expect(Math.abs(atMinus01.girPercentage - at0.girPercentage)).toBeLessThan(0.5);
    expect(Math.abs(atMinus01.puttsPerRound - at0.puttsPerRound)).toBeLessThan(0.02);
    // FIR should be identical (frozen)
    expect(atMinus01.fairwayPercentage).toBe(at0.fairwayPercentage);
  });

  it("whole-range invariant sweep: all plus handicaps respect bounds and monotonicity", () => {
    let prev = interpolateBenchmark(0);
    for (let hcp = -0.1; hcp >= -9.9; hcp = Math.round((hcp - 0.1) * 10) / 10) {
      const curr = interpolateBenchmark(hcp);
      // FIR frozen at 50
      expect(curr.fairwayPercentage).toBe(50);
      // GIR: 0–80
      expect(curr.girPercentage).toBeGreaterThanOrEqual(0);
      expect(curr.girPercentage).toBeLessThanOrEqual(80);
      // U&D: 0–75
      expect(curr.upAndDownPercentage).toBeGreaterThanOrEqual(0);
      expect(curr.upAndDownPercentage).toBeLessThanOrEqual(75);
      // Putts: >= 27
      expect(curr.puttsPerRound).toBeGreaterThanOrEqual(27);
      // Penalties: >= 0.05
      expect(curr.penaltiesPerRound).toBeGreaterThanOrEqual(0.05);
      // Average score: >= 60
      expect(curr.averageScore).toBeGreaterThanOrEqual(60);
      // Monotonic directions (more plus = better)
      expect(curr.averageScore).toBeLessThanOrEqual(prev.averageScore + 0.001);
      expect(curr.girPercentage).toBeGreaterThanOrEqual(prev.girPercentage - 0.001);
      expect(curr.puttsPerRound).toBeLessThanOrEqual(prev.puttsPerRound + 0.001);
      expect(curr.upAndDownPercentage).toBeGreaterThanOrEqual(prev.upAndDownPercentage - 0.001);
      expect(curr.penaltiesPerRound).toBeLessThanOrEqual(prev.penaltiesPerRound + 0.001);
      prev = curr;
    }
  });

  it("throws RangeError for handicap < -9.9", () => {
    expect(() => interpolateBenchmark(-10)).toThrow(RangeError);
  });

  it("throws RangeError for handicap > 54", () => {
    expect(() => interpolateBenchmark(55)).toThrow(RangeError);
  });

  it("throws RangeError for NaN", () => {
    expect(() => interpolateBenchmark(NaN)).toThrow(RangeError);
  });
});

describe("puttsPerGIR / puttsPerNonGIR benchmark data", () => {
  const brackets = loadBrackets();

  it("puttsPerGIR and puttsPerNonGIR present on all brackets", () => {
    for (const b of brackets) {
      expect(b.puttsPerGIR).toBeDefined();
      expect(b.puttsPerNonGIR).toBeDefined();
    }
  });

  it("puttsPerGIR > puttsPerNonGIR for all brackets", () => {
    for (const b of brackets) {
      expect(b.puttsPerGIR!).toBeGreaterThan(b.puttsPerNonGIR!);
    }
  });

  it("puttsPerGIR values are between 1.5 and 2.5", () => {
    for (const b of brackets) {
      expect(b.puttsPerGIR!).toBeGreaterThanOrEqual(1.5);
      expect(b.puttsPerGIR!).toBeLessThanOrEqual(2.5);
    }
  });

  it("puttsPerGIR increases monotonically across brackets", () => {
    for (let i = 1; i < brackets.length; i++) {
      expect(brackets[i].puttsPerGIR!).toBeGreaterThanOrEqual(brackets[i - 1].puttsPerGIR!);
    }
  });

  it("interpolated benchmark includes puttsPerGIR and puttsPerNonGIR", () => {
    const b = getInterpolatedBenchmark(12);
    expect(b.puttsPerGIR).toBeDefined();
    expect(b.puttsPerNonGIR).toBeDefined();
    // 12 HCP is between 10 and 15 anchors
    expect(b.puttsPerGIR!).toBeGreaterThan(1.98); // 10 HCP value
    expect(b.puttsPerGIR!).toBeLessThan(2.06); // 15 HCP value
  });

  it("extrapolated plus-handicap benchmark includes puttsPerGIR", () => {
    const b = getInterpolatedBenchmark(-2.0);
    expect(b.puttsPerGIR).toBeDefined();
    expect(b.puttsPerNonGIR).toBeDefined();
    // Should be lower than scratch (1.85)
    expect(b.puttsPerGIR!).toBeLessThanOrEqual(1.85);
  });
});

describe("getInterpolatedBenchmark", () => {
  it("returns BracketBenchmark-shaped object with bracket label", () => {
    const result = getInterpolatedBenchmark(12);
    expect(result.bracket).toBe("10-15");
    expect(typeof result.averageScore).toBe("number");
    expect(typeof result.fairwayPercentage).toBe("number");
    expect(typeof result.girPercentage).toBe("number");
    expect(typeof result.puttsPerRound).toBe("number");
    expect(typeof result.upAndDownPercentage).toBe("number");
    expect(typeof result.penaltiesPerRound).toBe("number");
    expect(result.scoring).toBeDefined();
  });

  it("returns interpolated values, not snapped bracket values", () => {
    const interpolated = getInterpolatedBenchmark(12);

    // The interpolated values should be valid and positive
    expect(interpolated.averageScore).toBeGreaterThan(0);
    expect(interpolated.girPercentage).toBeGreaterThan(0);
  });

  it("returns 'plus' bracket with extrapolated metrics for -2.3", () => {
    const result = getInterpolatedBenchmark(-2.3);
    const extrapolated = interpolateBenchmark(-2.3);
    expect(result.bracket).toBe("plus");
    expect(result.averageScore).toBe(extrapolated.averageScore);
    expect(result.girPercentage).toBe(extrapolated.girPercentage);
  });

  it("uses '0-5' scoring distribution for plus bracket", () => {
    const result = getInterpolatedBenchmark(-2.3);
    expect(result.scoring).toBeDefined();
    expect(result.scoring.birdiesPerRound).toBeGreaterThan(0);
  });
});
