// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";

const { mockTrackEvent } = vi.hoisted(() => ({
  mockTrackEvent: vi.fn(),
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
  saveRound: vi.fn(() => Promise.resolve({ success: true })),
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
      <button data-testid="mock-submit" type="button" onClick={() => onSubmit({}, { saveToCloud: false })}>
        Submit
      </button>
    ),
  })
);

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

describe("shared_round_viewed analytics event", () => {
  beforeEach(() => {
    mockTrackEvent.mockClear();
    vi.spyOn(window.history, "replaceState").mockImplementation(() => {});
  });

  afterEach(() => {
    cleanup();
  });

  it("fires exactly once when initialInput is provided (Strict Mode safe)", () => {
    render(<StrokesGainedClient initialInput={mockInput} />);

    const sharedRoundCalls = mockTrackEvent.mock.calls.filter(
      ([event]: [string]) => event === "shared_round_viewed"
    );
    expect(sharedRoundCalls).toHaveLength(1);
  });

  it("does NOT fire when initialInput is null", () => {
    render(<StrokesGainedClient />);

    expect(mockTrackEvent).not.toHaveBeenCalledWith(
      "shared_round_viewed",
      expect.anything()
    );
  });

  it("includes referrer and utm_source props", () => {
    render(<StrokesGainedClient initialInput={mockInput} />);

    expect(mockTrackEvent).toHaveBeenCalledWith("shared_round_viewed", {
      referrer: expect.any(String),
      utm_source: expect.any(String),
    });
  });
});
