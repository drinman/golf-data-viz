// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { ShareCard } from "@/app/(tools)/strokes-gained/_components/share-card";
import { makeSGResult } from "../fixtures/factories";
import type { BenchmarkMeta, RadarChartDatum } from "@/lib/golf/types";
import { makeEmptyCitations } from "../helpers";

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

  it("shows Peer-compared SG trust label with Beta pill", () => {
    const result = makeSGResult();
    const chartData = makeChartData();
    const meta: BenchmarkMeta = {
      version: "0.1.0",
      updatedAt: "2026-02-28",
      provisional: true,
      sources: [],
      citations: makeEmptyCitations(),
      changelog: [
        { version: "0.1.0", date: "2026-02-28", summary: "Test" },
      ],
    };

    render(
      <ShareCard
        result={result}
        chartData={chartData}
        courseName="Test"
        score={85}
        benchmarkMeta={meta}
      />
    );

    expect(screen.getByText(/Peer-compared SG/)).toBeTruthy();
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
