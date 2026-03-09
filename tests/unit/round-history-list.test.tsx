// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { RoundHistoryList } from "@/app/(tools)/strokes-gained/history/_components/round-history-list";
import type { RoundSgSnapshot } from "@/lib/golf/trends";

vi.mock("@/lib/analytics/client", () => ({
  trackEvent: vi.fn(),
}));

function makeSnapshot(
  overrides: Partial<RoundSgSnapshot> = {}
): RoundSgSnapshot {
  return {
    roundId: "r1",
    playedAt: "2026-03-01",
    courseName: "Test Course",
    score: 87,
    handicapIndex: 14.3,
    sgTotal: -1.5,
    sgOffTheTee: 0.3,
    sgApproach: -0.8,
    sgAroundTheGreen: -0.5,
    sgPutting: -0.5,
    methodologyVersion: "2.0.0",
    benchmarkBracket: "10-15",
    ...overrides,
  };
}

describe("RoundHistoryList", () => {
  afterEach(cleanup);

  it("renders correct number of cards", () => {
    const rounds = [
      makeSnapshot({ roundId: "r1" }),
      makeSnapshot({ roundId: "r2" }),
      makeSnapshot({ roundId: "r3" }),
    ];

    render(<RoundHistoryList rounds={rounds} />);

    const cards = screen.getAllByTestId("round-history-card");
    expect(cards).toHaveLength(3);
  });

  it("renders heading", () => {
    render(<RoundHistoryList rounds={[makeSnapshot()]} />);
    expect(screen.getByText("Round History")).toBeInTheDocument();
  });

  it("displays course name and score in cards", () => {
    render(
      <RoundHistoryList
        rounds={[makeSnapshot({ courseName: "Pine Valley", score: 92 })]}
      />
    );
    expect(screen.getByText("Pine Valley")).toBeInTheDocument();
    expect(screen.getByText(/Score: 92/)).toBeInTheDocument();
  });

  it("shows positive SG with + prefix", () => {
    render(
      <RoundHistoryList rounds={[makeSnapshot({ sgTotal: 2.3 })]} />
    );
    expect(screen.getByText("+2.3")).toBeInTheDocument();
  });

  it("shows negative SG", () => {
    render(
      <RoundHistoryList rounds={[makeSnapshot({ sgTotal: -1.5 })]} />
    );
    // The format is "-1.5" (toFixed(1))
    expect(screen.getByText("-1.5")).toBeInTheDocument();
  });
});
