// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { SgTrendChart } from "@/app/(tools)/strokes-gained/history/_components/sg-trend-chart";
import type { TrendSeries, RoundSgSnapshot } from "@/lib/golf/trends";

vi.mock("@/lib/analytics/client", () => ({
  trackEvent: vi.fn(),
}));

// Mock Nivo ResponsiveLine — it requires a real DOM/SVG context we can't provide in jsdom
vi.mock("@nivo/line", () => ({
  ResponsiveLine: () => <div data-testid="nivo-line-mock" />,
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

describe("SgTrendChart", () => {
  afterEach(cleanup);

  it("shows minimum rounds message when fewer than 3 rounds", () => {
    const rounds = [makeSnapshot(), makeSnapshot({ roundId: "r2" })];

    render(<SgTrendChart series={[]} rounds={rounds} />);

    expect(screen.getByTestId("trend-chart-min-rounds")).toBeInTheDocument();
    expect(
      screen.getByText(/Enter a few more rounds to see trends/i)
    ).toBeInTheDocument();
  });

  it("renders chart when 3+ rounds provided", () => {
    const rounds = [
      makeSnapshot({ roundId: "r1", playedAt: "2026-03-01" }),
      makeSnapshot({ roundId: "r2", playedAt: "2026-03-08" }),
      makeSnapshot({ roundId: "r3", playedAt: "2026-03-15" }),
    ];
    const series: TrendSeries[] = [
      {
        id: "off-the-tee",
        color: "#2563eb",
        data: [
          { x: "Round 1", y: 0.3 },
          { x: "Round 2", y: 0.5 },
          { x: "Round 3", y: 0.2 },
        ],
      },
    ];

    render(<SgTrendChart series={series} rounds={rounds} />);

    expect(screen.getByTestId("sg-trend-chart")).toBeInTheDocument();
    expect(screen.queryByTestId("trend-chart-min-rounds")).not.toBeInTheDocument();
  });
});
