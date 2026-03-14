// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const {
  mockTrackEvent,
  mockSaveRound,
  mockTurnstileExecute,
} = vi.hoisted(() => ({
  mockTrackEvent: vi.fn(),
  mockSaveRound: vi.fn(() => Promise.resolve({ success: true })),
  mockTurnstileExecute: vi.fn(() => Promise.resolve("turnstile-token")),
}));

vi.mock("@/lib/analytics/client", () => ({
  trackEvent: mockTrackEvent,
}));

vi.mock("@/lib/supabase/auth-client", () => ({
  useSupabaseUser: () => ({ user: null, loading: false }),
}));

vi.mock("@/components/auth/auth-modal", () => ({
  AuthModal: () => null,
}));

const mockBracket = {
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
};

vi.mock("@/lib/golf/benchmarks", () => ({
  getBracketForHandicap: vi.fn(() => mockBracket),
  getInterpolatedBenchmark: vi.fn(() => mockBracket),
  getBenchmarkMeta: vi.fn(() => ({
    version: "1.0.0",
    updatedAt: "2026-03-06",
    provisional: false,
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
    changelog: [{ version: "1.0.0", date: "2026-03-06", summary: "Test" }],
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
    confidence: {
      "off-the-tee": "medium",
      approach: "high",
      "around-the-green": "medium",
      putting: "high",
    },
    methodologyVersion: "2.0.0",
    benchmarkVersion: "1.0.0",
    benchmarkHandicap: 14.3,
    diagnostics: { threePuttImpact: null },
  })),
  toRadarChartData: vi.fn(() => [
    { category: "Off the Tee", player: 40 },
    { category: "Approach", player: 55 },
    { category: "Around the Green", player: 35 },
    { category: "Putting", player: 42 },
  ]),
}));

vi.mock("@/lib/golf/strokes-gained-v3", () => ({
  calculateStrokesGainedV3: vi.fn(() => ({
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
    confidence: {
      "off-the-tee": "medium",
      approach: "high",
      "around-the-green": "medium",
      putting: "high",
    },
    methodologyVersion: "3.0.0",
    benchmarkVersion: "1.0.0",
    benchmarkHandicap: 14.3,
    diagnostics: { threePuttImpact: null },
  })),
}));

vi.mock("@/lib/golf/share-codec", () => ({
  encodeRound: vi.fn(() => "encoded-test-data"),
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

vi.mock("@/components/security/turnstile-widget", async () => {
  const React = await import("react");

  return {
    TurnstileWidget: React.forwardRef(function MockTurnstileWidget(
      _props,
      ref
    ) {
      React.useImperativeHandle(
        ref,
        () => ({
          execute: mockTurnstileExecute,
          reset: vi.fn(),
        }),
        []
      );

      return <div data-testid="mock-turnstile-widget" />;
    }),
  };
});

vi.mock(
  "@/app/(tools)/strokes-gained/_components/round-input-form",
  async () => {
    const React = await import("react");

    return {
    RoundInputForm: ({
      onSubmit,
      onSavePreferenceChange,
    }: {
      onSubmit: (data: unknown, options?: { saveToCloud: boolean }) => void;
      onSavePreferenceChange?: (saveToCloud: boolean) => void;
    }) => {
      React.useEffect(() => {
        onSavePreferenceChange?.(true);
      }, [onSavePreferenceChange]);

      return (
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
      );
    },
    };
  }
);

import StrokesGainedClient from "@/app/(tools)/strokes-gained/_components/strokes-gained-client";

describe("round_save_failed analytics event", () => {
  beforeEach(() => {
    mockTrackEvent.mockClear();
    mockSaveRound.mockClear();
    mockTurnstileExecute.mockClear();
    mockTurnstileExecute.mockResolvedValue("turnstile-token");
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

    render(<StrokesGainedClient turnstileSiteKey="site-key" />);
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

    render(<StrokesGainedClient turnstileSiteKey="site-key" />);
    await userEvent.click(screen.getByTestId("mock-submit"));

    await waitFor(() => {
      expect(mockTrackEvent).toHaveBeenCalledWith("round_save_failed", {
        error_type: "runtime",
      });
    });
  });

  it('fires with error_type "network" on save transport errors', async () => {
    mockSaveRound.mockRejectedValue(new Error("fetch failed"));

    render(<StrokesGainedClient turnstileSiteKey="site-key" />);
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

    render(<StrokesGainedClient turnstileSiteKey="site-key" />);
    await userEvent.click(screen.getByTestId("mock-submit"));

    await waitFor(() => {
      expect(mockTrackEvent).toHaveBeenCalledWith("round_save_failed", {
        error_type: "rate_limited",
      });
    });
  });

  it('fires with error_type "verification" when verification fails before save', async () => {
    mockTurnstileExecute.mockRejectedValue(new Error("timeout"));

    render(<StrokesGainedClient turnstileSiteKey="site-key" />);
    await userEvent.click(screen.getByTestId("mock-submit"));

    await waitFor(() => {
      expect(mockTrackEvent).toHaveBeenCalledWith("round_save_failed", {
        error_type: "verification",
      });
    });
  });
});
