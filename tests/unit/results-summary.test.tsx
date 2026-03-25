// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ResultsSummary } from "@/app/(tools)/strokes-gained/_components/results-summary";
import { makeSGResult } from "../fixtures/factories";
import type { BenchmarkMeta } from "@/lib/golf/types";
import { makeEmptyCitations } from "../helpers";

afterEach(cleanup);

const meta: BenchmarkMeta = {
  version: "0.2.0",
  updatedAt: "2026-03-01",
  provisional: true,
  sources: [],
  citations: makeEmptyCitations(),
  changelog: [{ version: "0.2.0", date: "2026-03-01", summary: "Test" }],
};

describe("Biggest Strength / Biggest Weakness callouts", () => {
  it("excludes estimated categories from callouts", () => {
    const result = makeSGResult({
      categories: {
        "off-the-tee": 0.3,
        approach: 2.0, // highest, but estimated
        "around-the-green": -1.5, // lowest, but estimated
        putting: -0.5,
      },
      estimatedCategories: ["approach", "around-the-green"],
    });

    render(<ResultsSummary result={result} benchmarkMeta={meta} />);

    // Callouts should show OTT (strength) and Putting (weakness), not estimated categories
    expect(screen.getByText("Biggest Strength")).toBeTruthy();
    const strengthLabel = screen.getByText("Biggest Strength").closest("div")?.parentElement;
    expect(strengthLabel?.textContent).toContain("Off the Tee");

    expect(screen.getByText("Biggest Weakness")).toBeTruthy();
    const weaknessLabel = screen.getByText("Biggest Weakness").closest("div")?.parentElement;
    expect(weaknessLabel?.textContent).toContain("Putting");
  });

  it("renders callouts when at least 2 non-estimated categories exist", () => {
    const result = makeSGResult({
      estimatedCategories: ["approach", "around-the-green"],
    });

    render(<ResultsSummary result={result} benchmarkMeta={meta} />);

    expect(screen.getByText("Biggest Strength")).toBeTruthy();
    expect(screen.getByText("Biggest Weakness")).toBeTruthy();
  });

  it("does NOT render callouts when fewer than 2 non-estimated categories exist", () => {
    const result = makeSGResult({
      estimatedCategories: ["approach", "around-the-green", "putting"],
    });

    render(<ResultsSummary result={result} benchmarkMeta={meta} />);

    expect(screen.queryByText("Biggest Strength")).toBeNull();
    expect(screen.queryByText("Biggest Weakness")).toBeNull();
  });
});

describe("Peer-average neutral state", () => {
  it("shows neutral styling and Peer average label for near-zero categories", () => {
    const result = makeSGResult({
      categories: {
        "off-the-tee": 0.03,
        approach: -0.03,
        "around-the-green": -0.5,
        putting: 0.5,
      },
    });

    render(<ResultsSummary result={result} benchmarkMeta={meta} />);

    const peerLabels = screen.getAllByTestId("peer-average-label");
    expect(peerLabels.length).toBe(2); // OTT and Approach are near-zero
    expect(peerLabels[0].textContent).toBe("Peer average");
  });

  it("excludes peer-average categories from Biggest Strength/Weakness callouts", () => {
    const result = makeSGResult({
      categories: {
        "off-the-tee": 0.03,
        approach: -0.03,
        "around-the-green": -0.5,
        putting: 0.5,
      },
    });

    render(<ResultsSummary result={result} benchmarkMeta={meta} />);

    const strengthLabel = screen.getByText("Biggest Strength").closest("div")?.parentElement;
    expect(strengthLabel?.textContent).toContain("Putting");

    const weaknessLabel = screen.getByText("Biggest Weakness").closest("div")?.parentElement;
    expect(weaknessLabel?.textContent).toContain("Around the Green");
  });

  it("does not display -0.00 in rendered output", () => {
    const result = makeSGResult({
      categories: {
        "off-the-tee": -0.03,
        approach: 0.03,
        "around-the-green": -0.5,
        putting: 0.5,
      },
    });

    const { container } = render(<ResultsSummary result={result} benchmarkMeta={meta} />);
    expect(container.textContent).not.toContain("-0.00");
    expect(container.textContent).not.toContain("+0.00");
  });

  it("shows neutral hero card styling when total is near-zero", () => {
    const result = makeSGResult({
      total: 0.02,
      categories: {
        "off-the-tee": 0.03,
        approach: -0.03,
        "around-the-green": -0.01,
        putting: 0.03,
      },
    });

    const { container } = render(<ResultsSummary result={result} benchmarkMeta={meta} />);
    // Total should show "0.00" without sign
    expect(container.textContent).toContain("0.00");
  });
});

describe("Plus handicap disclosure", () => {
  it("shows plus handicap disclosure for plus bracket", () => {
    const result = makeSGResult({
      benchmarkBracket: "plus",
      benchmarkInterpolationMode: "scratch_clamped",
    });

    render(<ResultsSummary result={result} benchmarkMeta={meta} />);

    expect(screen.getByTestId("plus-handicap-disclosure")).toBeVisible();
    expect(
      screen.getByText(/Category benchmarks use scratch \(0 HCP\) peer data/)
    ).toBeVisible();
  });

  it("does not show plus disclosure for standard bracket", () => {
    const result = makeSGResult({ benchmarkBracket: "10-15" });

    render(<ResultsSummary result={result} benchmarkMeta={meta} />);

    expect(screen.queryByTestId("plus-handicap-disclosure")).toBeNull();
  });

  it("shows estimation caveat when estimatedCategories present", () => {
    const result = makeSGResult({
      benchmarkBracket: "plus",
      benchmarkInterpolationMode: "scratch_clamped",
      estimatedCategories: ["approach"],
    });

    render(<ResultsSummary result={result} benchmarkMeta={meta} />);

    expect(
      screen.getByText(/Some categories were estimated/)
    ).toBeVisible();
  });
});

describe("Results trust cues", () => {
  it("shows a 30+ reliability warning only for the 30+ bracket", () => {
    const thirtyPlusResult = makeSGResult({ benchmarkBracket: "30+" });
    const regularResult = makeSGResult({ benchmarkBracket: "10-15" });

    const { rerender } = render(
      <ResultsSummary result={thirtyPlusResult} benchmarkMeta={meta} />
    );

    expect(
      screen.getByText(
        "The 30+ bracket uses estimated benchmarks with limited published data. Results are less reliable than other brackets."
      )
    ).toBeVisible();

    rerender(<ResultsSummary result={regularResult} benchmarkMeta={meta} />);

    expect(
      screen.queryByText(
        "The 30+ bracket uses estimated benchmarks with limited published data. Results are less reliable than other brackets."
      )
    ).toBeNull();
  });

  it("shows confidence footer text", () => {
    const result = makeSGResult({
      estimatedCategories: ["approach", "around-the-green"],
    });

    render(<ResultsSummary result={result} benchmarkMeta={meta} />);

    expect(
      screen.getByText(/Confidence levels reflect input completeness/)
    ).toBeVisible();
  });

  it("shows confidence badges for each category", () => {
    const result = makeSGResult({
      estimatedCategories: ["approach", "around-the-green"],
    });

    render(<ResultsSummary result={result} benchmarkMeta={meta} />);

    // Confidence badges render as interactive buttons with aria-label
    const badges = screen.getAllByRole("button", { name: /confidence/ });
    expect(badges.length).toBeGreaterThan(0);
  });

  it("keeps only one confidence popover open and dismisses on Escape", async () => {
    const user = userEvent.setup();
    const result = makeSGResult();

    render(<ResultsSummary result={result} benchmarkMeta={meta} />);

    const badges = screen.getAllByRole("button", { name: /confidence/ });
    expect(badges.length).toBe(4);

    // Open first badge
    await user.click(badges[0]);
    expect(screen.getAllByRole("dialog")).toHaveLength(1);

    // Click second badge — first should close, second opens
    await user.click(badges[1]);
    expect(screen.getAllByRole("dialog")).toHaveLength(1);

    // Escape dismisses
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("dismisses popover on click outside", async () => {
    const user = userEvent.setup();
    const result = makeSGResult();

    render(<ResultsSummary result={result} benchmarkMeta={meta} />);

    const badges = screen.getAllByRole("button", { name: /confidence/ });

    // Open a badge
    await user.click(badges[0]);
    expect(screen.getAllByRole("dialog")).toHaveLength(1);

    // Click outside (on the document body)
    fireEvent.mouseDown(document.body);
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});

describe("Percentile pills", () => {
  it("renders percentile short labels inside rounded DS pills", () => {
    const result = makeSGResult({
      categories: {
        "off-the-tee": 0.2,
        approach: 0.6,
        "around-the-green": -0.4,
        putting: 0.3,
      },
    });

    render(<ResultsSummary result={result} benchmarkMeta={meta} />);

    const percentilePills = screen.getAllByText(/%ile$/);
    expect(percentilePills.length).toBeGreaterThan(0);
    expect(percentilePills[0].className).toContain("rounded-full");
    expect(percentilePills[0].className).toContain("text-[9px]");
    expect(screen.getAllByText(/of 10–15 HCP golfers/).length).toBeGreaterThan(0);
  });
});

describe("Presentation trust gating", () => {
  const emptyCategoryReasons = {
    "off-the-tee": [],
    approach: [],
    "around-the-green": [],
    putting: [],
  };

  it("shows a Round Summary trust card and suppresses editorial modules for caveated rounds", () => {
    const result = makeSGResult({
      categories: {
        "off-the-tee": 0.2,
        approach: 1.4,
        "around-the-green": -0.8,
        putting: 0.6,
      },
    });

    render(
      <ResultsSummary
        result={result}
        benchmarkMeta={meta}
        presentationTrust={{
          mode: "caveated",
          promotableCategories: ["off-the-tee"],
          roundReasons: ["atg_fallback_additional_suppression"],
          categoryReasons: {
            ...emptyCategoryReasons,
            "around-the-green": ["atg_fallback"],
            approach: ["atg_fallback_scoring_divergence"],
            putting: ["atg_fallback_approach_instability"],
          },
        }}
      />
    );

    expect(screen.getByText("Round Summary")).toBeVisible();
    expect(
      screen.getByText(
        "Your total SG is course-adjusted. Individual category estimates are based on scorecard stats and may not reflect shot-by-shot performance."
      )
    ).toBeVisible();
    expect(screen.queryByText("Key Insights")).toBeNull();
    expect(screen.queryByText("Biggest Strength")).toBeNull();
    expect(screen.queryByText("Biggest Weakness")).toBeNull();
    expect(screen.queryByTestId("percentile-standout")).toBeNull();
  });

  it("uses stronger amber styling for quarantined rounds", () => {
    render(
      <ResultsSummary
        result={makeSGResult()}
        benchmarkMeta={meta}
        presentationTrust={{
          mode: "quarantined",
          promotableCategories: [],
          roundReasons: ["round_trust_quarantined"],
          categoryReasons: emptyCategoryReasons,
        }}
      />
    );

    const card = screen.getByTestId("presentation-trust-card");
    expect(card.className).toContain("border-amber-200");
    expect(card.className).toContain("bg-amber-50");
  });
});
