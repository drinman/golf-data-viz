// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { HistoryEmptyState } from "@/app/(tools)/strokes-gained/history/_components/history-empty-state";

vi.mock("@/lib/analytics/client", () => ({
  trackEvent: vi.fn(),
}));

describe("HistoryEmptyState", () => {
  afterEach(cleanup);

  it("renders empty state heading", () => {
    render(<HistoryEmptyState />);
    expect(screen.getByText("No rounds yet")).toBeInTheDocument();
  });

  it("shows Log a Round CTA linking to strokes-gained with from=history", () => {
    render(<HistoryEmptyState />);
    const link = screen.getByTestId("empty-state-cta");
    expect(link).toHaveAttribute("href", "/strokes-gained?from=history");
    expect(link).toHaveTextContent("Log a Round");
  });

  it("renders updated body copy", () => {
    render(<HistoryEmptyState />);
    expect(
      screen.getByText("Log your first round to start tracking strokes gained over time.")
    ).toBeInTheDocument();
  });
});
