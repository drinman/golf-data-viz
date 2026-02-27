import { describe, it, expect, vi, beforeEach } from "vitest";
import type { RoundInput, StrokesGainedResult } from "@/lib/golf/types";

// --- Mock Supabase ---

const { mockInsert, mockGetUser } = vi.hoisted(() => ({
  mockInsert: vi.fn(),
  mockGetUser: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    from: vi.fn(() => ({
      insert: mockInsert,
    })),
    auth: {
      getUser: mockGetUser,
    },
  }),
}));

import { saveRound } from "@/app/(tools)/strokes-gained/actions";

// --- Factories ---

function makeRound(overrides: Partial<RoundInput> = {}): RoundInput {
  return {
    course: "Test Course",
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
    ...overrides,
  };
}

function makeSGResult(): StrokesGainedResult {
  return {
    total: -1.5,
    categories: {
      "off-the-tee": 0.3,
      approach: -0.8,
      "around-the-green": -0.5,
      putting: -0.5,
    },
    benchmarkBracket: "10-15",
  };
}

// --- Tests ---

describe("saveRound server action", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: anonymous user (no session)
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    // Default: successful insert
    mockInsert.mockResolvedValue({ error: null });
  });

  it("returns { success: true } on successful insert", async () => {
    const result = await saveRound(makeRound(), makeSGResult());
    expect(result).toEqual({ success: true });
  });

  it("returns { success: false, error } when Supabase returns an error", async () => {
    mockInsert.mockResolvedValue({
      error: { message: "check constraint violated", code: "23514" },
    });

    const result = await saveRound(makeRound(), makeSGResult());
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("check constraint violated");
    }
  });

  it("returns { success: false, error } when insert throws", async () => {
    mockInsert.mockRejectedValue(new Error("Network failure"));

    const result = await saveRound(makeRound(), makeSGResult());
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Network failure");
    }
  });

  it("passes mapped snake_case data to supabase insert", async () => {
    await saveRound(
      makeRound({ course: "Pebble Beach", date: "2026-01-15" }),
      makeSGResult()
    );

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        course_name: "Pebble Beach",
        played_at: "2026-01-15",
        handicap_index: 14.3,
        user_id: null,
      })
    );
  });

  it("sets user_id from auth.getUser() when authenticated", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-abc-123" } },
      error: null,
    });

    await saveRound(makeRound(), makeSGResult());

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "user-abc-123",
      })
    );
  });

  it("explicitly sets user_id to null when anonymous", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });

    await saveRound(makeRound(), makeSGResult());

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: null,
      })
    );
  });

  it("rejects invalid input with server-side Zod validation", async () => {
    const invalidRound = makeRound({
      score: 999, // out of range (50-150)
    });

    const result = await saveRound(invalidRound, makeSGResult());
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/score/i);
    }
    // Should not reach Supabase
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("rejects input where scoring breakdown does not total 18", async () => {
    const invalidRound = makeRound({
      eagles: 0,
      birdies: 1,
      pars: 7,
      bogeys: 7,
      doubleBogeys: 2,
      triplePlus: 0, // sums to 17, not 18
    });

    const result = await saveRound(invalidRound, makeSGResult());
    expect(result.success).toBe(false);
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("inserts parsed.data (coerced/sanitized), not raw input", async () => {
    // Simulate form-like payload with string numbers and blank optional
    const rawInput = {
      course: "Test Course",
      date: "2026-02-26",
      score: "87" as unknown as number, // string, schema will coerce to number
      handicapIndex: "14.3" as unknown as number,
      courseRating: "72.0" as unknown as number,
      slopeRating: "130" as unknown as number,
      fairwaysHit: "7" as unknown as number,
      fairwayAttempts: "14" as unknown as number,
      greensInRegulation: "6" as unknown as number,
      totalPutts: "33" as unknown as number,
      penaltyStrokes: "2" as unknown as number,
      eagles: "0" as unknown as number,
      birdies: "1" as unknown as number,
      pars: "7" as unknown as number,
      bogeys: "7" as unknown as number,
      doubleBogeys: "2" as unknown as number,
      triplePlus: "1" as unknown as number,
      threePutts: "" as unknown as number, // blank → schema coerces to undefined → mapper maps to null
    } as RoundInput;

    await saveRound(rawInput, makeSGResult());

    // The insert should receive coerced numbers, not strings
    const insertedRow = mockInsert.mock.calls[0][0];
    expect(typeof insertedRow.score).toBe("number");
    expect(insertedRow.score).toBe(87);
    expect(typeof insertedRow.handicap_index).toBe("number");
    expect(insertedRow.handicap_index).toBe(14.3);
    // Blank optional should become null (not empty string)
    expect(insertedRow.three_putts).toBeNull();
  });
});
