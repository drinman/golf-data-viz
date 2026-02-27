// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { ShareCard } from "@/app/(tools)/strokes-gained/_components/share-card";
import { makeSGResult } from "../fixtures/factories";
import type { RadarChartDatum } from "@/lib/golf/types";

afterEach(cleanup);

// Nivo needs ResizeObserver — stub it for jsdom
globalThis.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

function makeChartData(): RadarChartDatum[] {
  return [
    { category: "Off the Tee", player: 60, peerAverage: 50 },
    { category: "Approach", player: 40, peerAverage: 50 },
    { category: "Around the Green", player: 55, peerAverage: 50 },
    { category: "Putting", player: 45, peerAverage: 50 },
  ];
}

describe("ShareCard", () => {
  it("renders without error", () => {
    const result = makeSGResult();
    const chartData = makeChartData();

    render(
      <ShareCard
        result={result}
        chartData={chartData}
        courseName="Pebble Beach"
        score={85}
      />
    );

    expect(screen.getByTestId("share-card")).toBeTruthy();
  });

  it("displays course name and score", () => {
    const result = makeSGResult();
    const chartData = makeChartData();

    render(
      <ShareCard
        result={result}
        chartData={chartData}
        courseName="Augusta National"
        score={79}
      />
    );

    expect(screen.getByText("Augusta National")).toBeTruthy();
    expect(screen.getByText(/79/)).toBeTruthy();
  });

  it("shows all four SG categories", () => {
    const result = makeSGResult();
    const chartData = makeChartData();

    render(
      <ShareCard
        result={result}
        chartData={chartData}
        courseName="Test Course"
        score={90}
      />
    );

    expect(screen.getByText("Off the Tee")).toBeTruthy();
    expect(screen.getByText("Approach")).toBeTruthy();
    expect(screen.getByText("Around the Green")).toBeTruthy();
    expect(screen.getByText("Putting")).toBeTruthy();
  });

  it("shows the total SG value", () => {
    const result = makeSGResult({ total: 2.5 });
    const chartData = makeChartData();

    render(
      <ShareCard
        result={result}
        chartData={chartData}
        courseName="Test"
        score={85}
      />
    );

    expect(screen.getByText("+2.50")).toBeTruthy();
    expect(screen.getByText("Total SG")).toBeTruthy();
  });

  it("shows bracket label", () => {
    const result = makeSGResult();
    const chartData = makeChartData();

    render(
      <ShareCard
        result={result}
        chartData={chartData}
        courseName="Test"
        score={85}
      />
    );

    // Default factory uses "10-15" bracket
    expect(screen.getByText(/10–15 HCP/)).toBeTruthy();
  });
});
