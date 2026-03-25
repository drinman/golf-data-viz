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

  it("renders improving mover with brand styling", () => {
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
    // Card border/bg
    expect(card.className).toContain("brand");
    // Icon container
    const iconContainer = card.querySelector("[class*='rounded-lg']");
    expect(iconContainer?.className).toContain("bg-brand-100");
    // Icon SVG
    const icon = iconContainer?.querySelector("svg");
    expect(icon?.getAttribute("class")).toContain("text-data-positive");
    // Heading
    const heading = screen.getByText("Biggest Mover: Approach");
    expect(heading.className).toContain("text-neutral-950");
    // Body
    const body = screen.getByText(
      "Your approach game has shown recent improvement."
    );
    expect(body.className).toContain("text-neutral-600");
  });

  it("renders declining mover with negative styling", () => {
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
    // Card border/bg
    expect(card.className).toContain("red");
    // Icon container
    const iconContainer = card.querySelector("[class*='rounded-lg']");
    expect(iconContainer?.className).toContain("bg-red-100");
    // Icon SVG
    const icon = iconContainer?.querySelector("svg");
    expect(icon?.getAttribute("class")).toContain("text-data-negative");
    // Heading
    const heading = screen.getByText("Biggest Mover: Putting");
    expect(heading.className).toContain("text-neutral-950");
    // Body
    const body = screen.getByText(
      "Your putting has declined over recent rounds."
    );
    expect(body.className).toContain("text-neutral-600");
  });
});
