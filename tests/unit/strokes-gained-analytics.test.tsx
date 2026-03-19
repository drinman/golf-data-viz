// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";

const {
  mockTrackEvent,
  mockClaimRound,
} = vi.hoisted(() => ({
  mockTrackEvent: vi.fn(),
  mockClaimRound: vi.fn(() => Promise.resolve({ success: true, claimedRoundId: "r-1" })),
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
  claimRound: mockClaimRound,
  createShareToken: vi.fn(() => Promise.resolve({ success: false, message: "mock" })),
  saveTroubleContext: vi.fn(() => Promise.resolve({ success: true })),
  clearTroubleContext: vi.fn(() => Promise.resolve({ success: true })),
}));

vi.mock("@/lib/capture", () => ({
  captureElementAsPng: vi.fn(() => Promise.resolve(new Blob())),
  downloadBlob: vi.fn(),
}));

vi.mock("@/components/charts/radar-chart", () => ({
  RadarChart: () => <div data-testid="mock-radar-chart" />,
}));

vi.mock("@/app/(tools)/strokes-gained/_components/post-results-save-cta", () => ({
  PostResultsSaveCta: () => <div data-testid="mock-post-results-save-cta" />,
}));

vi.mock(
  "@/app/(tools)/strokes-gained/_components/round-input-form",
  () => ({
    RoundInputForm: ({
      onSubmit,
    }: {
      onSubmit: (data: unknown) => void;
    }) => (
      <button
        data-testid="mock-submit"
        type="button"
        onClick={() =>
          onSubmit({
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
          })
        }
      >
        Submit
      </button>
    ),
  })
);

import { calculateStrokesGainedV3 } from "@/lib/golf/strokes-gained-v3";
import StrokesGainedClient from "@/app/(tools)/strokes-gained/_components/strokes-gained-client";

const mockCalculateSGV3 = vi.mocked(calculateStrokesGainedV3);

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

// Stub localStorage — jsdom's built-in localStorage is incomplete in this env
const fileStorage: Record<string, string> = {};
const localStorageStub = {
  getItem: (key: string) => fileStorage[key] ?? null,
  setItem: (key: string, value: string) => { fileStorage[key] = value; },
  removeItem: (key: string) => { delete fileStorage[key]; },
  get length() { return Object.keys(fileStorage).length; },
  key: (i: number) => Object.keys(fileStorage)[i] ?? null,
  clear: () => { for (const k of Object.keys(fileStorage)) delete fileStorage[k]; },
};
const originalLocalStorage = globalThis.localStorage;

beforeEach(() => {
  Object.defineProperty(globalThis, "localStorage", {
    value: localStorageStub,
    writable: true,
    configurable: true,
  });
  // Clear file-level storage between tests
  for (const k of Object.keys(fileStorage)) delete fileStorage[k];
});

afterEach(() => {
  Object.defineProperty(globalThis, "localStorage", {
    value: originalLocalStorage,
    writable: true,
    configurable: true,
  });
});

function renderClient(
  props: Partial<ComponentProps<typeof StrokesGainedClient>> = {}
) {
  return render(
    <StrokesGainedClient turnstileSiteKey="site-key" sampleInput={mockInput} samplePreview={{ total: -1.5, chartData: [] as never, categories: [] as never, courseName: "Test", handicap: 14.3, bracketLabel: "10–15 HCP" }} {...props} />
  );
}

describe("StrokesGainedClient analytics instrumentation", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  beforeEach(() => {
    mockTrackEvent.mockClear();
    mockUser.current = null;
    vi
      .spyOn(window.history, "replaceState")
      .mockImplementation((data, unused, url) => {
        if (url === undefined) return;
        window.history.pushState(data, unused, url);
      });
    window.history.pushState({}, "", "/strokes-gained?utm_source=reddit&d=encoded");
  });

  it("renders the compact trust module with links and common questions", async () => {
    const user = userEvent.setup();

    renderClient();

    expect(screen.getByText("Beta")).toBeVisible();
    expect(screen.getByText("Scorecard Strokes Gained")).toBeVisible();
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

    await waitFor(() => {
      expect(mockTrackEvent).toHaveBeenCalledWith("download_png_clicked", {
        has_share_param: true,
        utm_source: "reddit",
        headline_pattern: expect.any(String),
      });
    });
  });

  it("fires calculation_completed with enriched payload on submit", async () => {
    renderClient();

    await userEvent.click(screen.getByTestId("mock-submit"));

    expect(mockTrackEvent).toHaveBeenCalledWith("calculation_completed", {
      utm_source: "reddit",
      handicap_bracket: "10-15",
      has_course_rating: true,
      total_sg: -1.5,
      methodology_version: "3.0.0",
    });
  });

  it("fires gir_estimated when estimatedCategories is non-empty", async () => {
    mockCalculateSGV3.mockReturnValueOnce({
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
      share_type: "encoded",
      surface: "results_page",
      utm_source: "reddit",
      headline_pattern: expect.any(String),
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
      share_type: "encoded",
      surface: "results_page",
      utm_source: "reddit",
      headline_pattern: expect.any(String),
    });
    await waitFor(() => {
      expect(mockTrackEvent).toHaveBeenCalledWith("download_png_clicked", {
        has_share_param: true,
        utm_source: "reddit",
        headline_pattern: expect.any(String),
      });
    });
  });
});

describe("from=history adaptation", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  beforeEach(() => {
    mockTrackEvent.mockClear();
    mockUser.current = null;
    vi.spyOn(window.history, "replaceState").mockImplementation(() => {});
  });

  it("shows 'Log Another Round' heading when from=history", () => {
    renderClient({ from: "history" });
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Log Another Round");
  });

  it("shows default heading when from is not set", () => {
    renderClient();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Strokes Gained Benchmarker");
  });

  it("shows default heading when from=history but shared link is present", () => {
    renderClient({ from: "history", initialInput: mockInput });
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Strokes Gained Benchmarker");
  });

  it("shows back link to history when from=history", () => {
    renderClient({ from: "history" });
    const backLink = screen.getByText(/Back to History/);
    expect(backLink.closest("a")).toHaveAttribute("href", "/strokes-gained/history");
  });

  it("hides sample preview when from=history", () => {
    renderClient({ from: "history", samplePreview: { total: -1.5, chartData: [] as never, categories: [] as never, courseName: "Test", handicap: 14.3, bracketLabel: "10–15 HCP" } });
    expect(screen.queryByTestId("sample-result-preview")).not.toBeInTheDocument();
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

describe("OAuth claim rehydration", () => {
  let mockStorage: Record<string, string>;
  let originalLocalStorage: Storage;

  beforeEach(() => {
    mockStorage = {};
    originalLocalStorage = globalThis.localStorage;

    Object.defineProperty(globalThis, "localStorage", {
      value: {
        getItem: (key: string) => mockStorage[key] ?? null,
        setItem: (key: string, value: string) => { mockStorage[key] = value; },
        removeItem: (key: string) => { delete mockStorage[key]; },
        get length() { return Object.keys(mockStorage).length; },
        key: (i: number) => Object.keys(mockStorage)[i] ?? null,
      },
      writable: true,
      configurable: true,
    });

    mockTrackEvent.mockClear();
    mockClaimRound.mockClear();
    vi.spyOn(window.history, "replaceState").mockImplementation(() => {});
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    Object.defineProperty(globalThis, "localStorage", {
      value: originalLocalStorage,
      writable: true,
      configurable: true,
    });
  });

  it("auto-claims a round from pending-oauth-claim when signed-in user mounts", async () => {
    // Simulate: user saved anonymously, clicked "Create account", completed Google OAuth.
    // The pending-oauth-claim key was written before the redirect.
    mockStorage["pending-oauth-claim"] = JSON.stringify({ roundId: "oauth-round-1", claimToken: "oauth-ct-1" });
    mockUser.current = { id: "user-1", email: "test@example.com" };
    mockClaimRound.mockResolvedValue({ success: true, claimedRoundId: "oauth-round-1" });

    renderClient();

    await waitFor(() => {
      expect(mockClaimRound).toHaveBeenCalledWith("oauth-round-1", "oauth-ct-1");
    });

    // Claim effect fires and analytics tracked (UI is inside results section,
    // so claim-success testid only renders when results are displayed)
    expect(mockTrackEvent).toHaveBeenCalledWith("round_claimed");

    // pending-oauth-claim consumed from localStorage
    expect(mockStorage["pending-oauth-claim"]).toBeUndefined();
  });

  it("does not auto-claim when no pending-oauth-claim exists", async () => {
    mockUser.current = { id: "user-1", email: "test@example.com" };

    renderClient();

    // Give the effect a tick to run
    await waitFor(() => {
      expect(screen.getByTestId("mock-submit")).toBeInTheDocument();
    });

    expect(mockClaimRound).not.toHaveBeenCalled();
  });

  it("does not auto-claim when user is not signed in", async () => {
    mockStorage["pending-oauth-claim"] = JSON.stringify({ roundId: "oauth-round-2", claimToken: "oauth-ct-2" });
    mockUser.current = null;

    renderClient();

    // Give effects time to settle
    await waitFor(() => {
      expect(screen.getByTestId("mock-submit")).toBeInTheDocument();
    });

    // Rehydration consumed the key, but no user → auto-claim effect does not fire
    expect(mockStorage["pending-oauth-claim"]).toBeUndefined();
    expect(mockClaimRound).not.toHaveBeenCalled();
  });

  it("fires round_claim_failed analytics when auto-claim after OAuth fails", async () => {
    mockStorage["pending-oauth-claim"] = JSON.stringify({ roundId: "oauth-round-3", claimToken: "oauth-ct-3" });
    mockUser.current = { id: "user-1", email: "test@example.com" };
    mockClaimRound.mockResolvedValue({ success: false, code: "token_expired", message: "Claim token has expired." });

    renderClient();

    await waitFor(() => {
      expect(mockClaimRound).toHaveBeenCalledWith("oauth-round-3", "oauth-ct-3");
    });

    // Claim failure analytics tracked (UI is inside results section)
    await waitFor(() => {
      expect(mockTrackEvent).toHaveBeenCalledWith("round_claim_failed", { reason: "token_expired" });
    });
  });
});

describe("Anonymous claim rehydration", () => {
  let mockStorage: Record<string, string>;
  let originalLocalStorage: Storage;

  beforeEach(() => {
    mockStorage = {};
    originalLocalStorage = globalThis.localStorage;

    Object.defineProperty(globalThis, "localStorage", {
      value: {
        getItem: (key: string) => mockStorage[key] ?? null,
        setItem: (key: string, value: string) => { mockStorage[key] = value; },
        removeItem: (key: string) => { delete mockStorage[key]; },
        get length() { return Object.keys(mockStorage).length; },
        key: (i: number) => Object.keys(mockStorage)[i] ?? null,
      },
      writable: true,
      configurable: true,
    });

    mockTrackEvent.mockClear();
    mockClaimRound.mockClear();
    mockUser.current = null;
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    Object.defineProperty(globalThis, "localStorage", {
      value: originalLocalStorage,
      writable: true,
      configurable: true,
    });
  });

  it("rehydrates the anonymous claim CTA for a matching saved round", async () => {
    mockStorage["gdv:last-anon-claim"] = JSON.stringify({
      roundId: "anon-round-1",
      claimToken: "anon-claim-1",
      input: {
        score: mockInput.score,
        course: mockInput.course,
        date: mockInput.date,
        handicapIndex: mockInput.handicapIndex,
        slopeRating: mockInput.slopeRating,
        courseRating: mockInput.courseRating,
        fairwayAttempts: mockInput.fairwayAttempts,
        fairwaysHit: mockInput.fairwaysHit,
        greensInRegulation: mockInput.greensInRegulation,
        totalPutts: mockInput.totalPutts,
        penaltyStrokes: mockInput.penaltyStrokes,
        eagles: mockInput.eagles,
        birdies: mockInput.birdies,
        pars: mockInput.pars,
        bogeys: mockInput.bogeys,
        doubleBogeys: mockInput.doubleBogeys,
        triplePlus: mockInput.triplePlus,
      },
      timestamp: new Date().toISOString(),
    });

    renderClient({ initialInput: mockInput });

    await waitFor(() => {
      expect(screen.getByTestId("claim-cta")).toBeInTheDocument();
    });

    expect(screen.queryByTestId("mock-post-results-save-cta")).toBeNull();
    expect(screen.getByRole("button", { name: "Create account" })).toBeInTheDocument();
  });

  it("does not rehydrate anonymous claim CTA for a different round", async () => {
    mockStorage["gdv:last-anon-claim"] = JSON.stringify({
      roundId: "anon-round-2",
      claimToken: "anon-claim-2",
      input: { ...mockInput, course: "Different Course" },
      timestamp: new Date().toISOString(),
    });

    renderClient({ initialInput: mockInput });

    await waitFor(() => {
      expect(screen.getByTestId("mock-post-results-save-cta")).toBeInTheDocument();
    });

    expect(screen.queryByTestId("claim-cta")).toBeNull();
  });
});
