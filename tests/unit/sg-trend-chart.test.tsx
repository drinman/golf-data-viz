// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { SgTrendChart } from "@/app/(tools)/strokes-gained/history/_components/sg-trend-chart";
import type { TrendSeries } from "@/lib/golf/trends";
import { makeRoundSnapshot } from "../fixtures/factories";

vi.mock("@/lib/analytics/client", () => ({
  trackEvent: vi.fn(),
}));

// Mock Nivo ResponsiveLine — it requires a real DOM/SVG context we can't provide in jsdom
vi.mock("@nivo/line", () => ({
  ResponsiveLine: () => <div data-testid="nivo-line-mock" />,
}));

describe("SgTrendChart", () => {
  afterEach(cleanup);

  it("shows minimum rounds message when fewer than 3 rounds", () => {
    const rounds = [makeRoundSnapshot(), makeRoundSnapshot({ roundId: "r2" })];

    render(<SgTrendChart series={[]} rounds={rounds} />);

    expect(screen.getByTestId("trend-chart-min-rounds")).toBeInTheDocument();
    expect(
      screen.getByText(/Enter a few more rounds to see trends/i)
    ).toBeInTheDocument();
  });

  it("renders chart when 3+ rounds provided", () => {
    const rounds = [
      makeRoundSnapshot({ roundId: "r1", playedAt: "2026-03-01" }),
      makeRoundSnapshot({ roundId: "r2", playedAt: "2026-03-08" }),
      makeRoundSnapshot({ roundId: "r3", playedAt: "2026-03-15" }),
    ];
    const series: TrendSeries[] = [
      {
        id: "Off the Tee",
        color: "#2563eb",
        data: [
          { x: "1", y: 0.3 },
          { x: "2", y: 0.5 },
          { x: "3", y: 0.2 },
        ],
      },
    ];

    render(<SgTrendChart series={series} rounds={rounds} />);

    expect(screen.getByTestId("sg-trend-chart")).toBeInTheDocument();
    expect(screen.queryByTestId("trend-chart-min-rounds")).not.toBeInTheDocument();
  });

  it("renders direction label when 3+ rounds", () => {
    const rounds = [
      makeRoundSnapshot({ roundId: "r1", playedAt: "2026-03-01" }),
      makeRoundSnapshot({ roundId: "r2", playedAt: "2026-03-08" }),
      makeRoundSnapshot({ roundId: "r3", playedAt: "2026-03-15" }),
    ];
    const series: TrendSeries[] = [
      {
        id: "Off the Tee",
        color: "#2563eb",
        data: [
          { x: "1", y: 0.3 },
          { x: "2", y: 0.5 },
          { x: "3", y: 0.2 },
        ],
      },
    ];

    render(<SgTrendChart series={series} rounds={rounds} />);
    expect(screen.getByText(/Oldest → Newest/)).toBeInTheDocument();
  });

  it("does not render direction label when fewer than 3 rounds", () => {
    const rounds = [makeRoundSnapshot(), makeRoundSnapshot({ roundId: "r2" })];
    render(<SgTrendChart series={[]} rounds={rounds} />);
    expect(screen.queryByText(/Oldest → Newest/)).not.toBeInTheDocument();
  });
});
