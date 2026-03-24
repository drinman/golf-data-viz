// @vitest-environment jsdom

import { describe, it, expect, vi, afterEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

const mockTrackEvent = vi.fn();
vi.mock("@/lib/analytics/client", () => ({
  trackEvent: (...args: unknown[]) => mockTrackEvent(...args),
}));

// Capture RadarChart calls to verify props
const mockRadarChart = vi.fn(() => <div data-testid="mock-radar-chart" />);
vi.mock("@/components/charts/radar-chart", () => ({
  RadarChart: (props: Record<string, unknown>) => {
    mockRadarChart(props);
    return <div data-testid="mock-radar-chart" />;
  },
}));

import { InterstitialCta } from "@/app/(tools)/strokes-gained/_components/interstitial-cta";
import type { StrokesGainedResult, RadarChartDatum } from "@/lib/golf/types";

function makeSgResult(
  overrides: Partial<StrokesGainedResult["categories"]> = {},
  total?: number,
): StrokesGainedResult {
  const categories = {
    "off-the-tee": 0.5,
    approach: 0.3,
    "around-the-green": -0.2,
    putting: -0.1,
    ...overrides,
  };
  return {
    total: total ?? Object.values(categories).reduce((a, b) => a + b, 0),
    categories,
    benchmarkBracket: "10-15" as const,
    skippedCategories: [],
    estimatedCategories: [],
    confidence: {
      "off-the-tee": "high",
      approach: "high",
      "around-the-green": "medium",
      putting: "high",
    },
    methodologyVersion: "3.0.0",
    benchmarkVersion: "1.0.0",
    benchmarkHandicap: 14.3,
    diagnostics: { threePuttImpact: null },
  } as StrokesGainedResult;
}

const sampleChartData: RadarChartDatum[] = [
  { category: "Off the Tee", player: 60 },
  { category: "Approach", player: 55 },
  { category: "Around the Green", player: 45 },
  { category: "Putting", player: 48 },
];

function renderInterstitial(
  resultOverrides?: Partial<StrokesGainedResult["categories"]>,
  total?: number,
  chartData = sampleChartData,
) {
  const result = makeSgResult(resultOverrides, total);
  return render(
    <InterstitialCta
      senderHandicap={14.3}
      senderResult={result}
      senderChartData={chartData}
      bracketLabel="10–15 HCP"
      surface="token_share"
    />,
  );
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("InterstitialCta", () => {
  describe("renders", () => {
    it("renders with data-testid", () => {
      renderInterstitial();
      expect(screen.getByTestId("interstitial-cta")).toBeVisible();
    });

    it("renders two RadarChart instances", () => {
      renderInterstitial();
      expect(mockRadarChart).toHaveBeenCalledTimes(2);
    });
  });

  describe("headline logic", () => {
    it("shows weakness headline when sender has a significant weakness (< -0.5)", () => {
      renderInterstitial({ putting: -1.2 });
      expect(
        screen.getByText(/Your friend is losing .+ strokes on putting\. Where are YOU losing strokes\?/),
      ).toBeVisible();
    });

    it("shows positive headline when sender beats peers with no weakness", () => {
      renderInterstitial(
        { "off-the-tee": 1.0, approach: 0.8, "around-the-green": 0.3, putting: 0.5 },
        2.6,
      );
      expect(
        screen.getByText("Your friend is outplaying their peers. Are you?"),
      ).toBeVisible();
    });

    it("shows neutral headline when sender is near zero", () => {
      renderInterstitial(
        { "off-the-tee": 0.1, approach: -0.1, "around-the-green": 0.0, putting: 0.0 },
        0.0,
      );
      expect(
        screen.getByText("Same handicap. Different game. See yours."),
      ).toBeVisible();
    });

    it("shows negative-no-weakness headline (falls through to sentiment copy)", () => {
      renderInterstitial(
        { "off-the-tee": -0.3, approach: -0.4, "around-the-green": -0.2, putting: -0.1 },
        -1.0,
      );
      expect(
        screen.getByText("Where are YOU losing strokes?"),
      ).toBeVisible();
    });
  });

  describe("ghost chart data", () => {
    it("passes ghost data with player=50 for active categories", () => {
      renderInterstitial();

      // Second RadarChart call is the ghost
      const ghostProps = mockRadarChart.mock.calls[1][0] as { data: RadarChartDatum[] };
      for (const datum of ghostProps.data) {
        expect(datum.player).toBe(50);
      }
    });

    it("passes player=0 for skipped categories in ghost", () => {
      const chartDataWithSkipped: RadarChartDatum[] = [
        { category: "Off the Tee", player: 60 },
        { category: "Approach", player: 55, skipped: true },
        { category: "Around the Green", player: 45 },
        { category: "Putting", player: 48 },
      ];

      renderInterstitial(undefined, undefined, chartDataWithSkipped);

      const ghostProps = mockRadarChart.mock.calls[1][0] as { data: RadarChartDatum[] };
      const skippedDatum = ghostProps.data.find((d: RadarChartDatum) => d.category === "Approach");
      expect(skippedDatum?.player).toBe(0);
    });
  });

  describe("RadarChart props", () => {
    it("passes compact mode to both charts", () => {
      renderInterstitial();

      const senderProps = mockRadarChart.mock.calls[0][0] as Record<string, unknown>;
      const ghostProps = mockRadarChart.mock.calls[1][0] as Record<string, unknown>;

      expect(senderProps.compact).toBe(true);
      expect(ghostProps.compact).toBe(true);
    });

    it("passes ghost spider color and opacity", () => {
      renderInterstitial();

      const ghostProps = mockRadarChart.mock.calls[1][0] as Record<string, unknown>;
      expect(ghostProps.colors).toEqual(["#a8a29e"]);
      expect(ghostProps.fillOpacity).toBe(0.1);
    });
  });

  describe("CTA link", () => {
    it("has correct href with handicap and UTM params", () => {
      renderInterstitial();

      const link = screen.getByRole("link", { name: "Compare Your Game" });
      const href = link.getAttribute("href");
      expect(href).toContain("handicap=14.3");
      expect(href).toContain("utm_source=share");
      expect(href).toContain("utm_medium=cta");
      expect(href).toContain("utm_campaign=round_share");
    });
  });

  describe("skip link", () => {
    it("has href to results-summary", () => {
      renderInterstitial();

      const skipLink = screen.getByText(/Skip to full results/);
      expect(skipLink).toBeVisible();
      expect(skipLink.getAttribute("href")).toBe("#results-summary");
    });
  });
});
