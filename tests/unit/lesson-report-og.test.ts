import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockGetLessonReportByShareToken } = vi.hoisted(() => ({
  mockGetLessonReportByShareToken: vi.fn(),
}));

vi.mock("@/lib/golf/round-queries", () => ({
  getLessonReportByShareToken: mockGetLessonReportByShareToken,
}));

import { GET } from "@/app/(tools)/strokes-gained/shared/report/[token]/og/route";
import {
  buildLessonReportData,
  LESSON_REPORT_VERSION,
} from "@/lib/golf/lesson-report";
import { makeDetailSnapshot } from "../fixtures/factories";

describe("shared lesson report OG route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders a PNG for a valid lesson report share token", async () => {
    const reportData = buildLessonReportData([
      makeDetailSnapshot({
        roundId: "round-1",
        playedAt: "2026-03-01",
        sgTotal: -0.4,
        sgApproach: -0.5,
      }),
      makeDetailSnapshot({
        roundId: "round-2",
        playedAt: "2026-03-04",
        sgTotal: -0.8,
        sgApproach: -0.7,
      }),
      makeDetailSnapshot({
        roundId: "round-3",
        playedAt: "2026-03-08",
        sgTotal: -0.2,
        sgApproach: -0.3,
      }),
    ]);

    mockGetLessonReportByShareToken.mockResolvedValue({
      id: "report-1",
      userId: "user-1",
      selectedRoundIds: ["round-1", "round-2", "round-3"],
      selectionHash: "selection-hash",
      roundCount: 3,
      reportVersion: LESSON_REPORT_VERSION,
      generatedAt: "2026-03-10T00:00:00.000Z",
      regeneratedAt: null,
      reportData,
    });

    const response = await GET(new Request("http://localhost/og"), {
      params: Promise.resolve({ token: "share-token" }),
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/png");
    const body = await response.arrayBuffer();
    expect(body.byteLength).toBeGreaterThan(0);
  });
});
