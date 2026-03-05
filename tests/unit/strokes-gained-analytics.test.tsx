// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";
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

// Mock html-to-image (not available in jsdom)
vi.mock("@/lib/capture", () => ({
  captureElementAsPng: vi.fn(() => Promise.resolve(new Blob())),
  downloadBlob: vi.fn(),
}));

// Mock RadarChart (Nivo doesn't render in jsdom)
vi.mock("@/components/charts/radar-chart", () => ({
  RadarChart: () => <div data-testid="mock-radar-chart" />,
}));

// Mock RoundInputForm: provides a simple submit trigger for testing
const { mockOnSubmit } = vi.hoisted(() => ({
  mockOnSubmit: {
    current: null as
      | ((
          data: unknown,
          options?: { saveToCloud: boolean }
        ) => void)
      | null,
  },
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
    }) => {
      mockOnSubmit.current = onSubmit;
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
  })
);

import { calculateStrokesGained } from "@/lib/golf/strokes-gained";
import StrokesGainedClient from "@/app/(tools)/strokes-gained/_components/strokes-gained-client";

const mockCalculateSG = vi.mocked(calculateStrokesGained);

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
    mockSaveRound.mockClear();
    mockSaveRound.mockResolvedValue({ success: true });
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

  it("fires gir_estimated when estimatedCategories is non-empty", async () => {
    mockCalculateSG.mockReturnValueOnce({
      total: -1.5,
      categories: {
        "off-the-tee": -0.5,
        approach: 0.2,
        "around-the-green": -0.8,
        putting: -0.4,
      },
      benchmarkBracket: "10-15",
      skippedCategories: [],
      estimatedCategories: ["approach", "around-the-green"],
    });

    render(<StrokesGainedClient />);
    await userEvent.click(screen.getByTestId("mock-submit"));

    expect(mockTrackEvent).toHaveBeenCalledWith("gir_estimated");
  });

  it("does NOT fire gir_estimated when estimatedCategories is empty", async () => {
    render(<StrokesGainedClient />);
    await userEvent.click(screen.getByTestId("mock-submit"));

    expect(mockTrackEvent).not.toHaveBeenCalledWith("gir_estimated");
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

describe("Copy Link error handling", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    mockTrackEvent.mockClear();
    mockSaveRound.mockClear();
    mockSaveRound.mockResolvedValue({ success: true });
    vi.spyOn(window.history, "replaceState").mockImplementation(() => {});
  });

  it("shows 'Copied!' when clipboard API succeeds", async () => {
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn(() => Promise.resolve()) },
    });

    render(<StrokesGainedClient initialInput={mockInput} />);
    const copyBtn = screen.getByTestId("copy-link");
    await userEvent.click(copyBtn);

    expect(copyBtn).toHaveTextContent("Copied!");
  });

  it("shows 'Copied!' via execCommand fallback when clipboard API throws", async () => {
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn(() => Promise.reject(new Error("Not allowed"))),
      },
    });
    // execCommand may not exist in jsdom — define it
    document.execCommand = vi.fn(() => true);

    render(<StrokesGainedClient initialInput={mockInput} />);
    const copyBtn = screen.getByTestId("copy-link");
    await userEvent.click(copyBtn);

    expect(copyBtn).toHaveTextContent("Copied!");
  });

  it("shows 'Failed to copy' when both clipboard and execCommand fail", async () => {
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn(() => Promise.reject(new Error("Not allowed"))),
      },
    });
    document.execCommand = vi.fn(() => false);

    render(<StrokesGainedClient initialInput={mockInput} />);
    const copyBtn = screen.getByTestId("copy-link");
    await userEvent.click(copyBtn);

    expect(copyBtn).toHaveTextContent("Failed to copy");
  });
});

describe("Save feedback", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    mockTrackEvent.mockClear();
    mockSaveRound.mockClear();
    vi.spyOn(window.history, "replaceState").mockImplementation(() => {});
  });

  it("shows green 'Round saved' banner on success", async () => {
    mockSaveRound.mockResolvedValue({ success: true });

    render(<StrokesGainedClient />);

    // Click the mock submit button to trigger handleFormSubmit → saveRound
    await userEvent.click(screen.getByTestId("mock-submit"));

    await waitFor(() => {
      expect(screen.getByTestId("save-success")).toHaveTextContent(
        "Round saved."
      );
    });
    expect(mockTrackEvent).toHaveBeenCalledWith("round_saved");
  });

  it("shows a pending save state while the save request is in flight", async () => {
    let resolveSave!: (value: { success: true }) => void;
    mockSaveRound.mockReturnValue(
      new Promise<{ success: true }>((resolve) => {
        resolveSave = resolve;
      })
    );

    render(<StrokesGainedClient />);
    await userEvent.click(screen.getByTestId("mock-submit"));

    expect(screen.getByTestId("save-pending")).toHaveTextContent(
      "Saving round..."
    );

    resolveSave({ success: true });

    await waitFor(() => {
      expect(screen.queryByTestId("save-pending")).toBeNull();
    });
    expect(screen.getByTestId("save-success")).toHaveTextContent("Round saved.");
  });

  it("shows neutral 'Cloud save unavailable' notice for SAVE_DISABLED", async () => {
    mockSaveRound.mockResolvedValue({
      success: false,
      code: "SAVE_DISABLED",
      message: "Cloud save unavailable — your results are still shown below.",
    });

    render(<StrokesGainedClient />);
    await userEvent.click(screen.getByTestId("mock-submit"));

    await waitFor(() => {
      expect(screen.getByTestId("save-error")).toHaveTextContent(
        /Cloud save unavailable/
      );
    });
  });

  it("shows amber error banner for other save errors", async () => {
    mockSaveRound.mockResolvedValue({
      success: false,
      code: "DB_ERROR",
      message: "Round could not be saved.",
    });

    render(<StrokesGainedClient />);
    await userEvent.click(screen.getByTestId("mock-submit"));

    await waitFor(() => {
      expect(screen.getByTestId("save-error")).toHaveTextContent(
        /Round could not be saved/
      );
    });
  });

  it("skips the background save call when save is disabled in the UI", async () => {
    render(<StrokesGainedClient saveEnabled={false} />);
    await userEvent.click(screen.getByTestId("mock-submit"));

    expect(mockSaveRound).not.toHaveBeenCalled();
    expect(screen.queryByTestId("save-pending")).toBeNull();
    expect(screen.queryByTestId("save-success")).toBeNull();
    expect(screen.queryByTestId("save-error")).toBeNull();
  });

  it("only applies the latest save response (race condition guard)", async () => {
    let resolveFirst!: (v: { success: boolean }) => void;
    let resolveSecond!: (
      v: { success: true } | { success: false; error: string }
    ) => void;

    const firstPromise = new Promise<{ success: boolean }>((r) => {
      resolveFirst = r;
    });
    const secondPromise = new Promise<
      { success: true } | { success: false; error: string }
    >((r) => {
      resolveSecond = r;
    });

    mockSaveRound
      .mockReturnValueOnce(firstPromise)
      .mockReturnValueOnce(secondPromise);

    render(<StrokesGainedClient />);

    // First submit
    await userEvent.click(screen.getByTestId("mock-submit"));
    // Second submit (supersedes first)
    await userEvent.click(screen.getByTestId("mock-submit"));

    // Resolve second (latest) first
    resolveSecond({ success: true });
    await waitFor(() => {
      expect(screen.getByTestId("save-success")).toBeInTheDocument();
    });

    // Resolve first (stale) — should be ignored since requestId doesn't match
    resolveFirst({ success: false });

    // Success banner should still be showing, no error
    expect(screen.getByTestId("save-success")).toBeInTheDocument();
    expect(screen.queryByTestId("save-error")).not.toBeInTheDocument();
  });
});
