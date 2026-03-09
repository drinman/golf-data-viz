import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const { mockFrom, mockCreateClient } = vi.hoisted(() => {
  const mockSelect = vi.fn();
  const mockEq = vi.fn();
  const mockOrder = vi.fn();
  const mockFrom = vi.fn();

  // Chain: from().select().eq().order()
  mockOrder.mockResolvedValue({ data: [], error: null });
  mockEq.mockReturnValue({ order: mockOrder });
  mockSelect.mockReturnValue({ eq: mockEq });
  mockFrom.mockReturnValue({ select: mockSelect });

  const mockCreateClient = vi.fn().mockResolvedValue({ from: mockFrom });

  return { mockFrom, mockCreateClient, mockSelect, mockEq, mockOrder };
});

vi.mock("@/lib/supabase/server", () => ({
  createClient: mockCreateClient,
}));

import { getUserRounds } from "@/lib/golf/round-queries";

describe("getUserRounds", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function setupMockReturn(data: unknown[] | null, error: unknown = null) {
    const mockOrder = vi.fn().mockResolvedValue({ data, error });
    const mockEq = vi.fn().mockReturnValue({ order: mockOrder });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
    mockFrom.mockReturnValue({ select: mockSelect });
    return { mockSelect, mockEq, mockOrder };
  }

  it("returns empty array when no rounds exist", async () => {
    setupMockReturn([]);

    const result = await getUserRounds("user-1");

    expect(result).toEqual([]);
  });

  it("returns empty array when data is null", async () => {
    setupMockReturn(null);

    const result = await getUserRounds("user-1");

    expect(result).toEqual([]);
  });

  it("maps snake_case DB columns to camelCase RoundSgSnapshot", async () => {
    setupMockReturn([
      {
        id: "round-abc",
        played_at: "2026-03-01",
        course_name: "Pine Valley",
        score: 82,
        handicap_index: 12.5,
        sg_total: -0.8,
        sg_off_the_tee: 0.5,
        sg_approach: -0.3,
        sg_around_the_green: -0.2,
        sg_putting: -0.8,
        methodology_version: "2.0.0",
        benchmark_bracket: "10-15",
      },
    ]);

    const result = await getUserRounds("user-1");

    expect(result).toEqual([
      {
        roundId: "round-abc",
        playedAt: "2026-03-01",
        courseName: "Pine Valley",
        score: 82,
        handicapIndex: 12.5,
        sgTotal: -0.8,
        sgOffTheTee: 0.5,
        sgApproach: -0.3,
        sgAroundTheGreen: -0.2,
        sgPutting: -0.8,
        methodologyVersion: "2.0.0",
        benchmarkBracket: "10-15",
      },
    ]);
  });

  it("defaults null SG values to 0", async () => {
    setupMockReturn([
      {
        id: "round-null",
        played_at: "2026-03-01",
        course_name: "Test Course",
        score: 90,
        handicap_index: 18.0,
        sg_total: null,
        sg_off_the_tee: null,
        sg_approach: null,
        sg_around_the_green: null,
        sg_putting: null,
        methodology_version: null,
        benchmark_bracket: null,
      },
    ]);

    const result = await getUserRounds("user-1");

    expect(result[0].sgTotal).toBe(0);
    expect(result[0].sgOffTheTee).toBe(0);
    expect(result[0].sgApproach).toBe(0);
    expect(result[0].sgAroundTheGreen).toBe(0);
    expect(result[0].sgPutting).toBe(0);
    expect(result[0].methodologyVersion).toBeNull();
    expect(result[0].benchmarkBracket).toBeNull();
  });

  it("throws when Supabase returns an error", async () => {
    setupMockReturn(null, { message: "permission denied", code: "42501" });

    await expect(getUserRounds("user-1")).rejects.toEqual(
      expect.objectContaining({ message: "permission denied" })
    );
  });

  it("queries the rounds table with correct user_id filter", async () => {
    const { mockEq } = setupMockReturn([]);

    await getUserRounds("user-xyz");

    expect(mockFrom).toHaveBeenCalledWith("rounds");
    expect(mockEq).toHaveBeenCalledWith("user_id", "user-xyz");
  });

  it("orders by played_at descending", async () => {
    const { mockOrder } = setupMockReturn([]);

    await getUserRounds("user-1");

    expect(mockOrder).toHaveBeenCalledWith("played_at", { ascending: false });
  });

  it("maps multiple rows preserving order", async () => {
    setupMockReturn([
      {
        id: "round-2",
        played_at: "2026-03-02",
        course_name: "Course B",
        score: 85,
        handicap_index: 14.0,
        sg_total: -1.0,
        sg_off_the_tee: 0.1,
        sg_approach: -0.2,
        sg_around_the_green: -0.3,
        sg_putting: -0.6,
        methodology_version: "2.0.0",
        benchmark_bracket: "10-15",
      },
      {
        id: "round-1",
        played_at: "2026-03-01",
        course_name: "Course A",
        score: 90,
        handicap_index: 14.0,
        sg_total: -2.0,
        sg_off_the_tee: -0.5,
        sg_approach: -0.5,
        sg_around_the_green: -0.5,
        sg_putting: -0.5,
        methodology_version: "2.0.0",
        benchmark_bracket: "10-15",
      },
    ]);

    const result = await getUserRounds("user-1");

    expect(result).toHaveLength(2);
    expect(result[0].roundId).toBe("round-2");
    expect(result[1].roundId).toBe("round-1");
  });
});
