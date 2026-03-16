// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { ShareCard } from "@/app/(tools)/strokes-gained/_components/share-card";
import { makeSGResult, makeRound } from "../fixtures/factories";
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
    { category: "Off the Tee", player: 60 },
    { category: "Approach", player: 40 },
    { category: "Around the Green", player: 55 },
    { category: "Putting", player: 45 },
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
    expect(screen.getByText("SG vs peers")).toBeTruthy();
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

  it("shows SG trust label", () => {
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

    expect(screen.getAllByText(/Strokes Gained/).length).toBeGreaterThanOrEqual(1);
  });

  it("renders familiar stats and scoring breakdown when roundInput is provided", () => {
    const result = makeSGResult();
    const chartData = makeChartData();
    const roundInput = makeRound({ greensInRegulation: 6, totalPutts: 33, fairwaysHit: 7 });

    render(
      <ShareCard
        result={result}
        chartData={chartData}
        courseName="Test"
        score={87}
        roundInput={roundInput}
      />
    );

    expect(screen.getByText(/6 GIR/)).toBeTruthy();
    expect(screen.getByText(/33 putts/)).toBeTruthy();
    expect(screen.getByText(/7 par/)).toBeTruthy();
    expect(screen.getByText(/7 bogey/)).toBeTruthy();
  });

  it("omits familiar stats when roundInput has null optional fields", () => {
    const result = makeSGResult();
    const chartData = makeChartData();
    const roundInput = makeRound({
      greensInRegulation: undefined,
      totalPutts: undefined,
      fairwaysHit: undefined,
    });

    render(
      <ShareCard
        result={result}
        chartData={chartData}
        courseName="Test"
        score={87}
        roundInput={roundInput}
      />
    );

    // No familiar stats line should render (no GIR, no putts, no fairways)
    expect(screen.queryByText(/GIR/)).toBeNull();
    expect(screen.queryByText(/putts/)).toBeNull();
  });

  it("shows context legend and strokes-gained watermark URL", () => {
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

    expect(
      screen.getByText(
        "+ = better than peers · − = room to grow · Dashed line = peer average"
      )
    ).toBeTruthy();
    expect(
      screen.getByText(/Golf Data Viz · golfdataviz\.com\/strokes-gained/)
    ).toBeTruthy();
  });
});
