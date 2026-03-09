// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";

const {
  mockTrackEvent,
  mockSaveRound,
  mockTurnstileExecute,
  mockInitialSavePreference,
} = vi.hoisted(() => ({
  mockTrackEvent: vi.fn(),
  mockSaveRound: vi.fn(() => Promise.resolve({ success: true })),
  mockTurnstileExecute: vi.fn(() => Promise.resolve("turnstile-token")),
  mockInitialSavePreference: { current: true },
}));

vi.mock("@/lib/analytics/client", () => ({
  trackEvent: mockTrackEvent,
}));

const mockUser = vi.hoisted(() => ({ current: null as { id: string; email: string } | null }));

vi.mock("@/lib/supabase/auth-client", () => ({
  useSupabaseUser: () => ({ user: mockUser.current, loading: false }),
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
        onSavePreferenceChange?.(mockInitialSavePreference.current);
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

function renderClient(
  props: Partial<ComponentProps<typeof StrokesGainedClient>> = {}
) {
  return render(
    <StrokesGainedClient turnstileSiteKey="site-key" {...props} />
  );
}

describe("StrokesGainedClient analytics instrumentation", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  beforeEach(() => {
    mockTrackEvent.mockClear();
    mockSaveRound.mockClear();
    mockTurnstileExecute.mockClear();
    mockInitialSavePreference.current = true;
    mockUser.current = null;
    mockSaveRound.mockResolvedValue({ success: true });
    mockTurnstileExecute.mockResolvedValue("turnstile-token");
    vi
      .spyOn(window.history, "replaceState")
      .mockImplementation((data, unused, url) => {
        if (url === undefined) return;
        window.history.pushState(data, unused, url);
      });
    window.history.pushState({}, "", "/strokes-gained?utm_source=reddit&d=encoded");
  });

  it("does not mount Turnstile before anonymous save is opted into", () => {
    mockInitialSavePreference.current = false;

    renderClient();

    expect(screen.queryByTestId("mock-turnstile-widget")).toBeNull();
  });

  it("renders the compact trust module with links and common questions", async () => {
    const user = userEvent.setup();

    renderClient();

    expect(screen.getByText("Beta")).toBeVisible();
    expect(screen.getByText("Proxy Strokes Gained")).toBeVisible();
    expect(screen.getByText("Private")).toBeVisible();
    expect(screen.getByText("Open")).toBeVisible();
    expect(
      screen.queryByText(
        "This is a peer-compared SG proxy built from round-level inputs, not shot-level tracking."
      )
    ).toBeNull();

    await user.click(screen.getByText("Common questions"));

    expect(
      screen.getByRole("link", { name: "Methodology" })
    ).toBeVisible();
    expect(screen.getByRole("link", { name: "Privacy" })).toBeVisible();
    expect(screen.getByRole("link", { name: "GitHub" })).toBeVisible();
  });

  it("fires form_started once on first focus into form area", () => {
    renderClient();

    const formWrapper = screen.getByTestId("form-wrapper");
    fireEvent.focusIn(formWrapper);

    expect(mockTrackEvent).toHaveBeenCalledWith("form_started", {
      utm_source: "reddit",
    });
    expect(mockTrackEvent).toHaveBeenCalledTimes(1);

    fireEvent.focusIn(formWrapper);
    expect(mockTrackEvent).toHaveBeenCalledTimes(1);
  });

  it("does not fire form_started on initial render", () => {
    renderClient();
    expect(mockTrackEvent).not.toHaveBeenCalledWith("form_started");
  });

  it("fires download_png_clicked when download button is clicked", async () => {
    renderClient({ initialInput: mockInput });

    await userEvent.click(screen.getByTestId("download-png"));

    expect(mockTrackEvent).toHaveBeenCalledWith("download_png_clicked", {
      has_share_param: true,
      utm_source: "reddit",
    });
  });

  it("fires calculation_completed with utm attribution on submit", async () => {
    renderClient();

    await userEvent.click(screen.getByTestId("mock-submit"));

    expect(mockTrackEvent).toHaveBeenCalledWith("calculation_completed", {
      utm_source: "reddit",
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
      confidence: {
        "off-the-tee": "medium",
        approach: "medium",
        "around-the-green": "low",
        putting: "high",
      },
      methodologyVersion: "2.0.0",
      benchmarkVersion: "1.0.0",
      benchmarkHandicap: 12,
      diagnostics: { threePuttImpact: null },
    });

    renderClient();
    await userEvent.click(screen.getByTestId("mock-submit"));

    expect(mockTrackEvent).toHaveBeenCalledWith("gir_estimated");
  });

  it("does not fire gir_estimated when estimatedCategories is empty", async () => {
    renderClient();
    await userEvent.click(screen.getByTestId("mock-submit"));

    expect(mockTrackEvent).not.toHaveBeenCalledWith("gir_estimated");
  });

  it("fires copy_link_clicked when copy button is clicked", async () => {
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: vi.fn(() => Promise.resolve()) },
      configurable: true,
    });

    renderClient({ initialInput: mockInput });

    await userEvent.click(screen.getByTestId("copy-link"));

    expect(mockTrackEvent).toHaveBeenCalledWith("copy_link_clicked", {
      has_share_param: true,
      utm_source: "reddit",
    });
  });

  it("preserves utm attribution for share events after submit rewrites the URL", async () => {
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: vi.fn(() => Promise.resolve()) },
      configurable: true,
    });
    window.history.pushState({}, "", "/strokes-gained?utm_source=reddit");

    renderClient();

    await userEvent.click(screen.getByTestId("mock-submit"));
    expect(window.location.search).toBe("?d=encoded-test-data");

    await userEvent.click(screen.getByTestId("copy-link"));
    await userEvent.click(screen.getByTestId("download-png"));

    expect(mockTrackEvent).toHaveBeenCalledWith("copy_link_clicked", {
      has_share_param: true,
      utm_source: "reddit",
    });
    expect(mockTrackEvent).toHaveBeenCalledWith("download_png_clicked", {
      has_share_param: true,
      utm_source: "reddit",
    });
  });
});

describe("Copy Link error handling", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  beforeEach(() => {
    mockTrackEvent.mockClear();
    mockUser.current = null;
    vi.spyOn(window.history, "replaceState").mockImplementation(() => {});
  });

  it("shows 'Copied!' when clipboard API succeeds", async () => {
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: vi.fn(() => Promise.resolve()) },
      configurable: true,
    });

    renderClient({ initialInput: mockInput });
    const copyBtn = screen.getByTestId("copy-link");
    await userEvent.click(copyBtn);

    expect(copyBtn).toHaveTextContent("Copied!");
  });

  it("shows 'Copied!' via execCommand fallback when clipboard API throws", async () => {
    Object.defineProperty(navigator, "clipboard", {
      value: {
        writeText: vi.fn(() => Promise.reject(new Error("Not allowed"))),
      },
      configurable: true,
    });
    document.execCommand = vi.fn(() => true);

    renderClient({ initialInput: mockInput });
    const copyBtn = screen.getByTestId("copy-link");
    await userEvent.click(copyBtn);

    expect(copyBtn).toHaveTextContent("Copied!");
  });

  it("shows 'Failed to copy' when both clipboard and execCommand fail", async () => {
    Object.defineProperty(navigator, "clipboard", {
      value: {
        writeText: vi.fn(() => Promise.reject(new Error("Not allowed"))),
      },
      configurable: true,
    });
    document.execCommand = vi.fn(() => false);

    renderClient({ initialInput: mockInput });
    const copyBtn = screen.getByTestId("copy-link");
    await userEvent.click(copyBtn);

    expect(copyBtn).toHaveTextContent("Failed to copy");
  });
});

describe("Save feedback", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  beforeEach(() => {
    mockTrackEvent.mockClear();
    mockSaveRound.mockClear();
    mockTurnstileExecute.mockClear();
    mockUser.current = null;
    mockSaveRound.mockResolvedValue({ success: true });
    mockTurnstileExecute.mockResolvedValue("turnstile-token");
    vi.spyOn(window.history, "replaceState").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("shows green 'Round saved' banner on success", async () => {
    renderClient();

    await userEvent.click(screen.getByTestId("mock-submit"));

    await waitFor(() => {
      expect(screen.getByTestId("save-success")).toHaveTextContent(
        "Round saved."
      );
    });
    expect(mockTrackEvent).toHaveBeenCalledWith("round_saved");
    expect(mockSaveRound).toHaveBeenCalledWith(expect.any(Object), {
      turnstileToken: "turnstile-token",
    });
  });

  it("shows verifying first, then saving, while the background save is in flight", async () => {
    let resolveTurnstile!: (token: string) => void;
    let resolveSave!: (value: { success: true }) => void;

    mockTurnstileExecute.mockReturnValueOnce(
      new Promise<string>((resolve) => {
        resolveTurnstile = resolve;
      })
    );
    mockSaveRound.mockReturnValueOnce(
      new Promise<{ success: true }>((resolve) => {
        resolveSave = resolve;
      })
    );

    renderClient();
    await userEvent.click(screen.getByTestId("mock-submit"));

    expect(screen.getByTestId("save-pending")).toHaveTextContent(
      "Verifying you're human..."
    );

    resolveTurnstile("turnstile-token");

    await waitFor(() => {
      expect(screen.getByTestId("save-pending")).toHaveTextContent(
        "Saving round..."
      );
    });

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

    renderClient();
    await userEvent.click(screen.getByTestId("mock-submit"));

    await waitFor(() => {
      expect(screen.getByTestId("save-error")).toHaveTextContent(
        /Cloud save unavailable/
      );
    });
  });

  it("shows a verification failure banner while preserving results", async () => {
    mockSaveRound.mockResolvedValue({
      success: false,
      code: "VERIFICATION_FAILED",
      message: "Bot check failed. Please try again.",
    });

    renderClient();
    await userEvent.click(screen.getByTestId("mock-submit"));

    await waitFor(() => {
      expect(screen.getByTestId("save-error")).toHaveTextContent(
        /Bot check failed\. Your results are still shown below\./
      );
    });
    expect(screen.getByTestId("sg-results")).toBeVisible();
  });

  it("shows amber error banner for runtime save errors", async () => {
    mockSaveRound.mockResolvedValue({
      success: false,
      code: "DB_ERROR",
      message: "Round could not be saved.",
    });

    renderClient();
    await userEvent.click(screen.getByTestId("mock-submit"));

    await waitFor(() => {
      expect(screen.getByTestId("save-error")).toHaveTextContent(
        /Round could not be saved/
      );
    });
  });

  it("skips the background save call when save is disabled in the UI", async () => {
    render(
      <StrokesGainedClient
        saveEnabled={false}
        turnstileSiteKey="site-key"
      />
    );

    await userEvent.click(screen.getByTestId("mock-submit"));

    expect(mockTurnstileExecute).not.toHaveBeenCalled();
    expect(mockSaveRound).not.toHaveBeenCalled();
    expect(screen.queryByTestId("save-pending")).toBeNull();
    expect(screen.queryByTestId("save-success")).toBeNull();
    expect(screen.queryByTestId("save-error")).toBeNull();
  });

  it("only applies the latest save response when re-submitting during verification", async () => {
    let resolveFirstToken!: (token: string) => void;

    mockTurnstileExecute
      .mockReturnValueOnce(
        new Promise<string>((resolve) => {
          resolveFirstToken = resolve;
        })
      )
      .mockResolvedValueOnce("second-token");
    mockSaveRound.mockResolvedValueOnce({ success: true });

    renderClient();

    await userEvent.click(screen.getByTestId("mock-submit"));
    await userEvent.click(screen.getByTestId("mock-submit"));

    await waitFor(() => {
      expect(mockSaveRound).toHaveBeenCalledWith(expect.any(Object), {
        turnstileToken: "second-token",
      });
    });

    resolveFirstToken("first-token");
    await Promise.resolve();

    expect(mockSaveRound).toHaveBeenCalledTimes(1);
    await waitFor(() => {
      expect(screen.getByTestId("save-success")).toBeInTheDocument();
    });
    expect(screen.queryByTestId("save-error")).not.toBeInTheDocument();
  });

  it("ignores stale save responses when re-submitting during saving", async () => {
    let resolveFirstSave!: (
      value: { success: false; code: "DB_ERROR"; message: string }
    ) => void;

    mockTurnstileExecute
      .mockResolvedValueOnce("first-token")
      .mockResolvedValueOnce("second-token");
    mockSaveRound
      .mockReturnValueOnce(
        new Promise<{ success: false; code: "DB_ERROR"; message: string }>(
          (resolve) => {
            resolveFirstSave = resolve;
          }
        )
      )
      .mockResolvedValueOnce({ success: true });

    renderClient();

    await userEvent.click(screen.getByTestId("mock-submit"));
    await userEvent.click(screen.getByTestId("mock-submit"));

    await waitFor(() => {
      expect(screen.getByTestId("save-success")).toBeInTheDocument();
    });

    resolveFirstSave({
      success: false,
      code: "DB_ERROR",
      message: "Round could not be saved.",
    });
    await Promise.resolve();

    expect(screen.getByTestId("save-success")).toBeInTheDocument();
    expect(screen.queryByTestId("save-error")).not.toBeInTheDocument();
  });
});

describe("Claim CTA copy", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  beforeEach(() => {
    mockTrackEvent.mockClear();
    mockSaveRound.mockClear();
    mockTurnstileExecute.mockClear();
    mockUser.current = null;
    mockSaveRound.mockResolvedValue({ success: true, roundId: "r-1", claimToken: "ct-1" });
    mockTurnstileExecute.mockResolvedValue("turnstile-token");
    vi.spyOn(window.history, "replaceState").mockImplementation(() => {});
  });

  it("shows updated claim CTA headline and body for anonymous saves", async () => {
    renderClient();
    await userEvent.click(screen.getByTestId("mock-submit"));

    await waitFor(() => {
      expect(screen.getByTestId("claim-cta")).toBeInTheDocument();
    });

    expect(
      screen.getByText("Keep this round and track what changes")
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Create a free account to keep this round and see your SG trends, biggest mover, and round history over time/)
    ).toBeInTheDocument();
  });
});

describe("Post-save confirmation for signed-in users", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  beforeEach(() => {
    mockTrackEvent.mockClear();
    mockSaveRound.mockClear();
    mockTurnstileExecute.mockClear();
    mockSaveRound.mockResolvedValue({ success: true, roundId: "r-1" });
    mockTurnstileExecute.mockResolvedValue("turnstile-token");
    vi.spyOn(window.history, "replaceState").mockImplementation(() => {});
  });

  it("shows persistent card with history link when signed-in user saves", async () => {
    mockUser.current = { id: "user-1", email: "test@example.com" };
    renderClient();
    await userEvent.click(screen.getByTestId("mock-submit"));

    await waitFor(() => {
      expect(screen.getByTestId("save-success-authed")).toBeInTheDocument();
    });
    expect(
      screen.getByText("Round added to your history.")
    ).toBeInTheDocument();
    const link = screen.getByText(/View your trends/);
    expect(link.closest("a")).toHaveAttribute("href", "/strokes-gained/history");
  });

  it("shows auto-dismiss toast when anonymous user saves", async () => {
    mockUser.current = null;
    renderClient();
    await userEvent.click(screen.getByTestId("mock-submit"));

    await waitFor(() => {
      expect(screen.getByTestId("save-success")).toBeInTheDocument();
    });
    expect(screen.getByTestId("save-success")).toHaveTextContent("Round saved.");
    expect(screen.queryByTestId("save-success-authed")).not.toBeInTheDocument();
  });

  it("fires history_link_clicked event when View your trends link is clicked", async () => {
    mockUser.current = { id: "user-1", email: "test@example.com" };
    renderClient();
    await userEvent.click(screen.getByTestId("mock-submit"));

    await waitFor(() => {
      expect(screen.getByTestId("save-success-authed")).toBeInTheDocument();
    });

    await userEvent.click(screen.getByText(/View your trends/));

    expect(mockTrackEvent).toHaveBeenCalledWith("history_link_clicked", {
      surface: "post_save_confirmation",
    });
  });
});
