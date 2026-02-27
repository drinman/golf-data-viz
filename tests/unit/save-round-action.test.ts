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
      makeRound({ course: "Pebble Beach", date: "2026-06-15" }),
      makeSGResult()
    );

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        course_name: "Pebble Beach",
        played_at: "2026-06-15",
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
});
