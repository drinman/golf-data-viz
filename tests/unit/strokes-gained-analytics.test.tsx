// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const { mockTrackEvent } = vi.hoisted(() => ({
  mockTrackEvent: vi.fn(),
}));

vi.mock("@/lib/analytics/client", () => ({
  trackEvent: mockTrackEvent,
}));

// Mock golf domain modules used by StrokesGainedClient
vi.mock("@/lib/golf/benchmarks", () => ({
  getBracketForHandicap: vi.fn(() => ({
    bracket: "10-15" as const,
    averageScore: 87,
    fairwayPercentage: 0.42,
    girPercentage: 0.28,
    puttsPerRound: 33,
    upAndDownPercentage: 0.25,
    penaltiesPerRound: 1.2,
    scoring: {
      eaglesPerRound: 0.02,
      birdiesPerRound: 1.0,
      parsPerRound: 5.5,
      bogeysPerRound: 7.0,
      doublesPerRound: 3.0,
      triplePlusPerRound: 1.5,
    },
  })),
  getBenchmarkMeta: vi.fn(() => ({
    version: "0.1.0",
    updatedAt: "2026-02-28",
    provisional: true,
    sources: [],
  })),
}));

vi.mock("@/lib/golf/strokes-gained", () => ({
  calculateStrokesGained: vi.fn(() => ({
    total: -1.5,
    categories: {
      "off-the-tee": -0.5,
      approach: 0.2,
      "around-the-green": -0.8,
      putting: -0.4,
    },
    benchmarkBracket: "10-15" as const,
  })),
  toRadarChartData: vi.fn(() => [
    { category: "Off the Tee", player: 40 },
    { category: "Approach", player: 55 },
    { category: "Around the Green", player: 35 },
    { category: "Putting", player: 42 },
  ]),
}));

vi.mock("@/lib/golf/share-codec", () => ({
  encodeRound: vi.fn(() => "encoded-test-data"),
}));

vi.mock("../../../src/app/(tools)/strokes-gained/actions", () => ({
  saveRound: vi.fn(() => Promise.resolve({ success: true })),
}));

// Mock html-to-image (not available in jsdom)
vi.mock("@/lib/capture", () => ({
  captureElementAsPng: vi.fn(() => Promise.resolve(new Blob())),
  downloadBlob: vi.fn(),
}));

// Mock RadarChart (Nivo doesn't render in jsdom)
vi.mock("@/components/charts/radar-chart", () => ({
  RadarChart: () => <div data-testid="mock-radar-chart" />,
}));

import StrokesGainedClient from "@/app/(tools)/strokes-gained/_components/strokes-gained-client";

const mockInput = {
  handicapIndex: 12,
  course: "Test Course",
  date: "2025-06-01",
  courseRating: 72,
  slopeRating: 130,
  score: 87,
  fairwaysHit: 6,
  fairwayAttempts: 14,
  greensInRegulation: 5,
  totalPutts: 33,
  penaltyStrokes: 1,
  eagles: 0,
  birdies: 1,
  pars: 6,
  bogeys: 7,
  doubleBogeys: 3,
  triplePlus: 1,
};

describe("StrokesGainedClient analytics instrumentation", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    mockTrackEvent.mockClear();
    vi.spyOn(window.history, "replaceState").mockImplementation(() => {});
  });

  it("fires form_started once on first focus into form area", () => {
    render(<StrokesGainedClient />);

    const formWrapper = screen.getByTestId("form-wrapper");
    fireEvent.focusIn(formWrapper);

    expect(mockTrackEvent).toHaveBeenCalledWith("form_started");
    expect(mockTrackEvent).toHaveBeenCalledTimes(1);

    // Second focus should NOT fire again
    fireEvent.focusIn(formWrapper);
    expect(mockTrackEvent).toHaveBeenCalledTimes(1);
  });

  it("does not fire form_started on initial render", () => {
    render(<StrokesGainedClient />);
    expect(mockTrackEvent).not.toHaveBeenCalledWith("form_started");
  });

  it("fires download_png_clicked when download button is clicked", async () => {
    render(<StrokesGainedClient initialInput={mockInput} />);

    const downloadBtn = screen.getByTestId("download-png");
    await userEvent.click(downloadBtn);

    expect(mockTrackEvent).toHaveBeenCalledWith("download_png_clicked", {
      has_share_param: expect.any(Boolean),
    });
  });

  it("fires copy_link_clicked when copy button is clicked", async () => {
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn(() => Promise.resolve()) },
    });

    render(<StrokesGainedClient initialInput={mockInput} />);

    const copyBtn = screen.getByTestId("copy-link");
    await userEvent.click(copyBtn);

    expect(mockTrackEvent).toHaveBeenCalledWith("copy_link_clicked", {
      has_share_param: expect.any(Boolean),
    });
  });
});
