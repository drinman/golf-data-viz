// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { SummaryStats } from "@/app/(tools)/strokes-gained/history/_components/history-summary-stats";

describe("SummaryStats", () => {
  afterEach(cleanup);

  it("renders safe placeholders for empty input", () => {
    render(<SummaryStats rounds={[]} />);

    expect(screen.getByText("Rounds Played")).toBeInTheDocument();
    expect(screen.getByText("0")).toBeInTheDocument();
    expect(screen.getAllByText("—")).toHaveLength(2);
  });
});
