import { describe, it, expect } from "vitest";
import {
  shouldShowTroubleContextPrompt,
  buildTroubleContextSummary,
  generateTroubleNarrative,
  validateTroubleContext,
  type TroubleHoleInput,
  type RoundTroubleContext,
} from "@/lib/golf/trouble-context";
import { makeSGResult, makeRound } from "../fixtures/factories";
import { getInterpolatedBenchmark } from "@/lib/golf/benchmarks";

describe("shouldShowTroubleContextPrompt", () => {
  it("returns true when FIR below peer AND approach_sg <= -0.5", () => {
    // 14.3 HCP peer FIR is ~50%. 5/14 = 35.7% is below.
    const input = makeRound({ fairwaysHit: 5, fairwayAttempts: 14 });
    const result = makeSGResult({
      categories: {
        "off-the-tee": 0.3,
        approach: -0.6,
        "around-the-green": 0.1,
        putting: -0.2,
      },
    });
    const benchmark = getInterpolatedBenchmark(14.3);

    expect(shouldShowTroubleContextPrompt(input, result, benchmark)).toBe(true);
  });

  it("returns true when FIR below peer AND atg_sg <= -0.5", () => {
    const input = makeRound({ fairwaysHit: 5, fairwayAttempts: 14 });
    const result = makeSGResult({
      categories: {
        "off-the-tee": 0.3,
        approach: 0.1,
        "around-the-green": -0.6,
        putting: -0.2,
      },
    });
    const benchmark = getInterpolatedBenchmark(14.3);

    expect(shouldShowTroubleContextPrompt(input, result, benchmark)).toBe(true);
  });

  it("returns false when FIR above peer benchmark", () => {
    // 11/14 = 78.6% is well above peer FIR
    const input = makeRound({ fairwaysHit: 11, fairwayAttempts: 14 });
    const result = makeSGResult({
      categories: {
        "off-the-tee": 0.3,
        approach: -0.8,
        "around-the-green": -0.5,
        putting: -0.5,
      },
    });
    const benchmark = getInterpolatedBenchmark(14.3);

    expect(shouldShowTroubleContextPrompt(input, result, benchmark)).toBe(false);
  });

  it("returns false when FIR data missing (fairwaysHit undefined)", () => {
    const input = makeRound();
    delete input.fairwaysHit;
    const result = makeSGResult({
      categories: {
        "off-the-tee": 0.3,
        approach: -0.8,
        "around-the-green": -0.5,
        putting: -0.5,
      },
    });
    const benchmark = getInterpolatedBenchmark(14.3);

    expect(shouldShowTroubleContextPrompt(input, result, benchmark)).toBe(false);
  });

  it("returns false when fairwayAttempts is 0", () => {
    const input = makeRound({ fairwaysHit: 0, fairwayAttempts: 0 });
    const result = makeSGResult({
      categories: {
        "off-the-tee": 0.3,
        approach: -0.8,
        "around-the-green": -0.5,
        putting: -0.5,
      },
    });
    const benchmark = getInterpolatedBenchmark(14.3);

    expect(shouldShowTroubleContextPrompt(input, result, benchmark)).toBe(false);
  });

  it("returns false when both approach and ATG are above -0.5", () => {
    const input = makeRound({ fairwaysHit: 5, fairwayAttempts: 14 });
    const result = makeSGResult({
      categories: {
        "off-the-tee": 0.3,
        approach: -0.2,
        "around-the-green": -0.3,
        putting: -0.5,
      },
    });
    const benchmark = getInterpolatedBenchmark(14.3);

    expect(shouldShowTroubleContextPrompt(input, result, benchmark)).toBe(false);
  });
});

describe("buildTroubleContextSummary", () => {
  it("counts correctly by cause", () => {
    const holes: TroubleHoleInput[] = [
      { holeNumber: 3, primaryCause: "tee" },
      { holeNumber: 7, primaryCause: "tee" },
      { holeNumber: 12, primaryCause: "approach" },
    ];

    const summary = buildTroubleContextSummary(holes);

    expect(summary.tee).toBe(2);
    expect(summary.approach).toBe(1);
    expect(summary.around_green).toBe(0);
    expect(summary.putting).toBe(0);
    expect(summary.penalty).toBe(0);
  });

  it("returns zeros for unused causes", () => {
    const holes: TroubleHoleInput[] = [
      { holeNumber: 5, primaryCause: "penalty" },
    ];

    const summary = buildTroubleContextSummary(holes);

    expect(summary.tee).toBe(0);
    expect(summary.approach).toBe(0);
    expect(summary.around_green).toBe(0);
    expect(summary.putting).toBe(0);
    expect(summary.penalty).toBe(1);
  });

  it("handles empty array", () => {
    const summary = buildTroubleContextSummary([]);

    expect(summary.tee).toBe(0);
    expect(summary.approach).toBe(0);
    expect(summary.around_green).toBe(0);
    expect(summary.putting).toBe(0);
    expect(summary.penalty).toBe(0);
  });
});

describe("generateTroubleNarrative", () => {
  it("2+ tee holes produces headline mentioning tee and non-null weaknessCaveat", () => {
    const context: RoundTroubleContext = {
      troubleHoles: [
        { holeNumber: 3, primaryCause: "tee" },
        { holeNumber: 7, primaryCause: "tee" },
      ],
      summary: { tee: 2, approach: 0, around_green: 0, putting: 0, penalty: 0 },
    };

    const narrative = generateTroubleNarrative(context);

    expect(narrative.headline.toLowerCase()).toContain("tee");
    expect(narrative.weaknessCaveat).not.toBeNull();
    expect(narrative.body.length).toBeGreaterThan(0);
  });

  it("1 tee hole produces softer headline and null weaknessCaveat", () => {
    const context: RoundTroubleContext = {
      troubleHoles: [{ holeNumber: 3, primaryCause: "tee" }],
      summary: { tee: 1, approach: 0, around_green: 0, putting: 0, penalty: 0 },
    };

    const narrative = generateTroubleNarrative(context);

    expect(narrative.headline.length).toBeGreaterThan(0);
    expect(narrative.weaknessCaveat).toBeNull();
  });

  it("0 tee holes (other causes) produces generic framing and null weaknessCaveat", () => {
    const context: RoundTroubleContext = {
      troubleHoles: [
        { holeNumber: 5, primaryCause: "approach" },
        { holeNumber: 10, primaryCause: "penalty" },
      ],
      summary: { tee: 0, approach: 1, around_green: 0, putting: 0, penalty: 1 },
    };

    const narrative = generateTroubleNarrative(context);

    expect(narrative.headline.length).toBeGreaterThan(0);
    expect(narrative.weaknessCaveat).toBeNull();
  });

  it("mixed causes mentions dominant cause in headline", () => {
    const context: RoundTroubleContext = {
      troubleHoles: [
        { holeNumber: 1, primaryCause: "tee" },
        { holeNumber: 5, primaryCause: "tee" },
        { holeNumber: 8, primaryCause: "tee" },
        { holeNumber: 12, primaryCause: "approach" },
      ],
      summary: { tee: 3, approach: 1, around_green: 0, putting: 0, penalty: 0 },
    };

    const narrative = generateTroubleNarrative(context);

    expect(narrative.headline.toLowerCase()).toContain("tee");
  });
});

describe("validateTroubleContext", () => {
  it("rejects holes array longer than 8", () => {
    const holes = Array.from({ length: 9 }, (_, i) => ({
      holeNumber: i + 1,
      primaryCause: "tee",
    }));
    const result = validateTroubleContext({ troubleHoles: holes });

    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("rejects hole numbers outside 1-18 (unless null)", () => {
    const result = validateTroubleContext({
      troubleHoles: [{ holeNumber: 19, primaryCause: "tee" }],
    });

    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("rejects invalid primary cause values", () => {
    const result = validateTroubleContext({
      troubleHoles: [{ holeNumber: 1, primaryCause: "invalid_cause" }],
    });

    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("accepts valid input", () => {
    const result = validateTroubleContext({
      troubleHoles: [
        { holeNumber: 3, primaryCause: "tee" },
        { holeNumber: null, primaryCause: "approach" },
      ],
    });

    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it("accepts null hole numbers (I don't remember)", () => {
    const result = validateTroubleContext({
      troubleHoles: [{ holeNumber: null, primaryCause: "penalty" }],
    });

    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it("rejects non-object input", () => {
    const result = validateTroubleContext("not an object");

    expect(result.valid).toBe(false);
  });

  it("rejects missing troubleHoles", () => {
    const result = validateTroubleContext({});

    expect(result.valid).toBe(false);
  });
});
