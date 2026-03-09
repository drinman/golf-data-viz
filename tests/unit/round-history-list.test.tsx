// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { RoundHistoryList } from "@/app/(tools)/strokes-gained/history/_components/round-history-list";
import { makeRoundSnapshot } from "../fixtures/factories";

vi.mock("@/lib/analytics/client", () => ({
  trackEvent: vi.fn(),
}));

describe("RoundHistoryList", () => {
  afterEach(cleanup);

  it("renders correct number of cards", () => {
    const rounds = [
      makeRoundSnapshot({ roundId: "r1" }),
      makeRoundSnapshot({ roundId: "r2" }),
      makeRoundSnapshot({ roundId: "r3" }),
    ];

    render(<RoundHistoryList rounds={rounds} />);

    const cards = screen.getAllByTestId("round-history-card");
    expect(cards).toHaveLength(3);
  });

  it("renders heading", () => {
    render(<RoundHistoryList rounds={[makeRoundSnapshot()]} />);
    expect(screen.getByText("Round History")).toBeInTheDocument();
  });

  it("displays course name and score in cards", () => {
    render(
      <RoundHistoryList
        rounds={[makeRoundSnapshot({ courseName: "Pine Valley", score: 92 })]}
      />
    );
    expect(screen.getByText("Pine Valley")).toBeInTheDocument();
    expect(screen.getByText(/Score: 92/)).toBeInTheDocument();
  });

  it("shows positive SG with + prefix", () => {
    render(
      <RoundHistoryList rounds={[makeRoundSnapshot({ sgTotal: 2.3 })]} />
    );
    expect(screen.getByText("+2.3")).toBeInTheDocument();
  });

  it("shows negative SG", () => {
    render(
      <RoundHistoryList rounds={[makeRoundSnapshot({ sgTotal: -1.5 })]} />
    );
    // The format is "-1.5" (toFixed(1))
    expect(screen.getByText("-1.5")).toBeInTheDocument();
  });
});
