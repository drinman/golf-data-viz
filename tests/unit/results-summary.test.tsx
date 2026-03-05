// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
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
