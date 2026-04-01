// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, cleanup, fireEvent, act } from "@testing-library/react";

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------

const { mockTrackEvent, mockShareImage, mockCaptureElementAsPng } = vi.hoisted(
  () => ({
    mockTrackEvent: vi.fn(),
    mockShareImage: vi.fn(),
    mockCaptureElementAsPng: vi.fn(),
  })
);

vi.mock("@/lib/analytics/client", () => ({
  trackEvent: mockTrackEvent,
}));

vi.mock("@/lib/share", () => ({
  shareImage: mockShareImage,
}));

vi.mock("@/lib/capture", () => ({
  captureElementAsPng: mockCaptureElementAsPng,
}));

// Auth mocks not needed — SharedRoundClient doesn't use auth directly
// but keep if RoundLayout's mock children reference them

vi.mock("@/lib/golf/percentile", () => ({
  getPresentationPercentiles: vi.fn(() => ({})),
}));

// Mock RoundLayout to render only the actions prop (where the share button lives)
// and expose a ref target for captureElementAsPng
vi.mock("@/app/(tools)/strokes-gained/_components/round-layout", () => ({
  RoundLayout: ({
    actions,
    shareCardRef,
  }: {
    actions?: React.ReactNode;
    shareCardRef?: React.RefObject<HTMLDivElement | null>;
    [key: string]: unknown;
  }) => (
    <div>
      <div ref={shareCardRef} data-testid="share-card">
        mock share card
      </div>
      {actions}
    </div>
  ),
  deriveRoundData: vi.fn(() => ({
    sgResult: {
      total: -1.5,
      categories: {
        "off-the-tee": -0.5,
        approach: 0.2,
        "around-the-green": -0.8,
        putting: -0.4,
      },
      benchmarkBracket: "10-15",
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
    },
    chartData: [
      { category: "Off the Tee", player: 40 },
      { category: "Approach", player: 55 },
      { category: "Around the Green", player: 35 },
      { category: "Putting", player: 42 },
    ],
    bracketLabel: "10-15 HCP",
    presentationTrust: "caveated",
  })),
}));

vi.mock("@/app/(tools)/strokes-gained/_components/recipient-cta", () => ({
  RecipientCta: () => null,
}));

vi.mock("@/app/(tools)/strokes-gained/_components/interstitial-cta", () => ({
  InterstitialCta: () => null,
}));

// ---------------------------------------------------------------------------
// Component import (after mocks)
// ---------------------------------------------------------------------------

import { SharedRoundClient } from "@/app/(tools)/strokes-gained/shared/round/[token]/_components/shared-round-client";
import type { RoundDetailSnapshot } from "@/lib/golf/types";

// ---------------------------------------------------------------------------
// Fixture
// ---------------------------------------------------------------------------

const mockSnapshot: RoundDetailSnapshot = {
  roundId: "test-round-123",
  playedAt: "2026-03-28",
  courseName: "Pebble Beach",
  score: 87,
  handicapIndex: 14.3,
  sgTotal: -1.5,
  sgOffTheTee: -0.5,
  sgApproach: 0.2,
  sgAroundTheGreen: -0.8,
  sgPutting: -0.4,
  methodologyVersion: "3.0.0",
  benchmarkBracket: "10-15",
  benchmarkVersion: "1.0.0",
  benchmarkHandicap: 14.3,
  benchmarkInterpolationMode: null,
  calibrationVersion: null,
  totalAnchorMode: null,
  confidenceOffTheTee: "medium",
  confidenceApproach: "high",
  confidenceAroundTheGreen: "medium",
  confidencePutting: "high",
  estimatedCategories: [],
  skippedCategories: [],
  fairwaysHit: 7,
  fairwayAttempts: 14,
  greensInRegulation: 6,
  upAndDownAttempts: null,
  upAndDownConverted: null,
  eagles: 0,
  birdies: 1,
  pars: 7,
  bogeys: 7,
  doubleBogeys: 2,
  triplePlus: 1,
  totalPutts: 33,
  onePutts: null,
  threePutts: null,
  penaltyStrokes: 2,
  courseRating: 72,
  slopeRating: 130,
  trustStatus: null,
  trustReasons: [],
  reconciliationScaleFactor: null,
  reconciliationFlags: [],
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("SharedRoundClient share button", () => {
  const fakeBlob = new Blob(["fake-png"], { type: "image/png" });

  beforeEach(() => {
    mockTrackEvent.mockClear();
    mockShareImage.mockClear();
    mockCaptureElementAsPng.mockClear();
    mockCaptureElementAsPng.mockResolvedValue(fakeBlob);
    mockShareImage.mockResolvedValue("native");
  });

  afterEach(() => {
    cleanup();
  });

  it("calls shareImage (not downloadBlob) with correct blob and filename", async () => {
    const { getByTestId } = render(
      <SharedRoundClient snapshot={mockSnapshot} />
    );

    const btn = getByTestId("share-image");
    await act(async () => {
      fireEvent.click(btn);
    });

    expect(mockCaptureElementAsPng).toHaveBeenCalledTimes(1);
    expect(mockShareImage).toHaveBeenCalledTimes(1);
    expect(mockShareImage).toHaveBeenCalledWith(
      fakeBlob,
      "pebble-beach-sg-2026-03-28.png"
    );
  });

  it("fires analytics with share_method: native", async () => {
    mockShareImage.mockResolvedValue("native");
    const { getByTestId } = render(
      <SharedRoundClient snapshot={mockSnapshot} />
    );

    await act(async () => {
      fireEvent.click(getByTestId("share-image"));
    });

    expect(mockTrackEvent).toHaveBeenCalledWith("saved_round_png_shared", {
      round_id: "test-round-123",
      surface: "shared_page",
      share_method: "native",
    });
  });

  it("fires analytics with share_method: download on fallback", async () => {
    mockShareImage.mockResolvedValue("download");
    const { getByTestId } = render(
      <SharedRoundClient snapshot={mockSnapshot} />
    );

    await act(async () => {
      fireEvent.click(getByTestId("share-image"));
    });

    expect(mockTrackEvent).toHaveBeenCalledWith("saved_round_png_shared", {
      round_id: "test-round-123",
      surface: "shared_page",
      share_method: "download",
    });
  });

  it("disables button while saving and re-enables after", async () => {
    let resolveShare!: (value: string) => void;
    mockShareImage.mockImplementation(
      () => new Promise((resolve) => { resolveShare = resolve; })
    );

    const { getByTestId } = render(
      <SharedRoundClient snapshot={mockSnapshot} />
    );

    const btn = getByTestId("share-image");
    expect(btn).not.toBeDisabled();

    // Start the share — button should become disabled
    act(() => {
      fireEvent.click(btn);
    });

    // Wait for captureElementAsPng to resolve so the handler reaches shareImage
    await act(async () => {
      await Promise.resolve();
    });

    expect(btn).toBeDisabled();
    expect(btn).toHaveTextContent("Preparing...");

    // Resolve the share — button should re-enable
    await act(async () => {
      resolveShare("native");
    });

    expect(btn).not.toBeDisabled();
    expect(btn).toHaveTextContent("Share");
  });
});
