// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import { HistoryDashboard } from "@/app/(tools)/strokes-gained/history/_components/history-dashboard";
import { makeRoundSnapshot } from "../fixtures/factories";
import type { ViewerEntitlements } from "@/lib/billing/entitlements";

const { mockTrackEvent } = vi.hoisted(() => ({
  mockTrackEvent: vi.fn(),
}));

vi.mock("@/lib/analytics/client", () => ({
  trackEvent: mockTrackEvent,
}));

vi.mock("@nivo/line", () => ({
  ResponsiveLine: () => <div data-testid="nivo-line-mock" />,
}));

const freeEntitlements: ViewerEntitlements = {
  status: "free",
  canGenerateLessonReports: false,
  canViewExistingLessonReports: false,
  expiresAt: null,
  inGracePeriod: false,
};

describe("HistoryDashboard", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("renders the empty variant for zero rounds", async () => {
    render(<HistoryDashboard rounds={[]} entitlements={freeEntitlements} />);

    expect(screen.getByTestId("history-empty-state")).toBeInTheDocument();
    expect(screen.getByText("No rounds yet")).toBeInTheDocument();

    await waitFor(() => {
      expect(mockTrackEvent).toHaveBeenCalledWith("history_page_viewed", {
        round_count: 0,
        dashboard_variant: "empty",
      });
    });
  });

  it("renders the starter variant for one round", async () => {
    render(
      <HistoryDashboard
        rounds={[makeRoundSnapshot({ roundId: "r1", score: 84, courseName: "Torrey Pines" })]}
        entitlements={freeEntitlements}
      />
    );

    expect(screen.getByText("Baseline established")).toBeInTheDocument();
    expect(screen.getByText(/The trend chart needs 3 rounds/)).toBeInTheDocument();
    expect(
      screen.getByText(/\d more rounds? until you can turn your data into a coach-ready lesson prep report/)
    ).toBeInTheDocument();
    expect(screen.getByText("Torrey Pines")).toBeInTheDocument();

    await waitFor(() => {
      expect(mockTrackEvent).toHaveBeenCalledWith("history_page_viewed", {
        round_count: 1,
        dashboard_variant: "starter",
      });
    });
  });

  it("renders the starter variant for two rounds", async () => {
    render(
      <HistoryDashboard
        rounds={[
          makeRoundSnapshot({ roundId: "r1", score: 84 }),
          makeRoundSnapshot({ roundId: "r2", score: 88, playedAt: "2026-03-08" }),
        ]}
        entitlements={freeEntitlements}
      />
    );

    expect(screen.getByText("Comparison started")).toBeInTheDocument();
    expect(screen.getByText(/The trend chart needs 3 rounds/)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Preview lesson prep flow" })
    ).toHaveAttribute("href", "/strokes-gained/lesson-prep");

    await waitFor(() => {
      expect(mockTrackEvent).toHaveBeenCalledWith("history_page_viewed", {
        round_count: 2,
        dashboard_variant: "starter",
      });
    });
  });

  it("renders the full variant for three or more rounds", async () => {
    render(
      <HistoryDashboard
        rounds={[
          makeRoundSnapshot({ roundId: "r1", playedAt: "2026-03-01" }),
          makeRoundSnapshot({ roundId: "r2", playedAt: "2026-03-08" }),
          makeRoundSnapshot({ roundId: "r3", playedAt: "2026-03-15" }),
        ]}
        entitlements={freeEntitlements}
      />
    );

    expect(screen.getByText("SG Trends")).toBeInTheDocument();
    expect(screen.getByTestId("nivo-line-mock")).toBeInTheDocument();
    expect(screen.getByText("See What Premium Unlocks")).toBeInTheDocument();

    await waitFor(() => {
      expect(mockTrackEvent).toHaveBeenCalledWith("history_page_viewed", {
        round_count: 3,
        dashboard_variant: "full",
      });
    });
  });
});
