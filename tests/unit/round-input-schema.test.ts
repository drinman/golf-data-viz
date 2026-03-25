import { describe, it, expect } from "vitest";
import { roundInputSchema } from "@/lib/golf/schemas";

function validInput() {
  return {
    course: "Pacifica Sharp Park",
    date: "2026-02-26",
    score: 87,
    handicapIndex: 14.3,
    courseRating: 72.0,
    slopeRating: 130,
    fairwaysHit: 7,
    fairwayAttempts: 14,
    greensInRegulation: 6,
    totalPutts: 33,
    penaltyStrokes: 2,
    eagles: 0,
    birdies: 1,
    pars: 7,
    bogeys: 7,
    doubleBogeys: 2,
    triplePlus: 1,
  };
}

describe("roundInputSchema", () => {
  // === Happy path ===
  it("accepts a valid round with all required fields", () => {
    const result = roundInputSchema.safeParse(validInput());
    expect(result.success).toBe(true);
  });

  it("accepts valid round with all optional fields", () => {
    const result = roundInputSchema.safeParse({
      ...validInput(),
      onePutts: 6,
      upAndDownAttempts: 8,
      upAndDownConverted: 4,
      sandSaveAttempts: 3,
      sandSaves: 1,
      threePutts: 2,
    });
    expect(result.success).toBe(true);
  });

  // === Field-level validation ===
  it("rejects handicap below -9.9", () => {
    const result = roundInputSchema.safeParse({
      ...validInput(),
      handicapIndex: -10,
    });
    expect(result.success).toBe(false);
  });

  it("accepts plus handicap -2.3", () => {
    const result = roundInputSchema.safeParse({
      ...validInput(),
      handicapIndex: -2.3,
    });
    expect(result.success).toBe(true);
  });

  it("accepts plus handicap -9.9", () => {
    const result = roundInputSchema.safeParse({
      ...validInput(),
      handicapIndex: -9.9,
    });
    expect(result.success).toBe(true);
  });

  it("coerces string '-2.3' to -2.3", () => {
    const result = roundInputSchema.safeParse({
      ...validInput(),
      handicapIndex: "-2.3",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.handicapIndex).toBe(-2.3);
    }
  });

  it("rejects handicap above 54", () => {
    const result = roundInputSchema.safeParse({
      ...validInput(),
      handicapIndex: 55,
    });
    expect(result.success).toBe(false);
  });

  it("rejects score below 50", () => {
    const result = roundInputSchema.safeParse({
      ...validInput(),
      score: 49,
    });
    expect(result.success).toBe(false);
  });

  it("rejects score above 150", () => {
    const result = roundInputSchema.safeParse({
      ...validInput(),
      score: 151,
    });
    expect(result.success).toBe(false);
  });

  it("rejects course rating below 60", () => {
    const result = roundInputSchema.safeParse({
      ...validInput(),
      courseRating: 59.9,
    });
    expect(result.success).toBe(false);
  });

  it("rejects slope rating above 155", () => {
    const result = roundInputSchema.safeParse({
      ...validInput(),
      slopeRating: 156,
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty course name", () => {
    const result = roundInputSchema.safeParse({
      ...validInput(),
      course: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects numeric-only course names", () => {
    const result = roundInputSchema.safeParse({
      ...validInput(),
      course: "98",
    });
    expect(result.success).toBe(false);
  });

  it("accepts course names that include letters and numbers", () => {
    const result = roundInputSchema.safeParse({
      ...validInput(),
      course: "Pinehurst No. 2",
    });
    expect(result.success).toBe(true);
  });

  it("rejects future date", () => {
    const result = roundInputSchema.safeParse({
      ...validInput(),
      date: "2027-01-01",
    });
    expect(result.success).toBe(false);
  });

  // === Cross-field validation ===
  it("rejects when scoring does not sum to 18", () => {
    const result = roundInputSchema.safeParse({
      ...validInput(),
      eagles: 0,
      birdies: 1,
      pars: 7,
      bogeys: 7,
      doubleBogeys: 2,
      triplePlus: 0, // sums to 17
    });
    expect(result.success).toBe(false);
  });

  it("rejects fairwaysHit > fairwayAttempts", () => {
    const result = roundInputSchema.safeParse({
      ...validInput(),
      fairwaysHit: 10,
      fairwayAttempts: 8,
    });
    expect(result.success).toBe(false);
  });

  it("rejects upAndDownConverted > upAndDownAttempts", () => {
    const result = roundInputSchema.safeParse({
      ...validInput(),
      upAndDownAttempts: 5,
      upAndDownConverted: 6,
    });
    expect(result.success).toBe(false);
  });

  it("rejects sandSaves > sandSaveAttempts", () => {
    const result = roundInputSchema.safeParse({
      ...validInput(),
      sandSaveAttempts: 2,
      sandSaves: 3,
    });
    expect(result.success).toBe(false);
  });

  // === Cross-field: threePutts <= totalPutts ===
  it("rejects threePutts > totalPutts", () => {
    // Use threePutts=15 (within optionalInt max of 18) but totalPutts=10
    const result = roundInputSchema.safeParse({
      ...validInput(),
      threePutts: 15,
      totalPutts: 10,
    });
    expect(result.success).toBe(false);
  });

  it("accepts threePutts <= totalPutts", () => {
    const result = roundInputSchema.safeParse({
      ...validInput(),
      threePutts: 2,
      totalPutts: 33,
    });
    expect(result.success).toBe(true);
  });

  it("rejects onePutts > totalPutts", () => {
    const result = roundInputSchema.safeParse({
      ...validInput(),
      onePutts: 34,
      totalPutts: 33,
    });
    expect(result.success).toBe(false);
  });

  it("accepts onePutts <= totalPutts", () => {
    const result = roundInputSchema.safeParse({
      ...validInput(),
      onePutts: 6,
      totalPutts: 33,
    });
    expect(result.success).toBe(true);
  });

  it("rejects onePutts + threePutts above 18", () => {
    const result = roundInputSchema.safeParse({
      ...validInput(),
      onePutts: 10,
      threePutts: 9,
    });
    expect(result.success).toBe(false);
  });

  it("accepts onePutts + threePutts at 18", () => {
    const result = roundInputSchema.safeParse({
      ...validInput(),
      onePutts: 10,
      threePutts: 8,
    });
    expect(result.success).toBe(true);
  });

  // === Invalid calendar dates ===
  // Use past-year dates so normalization produces past dates that would wrongly pass
  // the "not future" check if calendar validity isn't verified.
  it("rejects invalid calendar date (Feb 31)", () => {
    const result = roundInputSchema.safeParse({
      ...validInput(),
      date: "2025-02-31", // normalizes to 2025-03-03, which is past → must still reject
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid calendar date (Apr 31)", () => {
    const result = roundInputSchema.safeParse({
      ...validInput(),
      date: "2025-04-31", // normalizes to 2025-05-01, which is past → must still reject
    });
    expect(result.success).toBe(false);
  });

  // === Edge: par-3 course ===
  it("accepts 0 fairway attempts with 0 fairways hit", () => {
    const result = roundInputSchema.safeParse({
      ...validInput(),
      fairwaysHit: 0,
      fairwayAttempts: 0,
    });
    expect(result.success).toBe(true);
  });

  // === Coercion: string numbers from form inputs ===
  it("coerces string numbers to numbers for required fields", () => {
    const result = roundInputSchema.safeParse({
      ...validInput(),
      score: "87",
      handicapIndex: "14.3",
      courseRating: "72.0",
      slopeRating: "130",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.score).toBe(87);
      expect(result.data.handicapIndex).toBe(14.3);
    }
  });

  // === Blank optional fields ===
  it("treats empty string optional fields as undefined, not 0", () => {
    const result = roundInputSchema.safeParse({
      ...validInput(),
      onePutts: "",
      upAndDownAttempts: "",
      upAndDownConverted: "",
      sandSaveAttempts: "",
      sandSaves: "",
      threePutts: "",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.onePutts).toBeUndefined();
      expect(result.data.upAndDownAttempts).toBeUndefined();
      expect(result.data.upAndDownConverted).toBeUndefined();
      expect(result.data.sandSaveAttempts).toBeUndefined();
      expect(result.data.sandSaves).toBeUndefined();
      expect(result.data.threePutts).toBeUndefined();
    }
  });

  it("treats undefined optional fields as undefined", () => {
    const input = validInput();
    // Don't include optional fields at all
    const result = roundInputSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.onePutts).toBeUndefined();
      expect(result.data.upAndDownAttempts).toBeUndefined();
      expect(result.data.threePutts).toBeUndefined();
    }
  });

  it("accepts valid numeric values for optional fields", () => {
    const result = roundInputSchema.safeParse({
      ...validInput(),
      onePutts: 6,
      upAndDownAttempts: 8,
      upAndDownConverted: 4,
      threePutts: 2,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.onePutts).toBe(6);
      expect(result.data.upAndDownAttempts).toBe(8);
      expect(result.data.upAndDownConverted).toBe(4);
      expect(result.data.threePutts).toBe(2);
    }
  });

  // === Optional fairwaysHit / greensInRegulation ===
  it("treats empty string fairwaysHit as undefined, not 0", () => {
    const result = roundInputSchema.safeParse({
      ...validInput(),
      fairwaysHit: "",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.fairwaysHit).toBeUndefined();
    }
  });

  it("treats empty string greensInRegulation as undefined, not 0", () => {
    const result = roundInputSchema.safeParse({
      ...validInput(),
      greensInRegulation: "",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.greensInRegulation).toBeUndefined();
    }
  });

  it("accepts valid round with both fairwaysHit and GIR missing", () => {
    const input = validInput();
    delete input.fairwaysHit;
    delete input.greensInRegulation;
    const result = roundInputSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it("fairwaysHit <= fairwayAttempts refinement passes when fairwaysHit is undefined", () => {
    const result = roundInputSchema.safeParse({
      ...validInput(),
      fairwaysHit: undefined,
    });
    expect(result.success).toBe(true);
  });

  it("coerces string numbers for optional fields", () => {
    const result = roundInputSchema.safeParse({
      ...validInput(),
      onePutts: "6",
      upAndDownAttempts: "8",
      upAndDownConverted: "4",
      threePutts: "2",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.onePutts).toBe(6);
      expect(result.data.upAndDownAttempts).toBe(8);
      expect(result.data.threePutts).toBe(2);
    }
  });

  it("rejects non-numeric string for fairwaysHit", () => {
    const result = roundInputSchema.safeParse({
      ...validInput(),
      fairwaysHit: "abc",
    });
    expect(result.success).toBe(false);
  });

  it("rejects non-numeric string for greensInRegulation", () => {
    const result = roundInputSchema.safeParse({
      ...validInput(),
      greensInRegulation: "xyz",
    });
    expect(result.success).toBe(false);
  });

  it("rejects non-numeric string for other optionalInt fields", () => {
    const result = roundInputSchema.safeParse({
      ...validInput(),
      threePutts: "notanumber",
    });
    expect(result.success).toBe(false);
  });

  // === Bug fix: empty totalPutts rejected (was silently accepted as 0) ===
  it("rejects empty string totalPutts", () => {
    const result = roundInputSchema.safeParse({
      ...validInput(),
      totalPutts: "",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((entry) => entry.path[0] === "totalPutts");
      expect(issue?.message).toBe("Putts is required");
    }
  });

  it("rejects totalPutts of 0 (impossible in 18 holes)", () => {
    const result = roundInputSchema.safeParse({
      ...validInput(),
      totalPutts: 0,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((entry) => entry.path[0] === "totalPutts");
      expect(issue?.message).toBe("Putts must be at least 1");
    }
  });

  it('rejects totalPutts of "0" (string zero from form)', () => {
    const result = roundInputSchema.safeParse({
      ...validInput(),
      totalPutts: "0",
    });
    expect(result.success).toBe(false);
  });

  it("rejects totalPutts above 60 with the max-boundary message", () => {
    const result = roundInputSchema.safeParse({
      ...validInput(),
      totalPutts: 61,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((entry) => entry.path[0] === "totalPutts");
      expect(issue?.message).toBe("Putts must be at most 60");
    }
  });

  it("accepts totalPutts of 1 (edge case minimum)", () => {
    const result = roundInputSchema.safeParse({
      ...validInput(),
      totalPutts: 1,
    });
    expect(result.success).toBe(true);
  });

  // === Bug fix: empty handicapIndex rejected (was silently accepted as 0) ===
  it("rejects empty string handicapIndex", () => {
    const result = roundInputSchema.safeParse({
      ...validInput(),
      handicapIndex: "",
    });
    expect(result.success).toBe(false);
  });

  it.each([
    ["courseRating", "Course rating is required"],
    ["slopeRating", "Slope is required"],
    ["fairwayAttempts", "Fairway attempts are required"],
    ["penaltyStrokes", "Penalty strokes are required"],
  ] as const)("rejects empty string %s with the required-field message", (field, message) => {
    const result = roundInputSchema.safeParse({
      ...validInput(),
      [field]: "",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((entry) => entry.path[0] === field);
      expect(issue?.message).toBe(message);
    }
  });

  // === Bug fix: score/breakdown cross-validation ===
  it("rejects score=72 with 9 doubles + 9 triples (impossible breakdown)", () => {
    const result = roundInputSchema.safeParse({
      ...validInput(),
      score: 72,
      courseRating: 72,
      eagles: 0,
      birdies: 0,
      pars: 0,
      bogeys: 0,
      doubleBogeys: 9,
      triplePlus: 9,
    });
    expect(result.success).toBe(false);
  });

  it("rejects score=87 with 18 pars (implies par=87)", () => {
    const result = roundInputSchema.safeParse({
      ...validInput(),
      score: 87,
      courseRating: 72,
      eagles: 0,
      birdies: 0,
      pars: 18,
      bogeys: 0,
      doubleBogeys: 0,
      triplePlus: 0,
    });
    expect(result.success).toBe(false);
  });

  it("accepts valid round where score matches breakdown", () => {
    // validInput: score=87, courseRating=72, 1 birdie + 7 pars + 7 bogeys + 2 doubles + 1 triple
    // implied = -1 + 0 + 7 + 4 + 3 = 13, actual = 87-72 = 15, diff = 2
    const result = roundInputSchema.safeParse(validInput());
    expect(result.success).toBe(true);
  });

  it("accepts round with multiple triple+ blow-up holes (high-handicap edge case)", () => {
    // 25-handicapper with 4 blow-up holes (each could be +5 or +6 over par)
    // implied = 0 + 0 + 4 + 8 + 12 = 24, actual = 110-72 = 38, diff = 14
    // tolerance = 8 + 4*2 = 16, so 14 <= 16 passes
    const result = roundInputSchema.safeParse({
      ...validInput(),
      score: 110,
      handicapIndex: 25,
      courseRating: 72,
      totalPutts: 40,
      eagles: 0,
      birdies: 0,
      pars: 4,
      bogeys: 4,
      doubleBogeys: 6,
      triplePlus: 4,
    });
    expect(result.success).toBe(true);
  });
});
