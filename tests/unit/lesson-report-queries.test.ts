import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockCreateClient,
  mockCreateAdminClient,
  mockServerFrom,
  mockAdminFrom,
} = vi.hoisted(() => {
  const mockServerFrom = vi.fn();
  const mockAdminFrom = vi.fn();
  const mockCreateClient = vi.fn(async () => ({ from: mockServerFrom }));
  const mockCreateAdminClient = vi.fn(() => ({ from: mockAdminFrom }));

  return {
    mockCreateClient,
    mockCreateAdminClient,
    mockServerFrom,
    mockAdminFrom,
  };
});

vi.mock("@/lib/supabase/server", () => ({
  createClient: mockCreateClient,
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: mockCreateAdminClient,
}));

import {
  getLessonReportByShareToken,
  getRoundsForLessonReport,
} from "@/lib/golf/round-queries";

describe("getRoundsForLessonReport", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("filters by owner and selected ids", async () => {
    const mockOrder = vi.fn().mockResolvedValue({
      data: [
        {
          id: "round-1",
          played_at: "2026-03-01",
          course_name: "Course 1",
          score: 84,
          handicap_index: 12.4,
          sg_total: -0.2,
          sg_off_the_tee: 0.1,
          sg_approach: -0.4,
          sg_around_the_green: 0.0,
          sg_putting: 0.1,
          methodology_version: "3.1.0",
          benchmark_bracket: "10-15",
          benchmark_version: "1.0.0",
          benchmark_handicap: 12.4,
          benchmark_interpolation_mode: "standard",
          calibration_version: null,
          total_anchor_mode: "course_adjusted",
          confidence_off_the_tee: "medium",
          confidence_approach: "high",
          confidence_around_the_green: "medium",
          confidence_putting: "high",
          estimated_categories: [],
          skipped_categories: [],
          fairways_hit: 8,
          fairway_attempts: 14,
          greens_in_regulation: 7,
          up_and_down_attempts: 3,
          up_and_down_converted: 1,
        },
      ],
      error: null,
    });
    const mockIn = vi.fn(() => ({ order: mockOrder }));
    const mockEq = vi.fn(() => ({ in: mockIn }));
    const mockSelect = vi.fn(() => ({ eq: mockEq }));
    mockServerFrom.mockReturnValue({ select: mockSelect });

    const result = await getRoundsForLessonReport("user-1", ["round-1", "round-2"]);

    expect(mockServerFrom).toHaveBeenCalledWith("rounds");
    expect(mockEq).toHaveBeenCalledWith("user_id", "user-1");
    expect(mockIn).toHaveBeenCalledWith("id", ["round-1", "round-2"]);
    expect(result).toHaveLength(1);
    expect(result[0]?.roundId).toBe("round-1");
  });
});

describe("getLessonReportByShareToken", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uses the token as authorization and returns the stored report snapshot", async () => {
    const shareSingle = vi.fn().mockResolvedValue({
      data: { report_id: "report-1" },
      error: null,
    });
    const shareEq = vi.fn(() => ({ single: shareSingle }));
    const shareSelect = vi.fn(() => ({ eq: shareEq }));

    const reportSingle = vi.fn().mockResolvedValue({
      data: {
        id: "report-1",
        user_id: "user-1",
        selected_round_ids: ["round-1", "round-2", "round-3"],
        selection_hash: "hash-123",
        round_count: 3,
        report_version: "1.0.0",
        generated_at: "2026-03-10T00:00:00.000Z",
        regenerated_at: null,
        report_data: {
          reportVersion: "1.0.0",
          summary: { roundCount: 3 },
          caveats: [],
        },
      },
      error: null,
    });
    const reportEq = vi.fn(() => ({ single: reportSingle }));
    const reportSelect = vi.fn(() => ({ eq: reportEq }));

    mockAdminFrom
      .mockReturnValueOnce({ select: shareSelect })
      .mockReturnValueOnce({ select: reportSelect });

    const result = await getLessonReportByShareToken("share-token");

    expect(mockAdminFrom).toHaveBeenNthCalledWith(1, "lesson_report_shares");
    expect(mockAdminFrom).toHaveBeenNthCalledWith(2, "lesson_reports");
    expect(result?.id).toBe("report-1");
    expect(result?.reportData.summary.roundCount).toBe(3);
  });
});
