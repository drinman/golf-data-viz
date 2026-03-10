// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockTrackEvent,
  mockCreateLessonReportShareToken,
  mockGenerateLessonReport,
  mockPush,
  mockRefresh,
} = vi.hoisted(() => ({
  mockTrackEvent: vi.fn(),
  mockCreateLessonReportShareToken: vi.fn(),
  mockGenerateLessonReport: vi.fn(),
  mockPush: vi.fn(),
  mockRefresh: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
  }),
}));

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
    [key: string]: unknown;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@/components/charts/radar-chart", () => ({
  RadarChart: () => <div data-testid="mock-radar-chart" />,
}));

vi.mock("@/app/(tools)/strokes-gained/history/_components/sg-trend-chart", () => ({
  SgTrendChart: () => <div data-testid="mock-sg-trend-chart" />,
}));

vi.mock("@/app/(tools)/strokes-gained/_components/confidence-badge", () => ({
  ConfidenceBadge: ({
    level,
  }: {
    level: string;
  }) => <span>{level}</span>,
}));

vi.mock("@/lib/capture", () => ({
  captureElementAsPng: vi.fn(() => Promise.resolve(new Blob())),
  downloadBlob: vi.fn(),
}));

vi.mock("@/lib/analytics/client", () => ({
  trackEvent: mockTrackEvent,
}));

vi.mock("@/app/(tools)/strokes-gained/lesson-prep/actions", () => ({
  createLessonReportShareToken: mockCreateLessonReportShareToken,
  generateLessonReport: mockGenerateLessonReport,
}));

import type { ViewerEntitlements } from "@/lib/billing/entitlements";
import {
  buildLessonReportData,
  LESSON_REPORT_VERSION,
} from "@/lib/golf/lesson-report";
import type { LessonReportSnapshot } from "@/lib/golf/round-queries";
import { LessonReportView } from "@/app/(tools)/strokes-gained/lesson-prep/_components/lesson-report-view";
import { makeDetailSnapshot } from "../fixtures/factories";

function makeSnapshot(): LessonReportSnapshot {
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

  return {
    id: "report-1",
    userId: "user-1",
    selectedRoundIds: ["round-1", "round-2", "round-3"],
    selectionHash: "selection-hash",
    roundCount: 3,
    reportVersion: LESSON_REPORT_VERSION,
    generatedAt: "2026-03-10T00:00:00.000Z",
    regeneratedAt: null,
    reportData,
  };
}

const premiumEntitlements: ViewerEntitlements = {
  status: "premium",
  canGenerateLessonReports: true,
  canViewExistingLessonReports: true,
  expiresAt: "2026-04-10T00:00:00.000Z",
  inGracePeriod: false,
};

describe("LessonReportView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: vi.fn().mockRejectedValue(new Error("Clipboard denied")),
      },
    });
  });

  afterEach(() => {
    cleanup();
  });

  it("shows a manual fallback URL when clipboard copy fails", async () => {
    mockCreateLessonReportShareToken.mockResolvedValue({
      success: true,
      token: "share-token",
      shareUrl: "https://golfdataviz.com/strokes-gained/shared/report/share-token",
      created: true,
    });

    render(
      <LessonReportView
        snapshot={makeSnapshot()}
        entitlements={premiumEntitlements}
        surface="owner"
      />
    );

    await userEvent.click(screen.getByRole("button", { name: /copy share link/i }));

    await waitFor(() => {
      expect(
        screen.getByText(
          "Share link ready: https://golfdataviz.com/strokes-gained/shared/report/share-token"
        )
      ).toBeInTheDocument();
    });
  });
});
