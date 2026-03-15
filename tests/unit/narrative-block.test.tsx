// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const { mockTrackEvent, mockEncodeRound } = vi.hoisted(() => ({
  mockTrackEvent: vi.fn(),
  mockEncodeRound: vi.fn(() => "encodedRoundData"),
}));

vi.mock("@/lib/analytics/client", () => ({
  trackEvent: mockTrackEvent,
}));

vi.mock("@/lib/golf/share-codec", () => ({
  encodeRound: mockEncodeRound,
}));

import { NarrativeBlock } from "@/app/(tools)/strokes-gained/_components/narrative-block";
import type { RoundInput } from "@/lib/golf/types";

const VALID_INPUT: RoundInput = {
  course: "Pine Valley",
  date: "2026-03-14",
  score: 86,
  handicapIndex: 14,
  courseRating: 72.5,
  slopeRating: 131,
  fairwaysHit: 7,
  fairwayAttempts: 14,
  greensInRegulation: 6,
  totalPutts: 34,
  penaltyStrokes: 2,
  eagles: 0,
  birdies: 1,
  pars: 6,
  bogeys: 7,
  doubleBogeys: 3,
  triplePlus: 1,
};

function mockFetchSuccess(narrative = "This was a solid round overall.") {
  vi.spyOn(global, "fetch").mockResolvedValue(
    new Response(
      JSON.stringify({
        narrative,
        word_count: narrative.split(/\s+/).length,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    )
  );
}

function mockFetchError(status: number, code: string) {
  vi.spyOn(global, "fetch").mockResolvedValue(
    new Response(
      JSON.stringify({ error: "test error", code }),
      { status, headers: { "Content-Type": "application/json" } }
    )
  );
}

describe("NarrativeBlock", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("shows skeleton loading on mount", () => {
    mockFetchSuccess();
    render(<NarrativeBlock input={VALID_INPUT} />);
    expect(screen.getByTestId("narrative-loading")).toBeInTheDocument();
  });

  it("shows narrative text on success", async () => {
    mockFetchSuccess();
    render(<NarrativeBlock input={VALID_INPUT} />);
    const block = await screen.findByTestId("narrative-block");
    expect(block).toBeInTheDocument();
    expect(block.textContent).toContain("This was a solid round overall.");
  });

  it("shows retry button on retryable error", async () => {
    mockFetchError(500, "GENERATION_FAILED");
    render(<NarrativeBlock input={VALID_INPUT} />);
    const errorCard = await screen.findByTestId("narrative-error");
    expect(errorCard).toBeInTheDocument();
    expect(screen.getByTestId("narrative-retry")).toBeInTheDocument();
    expect(errorCard.textContent).toContain("generate your round analysis");
  });

  it("renders nothing on non-retryable error (rate limited)", async () => {
    mockFetchError(429, "RATE_LIMITED");
    const { container } = render(<NarrativeBlock input={VALID_INPUT} />);
    await waitFor(() => {
      expect(screen.queryByTestId("narrative-loading")).not.toBeInTheDocument();
    });
    expect(screen.queryByTestId("narrative-error")).not.toBeInTheDocument();
    expect(container.innerHTML).toBe("");
  });

  it("retries fetch when Try Again is clicked", async () => {
    mockFetchError(503, "UNAVAILABLE");
    const user = userEvent.setup();
    render(<NarrativeBlock input={VALID_INPUT} />);
    await screen.findByTestId("narrative-error");

    // Switch mock to success and click retry
    vi.restoreAllMocks();
    mockFetchSuccess();
    await user.click(screen.getByTestId("narrative-retry"));

    const block = await screen.findByTestId("narrative-block");
    expect(block.textContent).toContain("This was a solid round overall.");
  });

  it("does not render for shared links", () => {
    mockFetchSuccess();
    const { container } = render(
      <NarrativeBlock input={VALID_INPUT} isSharedLink={true} />
    );
    expect(container.innerHTML).toBe("");
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("fires narrative_requested on mount", () => {
    mockFetchSuccess();
    render(<NarrativeBlock input={VALID_INPUT} />);
    expect(mockTrackEvent).toHaveBeenCalledWith("narrative_requested");
  });

  it("fires narrative_generated on success", async () => {
    mockFetchSuccess();
    render(<NarrativeBlock input={VALID_INPUT} />);
    await waitFor(() => {
      expect(mockTrackEvent).toHaveBeenCalledWith(
        "narrative_generated",
        expect.objectContaining({
          word_count: expect.any(Number),
          latency_ms: expect.any(Number),
        })
      );
    });
  });

  it("fires narrative_failed with rate_limited error type", async () => {
    mockFetchError(429, "RATE_LIMITED");
    render(<NarrativeBlock input={VALID_INPUT} />);
    await waitFor(() => {
      expect(mockTrackEvent).toHaveBeenCalledWith("narrative_failed", {
        error_type: "rate_limited",
      });
    });
  });

  it("fires narrative_failed with timeout error type", async () => {
    mockFetchError(504, "GATEWAY_TIMEOUT");
    render(<NarrativeBlock input={VALID_INPUT} />);
    await waitFor(() => {
      expect(mockTrackEvent).toHaveBeenCalledWith("narrative_failed", {
        error_type: "timeout",
      });
    });
  });

  it("fires narrative_failed with network error type for 503", async () => {
    mockFetchError(503, "UNAVAILABLE");
    render(<NarrativeBlock input={VALID_INPUT} />);
    await waitFor(() => {
      expect(mockTrackEvent).toHaveBeenCalledWith("narrative_failed", {
        error_type: "network",
      });
    });
  });

  it("fires narrative_failed with generation error type for 500", async () => {
    mockFetchError(500, "GENERATION_FAILED");
    render(<NarrativeBlock input={VALID_INPUT} />);
    await waitFor(() => {
      expect(mockTrackEvent).toHaveBeenCalledWith("narrative_failed", {
        error_type: "generation",
      });
    });
  });

  it("fires narrative_copied on copy click", async () => {
    mockFetchSuccess();
    const user = userEvent.setup();

    render(<NarrativeBlock input={VALID_INPUT} />);
    await screen.findByTestId("narrative-block");

    await user.click(screen.getByTestId("narrative-copy"));

    expect(mockTrackEvent).toHaveBeenCalledWith("narrative_copied", {
      word_count: expect.any(Number),
      surface: "results_page",
    });
  });

  it("shows Copied! state after clicking copy", async () => {
    mockFetchSuccess();
    const user = userEvent.setup();

    render(<NarrativeBlock input={VALID_INPUT} />);
    await screen.findByTestId("narrative-block");

    await user.click(screen.getByTestId("narrative-copy"));
    expect(screen.getByText("Copied!")).toBeInTheDocument();
  });

  it("includes attribution in copied text", async () => {
    mockFetchSuccess();
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      writable: true,
      configurable: true,
    });

    render(<NarrativeBlock input={VALID_INPUT} />);
    await screen.findByTestId("narrative-block");

    await user.click(screen.getByTestId("narrative-copy"));

    const copiedText = writeText.mock.calls[0][0] as string;
    expect(copiedText).toContain("Golf Data Viz");
    expect(copiedText).toContain("golfdataviz.com/strokes-gained?d=");
  });

  it("includes trouble context in request body when present", async () => {
    mockFetchSuccess();
    const troubleContext = {
      troubleHoles: [{ holeNumber: 4, primaryCause: "tee" as const }],
      summary: { tee: 1, approach: 0, around_green: 0, putting: 0, penalty: 0 },
    };

    render(
      <NarrativeBlock input={VALID_INPUT} troubleContext={troubleContext} />
    );

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });

    const fetchCall = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const body = JSON.parse(fetchCall[1].body);
    expect(body.troubleContext).toEqual(troubleContext);
  });
});
