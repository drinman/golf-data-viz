// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { HistoryEmptyState } from "@/app/(tools)/strokes-gained/history/_components/history-empty-state";

describe("HistoryEmptyState", () => {
  afterEach(cleanup);

  it("renders empty state heading", () => {
    render(<HistoryEmptyState />);
    expect(screen.getByText("No rounds yet")).toBeInTheDocument();
  });

  it("shows CTA link to strokes-gained", () => {
    render(<HistoryEmptyState />);
    const link = screen.getByTestId("empty-state-cta");
    expect(link).toHaveAttribute("href", "/strokes-gained");
    expect(link).toHaveTextContent("Enter a round");
  });
});
