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

  it("shows one global note when categories are estimated", () => {
    const result = makeSGResult({
      estimatedCategories: ["approach", "around-the-green"],
    });

    render(<ResultsSummary result={result} benchmarkMeta={meta} />);

    expect(
      screen.getByText(/Categories marked Est\. are approximated from related inputs\./)
    ).toBeVisible();
  });

  it("toggles estimate help with click and Escape, keeping only one popover open", async () => {
    const user = userEvent.setup();
    const result = makeSGResult({
      estimatedCategories: ["approach", "around-the-green"],
    });

    render(<ResultsSummary result={result} benchmarkMeta={meta} />);

    const estButtons = screen.getAllByRole("button", { name: "Est." });
    expect(estButtons).toHaveLength(2);

    await user.click(estButtons[0]);
    expect(
      screen.getByText(
        "This category is estimated from related stats because not all inputs were provided."
      )
    ).toBeVisible();

    await user.click(estButtons[1]);
    expect(
      screen.getByText(
        "This category is estimated from related stats because not all inputs were provided."
      )
    ).toBeVisible();
    expect(
      screen.getAllByText(
        "This category is estimated from related stats because not all inputs were provided."
      )
    ).toHaveLength(1);

    fireEvent.keyDown(document, { key: "Escape" });
    expect(
      screen.queryByText(
        "This category is estimated from related stats because not all inputs were provided."
      )
    ).toBeNull();
  });
});
