// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const { mockTrackEvent } = vi.hoisted(() => ({
  mockTrackEvent: vi.fn(),
}));

vi.mock("@/lib/analytics/client", () => ({
  trackEvent: mockTrackEvent,
}));

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
    citations: Object.fromEntries(
      [
        "averageScore",
        "fairwayPercentage",
        "girPercentage",
        "puttsPerRound",
        "upAndDownPercentage",
        "penaltiesPerRound",
        "scoringDistribution",
      ].map((key) => [key, []])
    ),
    changelog: [{ version: "0.1.0", date: "2026-02-28", summary: "Test" }],
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
    skippedCategories: [],
    estimatedCategories: [],
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

const { mockSaveRound } = vi.hoisted(() => ({
  mockSaveRound: vi.fn(() => Promise.resolve({ success: true })),
}));

vi.mock("@/app/(tools)/strokes-gained/actions", () => ({
  saveRound: mockSaveRound,
}));

vi.mock("@/lib/capture", () => ({
  captureElementAsPng: vi.fn(() => Promise.resolve(new Blob())),
  downloadBlob: vi.fn(),
}));

vi.mock("@/components/charts/radar-chart", () => ({
  RadarChart: () => <div data-testid="mock-radar-chart" />,
}));

vi.mock(
  "@/app/(tools)/strokes-gained/_components/round-input-form",
  () => ({
    RoundInputForm: ({
      onSubmit,
    }: {
      onSubmit: (data: unknown, options?: { saveToCloud: boolean }) => void;
      initialValues?: unknown;
      isCalculating?: boolean;
    }) => (
      <button
        data-testid="mock-submit"
        type="button"
        onClick={() =>
          onSubmit(
            {
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
            },
            { saveToCloud: true }
          )
        }
      >
        Submit
      </button>
    ),
  })
);

import StrokesGainedClient from "@/app/(tools)/strokes-gained/_components/strokes-gained-client";

describe("round_save_failed analytics event", () => {
  beforeEach(() => {
    mockTrackEvent.mockClear();
    mockSaveRound.mockClear();
    vi.spyOn(window.history, "replaceState").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('fires with error_type "config" when save returns SAVE_DISABLED', async () => {
    mockSaveRound.mockResolvedValue({
      success: false,
      code: "SAVE_DISABLED",
      message: "Cloud save unavailable — your results are still shown below.",
    });

    render(<StrokesGainedClient />);
    await userEvent.click(screen.getByTestId("mock-submit"));

    await waitFor(() => {
      expect(mockTrackEvent).toHaveBeenCalledWith("round_save_failed", {
        error_type: "config",
      });
    });
  });

  it('fires with error_type "runtime" on other server errors', async () => {
    mockSaveRound.mockResolvedValue({
      success: false,
      code: "DB_ERROR",
      message: "Round could not be saved.",
    });

    render(<StrokesGainedClient />);
    await userEvent.click(screen.getByTestId("mock-submit"));

    await waitFor(() => {
      expect(mockTrackEvent).toHaveBeenCalledWith("round_save_failed", {
        error_type: "runtime",
      });
    });
  });

  it('fires with error_type "network" on .catch() transport error', async () => {
    mockSaveRound.mockRejectedValue(new Error("fetch failed"));

    render(<StrokesGainedClient />);
    await userEvent.click(screen.getByTestId("mock-submit"));

    await waitFor(() => {
      expect(mockTrackEvent).toHaveBeenCalledWith("round_save_failed", {
        error_type: "network",
      });
    });
  });

  it('fires with error_type "rate_limited" when save returns RATE_LIMITED', async () => {
    mockSaveRound.mockResolvedValue({
      success: false,
      code: "RATE_LIMITED",
      message: "Too many requests. Please try again shortly.",
    });

    render(<StrokesGainedClient />);
    await userEvent.click(screen.getByTestId("mock-submit"));

    await waitFor(() => {
      expect(mockTrackEvent).toHaveBeenCalledWith("round_save_failed", {
        error_type: "rate_limited",
      });
    });
  });
});
