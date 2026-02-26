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
      upAndDownAttempts: 8,
      upAndDownConverted: 4,
      sandSaveAttempts: 3,
      sandSaves: 1,
      threePutts: 2,
    });
    expect(result.success).toBe(true);
  });

  // === Field-level validation ===
  it("rejects handicap below 0", () => {
    const result = roundInputSchema.safeParse({
      ...validInput(),
      handicapIndex: -1,
    });
    expect(result.success).toBe(false);
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
      upAndDownAttempts: "",
      upAndDownConverted: "",
      sandSaveAttempts: "",
      sandSaves: "",
      threePutts: "",
    });
    expect(result.success).toBe(true);
    if (result.success) {
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
      expect(result.data.upAndDownAttempts).toBeUndefined();
      expect(result.data.threePutts).toBeUndefined();
    }
  });

  it("accepts valid numeric values for optional fields", () => {
    const result = roundInputSchema.safeParse({
      ...validInput(),
      upAndDownAttempts: 8,
      upAndDownConverted: 4,
      threePutts: 2,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.upAndDownAttempts).toBe(8);
      expect(result.data.upAndDownConverted).toBe(4);
      expect(result.data.threePutts).toBe(2);
    }
  });

  it("coerces string numbers for optional fields", () => {
    const result = roundInputSchema.safeParse({
      ...validInput(),
      upAndDownAttempts: "8",
      upAndDownConverted: "4",
      threePutts: "2",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.upAndDownAttempts).toBe(8);
      expect(result.data.threePutts).toBe(2);
    }
  });
});
