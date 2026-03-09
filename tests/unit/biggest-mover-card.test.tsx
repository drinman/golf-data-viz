// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { BiggestMoverCard } from "@/app/(tools)/strokes-gained/history/_components/biggest-mover-card";
import type { BiggestMover } from "@/lib/golf/trends";

vi.mock("@/lib/analytics/client", () => ({
  trackEvent: vi.fn(),
}));

describe("BiggestMoverCard", () => {
  afterEach(cleanup);

  it("renders nothing when mover is null", () => {
    const { container } = render(<BiggestMoverCard mover={null} />);
    expect(container.innerHTML).toBe("");
  });

  it("renders improving mover with green styling", () => {
    const mover: BiggestMover = {
      category: "approach",
      label: "Approach",
      direction: "improving",
      delta: 0.4,
      confidence: "recent_movement",
      copyText: "Your approach game has shown recent improvement.",
    };

    render(<BiggestMoverCard mover={mover} />);

    const card = screen.getByTestId("biggest-mover-card");
    expect(card).toBeInTheDocument();
    expect(card.className).toContain("green");
    expect(screen.getByText("Biggest Mover: Approach")).toBeInTheDocument();
    expect(
      screen.getByText("Your approach game has shown recent improvement.")
    ).toBeInTheDocument();
  });

  it("renders declining mover with amber styling", () => {
    const mover: BiggestMover = {
      category: "putting",
      label: "Putting",
      direction: "declining",
      delta: -0.3,
      confidence: "emerging_pattern",
      copyText: "Your putting has declined over recent rounds.",
    };

    render(<BiggestMoverCard mover={mover} />);

    const card = screen.getByTestId("biggest-mover-card");
    expect(card.className).toContain("amber");
    expect(screen.getByText("Biggest Mover: Putting")).toBeInTheDocument();
  });
});
