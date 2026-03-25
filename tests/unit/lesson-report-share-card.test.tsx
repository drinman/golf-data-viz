// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { LessonReportShareCard } from "@/app/(tools)/strokes-gained/lesson-prep/_components/lesson-report-share-card";
import type { LessonReportSnapshot } from "@/lib/golf/round-queries";
import type { LessonReportData } from "@/lib/golf/lesson-report";

afterEach(cleanup);

function makeSnapshot(
  overrides: {
    focusAreaSg?: number;
    strongestAreaSg?: number;
  } = {}
): LessonReportSnapshot {
  const reportData: LessonReportData = {
    reportVersion: "1",
    generatedAt: "2026-03-19T00:00:00Z",
    trustMode: "assertive",
    assertiveRoundCount: 3,
    summary: {
      roundCount: 3,
      averageScore: 86,
      averageSgTotal: -0.5,
      averageHandicapIndex: 14,
      startDate: "2026-03-01",
      endDate: "2026-03-15",
      averageRadar: [],
    },
    selectedRounds: [],
    trendSeries: [],
    trendSignal: {
      category: null,
      label: "Insufficient data",
      copyText: "Not enough rounds for trend analysis.",
      confidence: "low",
    },
    focusArea: {
      category: "around-the-green",
      label: "Around the Green",
      averageSg: overrides.focusAreaSg ?? -1.2,
      confidence: "high",
    },
    strongestArea: {
      category: "putting",
      label: "Putting",
      averageSg: overrides.strongestAreaSg ?? 0.8,
      confidence: "high",
    },
    confidenceSummary: {
      overall: "high",
      byCategory: {
        "off-the-tee": "high",
        approach: "high",
        "around-the-green": "high",
        putting: "high",
      },
    },
    methodologyMix: false,
    methodologyVersions: ["3.2.0"],
    caveats: [],
  };

  return {
    id: "test-report-1",
    userId: "user-1",
    selectedRoundIds: ["r1", "r2", "r3"],
    selectionHash: "abc123",
    roundCount: 3,
    reportVersion: "1",
    generatedAt: "2026-03-19T00:00:00Z",
    regeneratedAt: null,
    reportData,
  };
}

describe("LessonReportShareCard neutral styling", () => {
  it("renders focus area in red when clearly negative", () => {
    const { container } = render(
      <LessonReportShareCard snapshot={makeSnapshot({ focusAreaSg: -1.2 })} />
    );

    const focusCard = container.querySelector("[data-testid='lesson-report-share-card']");
    const sgValues = focusCard!.querySelectorAll(".font-mono.text-lg");
    // First mono value is focus area
    expect(sgValues[0].className).toContain("text-data-negative");
    expect(sgValues[0].textContent).toBe("-1.20");
  });

  it("renders strongest area in green when clearly positive", () => {
    const { container } = render(
      <LessonReportShareCard snapshot={makeSnapshot({ strongestAreaSg: 0.8 })} />
    );

    const shareCard = container.querySelector("[data-testid='lesson-report-share-card']");
    const sgValues = shareCard!.querySelectorAll(".font-mono.text-lg");
    // Second mono value is strongest area
    expect(sgValues[1].className).toContain("text-data-positive");
    expect(sgValues[1].textContent).toBe("+0.80");
  });

  it("renders focus area in neutral gray when near-zero", () => {
    const { container } = render(
      <LessonReportShareCard snapshot={makeSnapshot({ focusAreaSg: -0.03 })} />
    );

    const shareCard = container.querySelector("[data-testid='lesson-report-share-card']");
    const sgValues = shareCard!.querySelectorAll(".font-mono.text-lg");
    expect(sgValues[0].className).toContain("text-neutral-500");
    expect(sgValues[0].className).not.toContain("text-data-negative");
    expect(sgValues[0].textContent).toBe("0.00");
  });

  it("renders strongest area in neutral gray when near-zero", () => {
    const { container } = render(
      <LessonReportShareCard snapshot={makeSnapshot({ strongestAreaSg: 0.04 })} />
    );

    const shareCard = container.querySelector("[data-testid='lesson-report-share-card']");
    const sgValues = shareCard!.querySelectorAll(".font-mono.text-lg");
    expect(sgValues[1].className).toContain("text-neutral-500");
    expect(sgValues[1].className).not.toContain("text-data-positive");
    expect(sgValues[1].textContent).toBe("0.00");
  });

  it("does not render +0.00 or -0.00 for near-zero values", () => {
    const { container } = render(
      <LessonReportShareCard
        snapshot={makeSnapshot({ focusAreaSg: -0.02, strongestAreaSg: 0.03 })}
      />
    );

    expect(container.textContent).not.toContain("+0.00");
    expect(container.textContent).not.toContain("-0.00");
  });

  it("uses the DS export shell sizing", () => {
    const { container } = render(<LessonReportShareCard snapshot={makeSnapshot()} />);

    const shareCard = container.querySelector("[data-testid='lesson-report-share-card']");
    expect(shareCard?.className).toContain("w-[600px]");
    expect(shareCard?.className).toContain("rounded-xl");
  });
});
