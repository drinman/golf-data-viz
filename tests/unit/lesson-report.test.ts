import { describe, it, expect } from "vitest";
import type { RoundDetailSnapshot } from "@/lib/golf/types";
import {
  LESSON_REPORT_VERSION,
  aggregateCategoryConfidence,
  aggregateOverallConfidence,
  buildLessonReportData,
  buildSelectionHash,
} from "@/lib/golf/lesson-report";
import { makeDetailSnapshot } from "../fixtures/factories";

function makeSnapshots(
  overrides: Partial<RoundDetailSnapshot>[] = []
): RoundDetailSnapshot[] {
  return overrides.map((override, index) =>
    makeDetailSnapshot({
      roundId: `round-${index + 1}`,
      playedAt: `2026-03-0${index + 1}`,
      ...override,
    })
  );
}

describe("buildSelectionHash", () => {
  it("is stable regardless of round selection order", () => {
    const a = buildSelectionHash(["c", "a", "b"]);
    const b = buildSelectionHash(["a", "b", "c"]);

    expect(a).toBe(b);
  });
});

describe("aggregate confidence", () => {
  const snapshots = makeSnapshots([
    {
      confidenceOffTheTee: "high",
      confidenceApproach: "high",
      confidenceAroundTheGreen: "medium",
      confidencePutting: "high",
    },
    {
      confidenceOffTheTee: "high",
      confidenceApproach: "medium",
      confidenceAroundTheGreen: "medium",
      confidencePutting: "high",
    },
    {
      confidenceOffTheTee: "low",
      confidenceApproach: "high",
      confidenceAroundTheGreen: "medium",
      confidencePutting: "high",
    },
  ]);

  it("rolls category confidence to high/medium/low per spec", () => {
    const result = aggregateCategoryConfidence(snapshots);

    expect(result["off-the-tee"]).toBe("low");
    expect(result.approach).toBe("medium");
    expect(result["around-the-green"]).toBe("medium");
    expect(result.putting).toBe("high");
  });

  it("uses the worst category confidence for the overall report", () => {
    const byCategory = aggregateCategoryConfidence(snapshots);
    expect(aggregateOverallConfidence(byCategory)).toBe("low");
  });
});

describe("buildLessonReportData", () => {
  it("stamps the current report version and early-signal caveat for 3 rounds", () => {
    const report = buildLessonReportData(makeSnapshots([
      {
        score: 84,
        sgTotal: -0.4,
        sgOffTheTee: -0.1,
        sgApproach: -0.5,
        sgAroundTheGreen: -0.2,
        sgPutting: 0.4,
      },
      {
        score: 86,
        sgTotal: -0.7,
        sgOffTheTee: 0.1,
        sgApproach: -0.6,
        sgAroundTheGreen: -0.1,
        sgPutting: -0.1,
      },
      {
        score: 88,
        sgTotal: -1.0,
        sgOffTheTee: 0.2,
        sgApproach: -0.7,
        sgAroundTheGreen: -0.2,
        sgPutting: -0.3,
      },
    ]));

    expect(report.reportVersion).toBe(LESSON_REPORT_VERSION);
    expect(report.summary.roundCount).toBe(3);
    expect(report.caveats).toContain(
      "Trend signals are still early with only 3-4 rounds selected."
    );
    expect(report.trendSignal.confidence).toBe("recent_movement");
  });

  it("excludes low-confidence categories from the primary focus area ranking", () => {
    const report = buildLessonReportData(makeSnapshots([
      {
        sgOffTheTee: -1.4,
        sgApproach: -0.6,
        sgAroundTheGreen: -0.3,
        sgPutting: 0.2,
        confidenceOffTheTee: "low",
        confidenceApproach: "high",
        confidenceAroundTheGreen: "medium",
        confidencePutting: "high",
      },
      {
        sgOffTheTee: -1.0,
        sgApproach: -0.5,
        sgAroundTheGreen: -0.1,
        sgPutting: 0.4,
        confidenceOffTheTee: "high",
        confidenceApproach: "high",
        confidenceAroundTheGreen: "medium",
        confidencePutting: "high",
      },
      {
        sgOffTheTee: -1.2,
        sgApproach: -0.7,
        sgAroundTheGreen: -0.2,
        sgPutting: 0.1,
        confidenceOffTheTee: "high",
        confidenceApproach: "high",
        confidenceAroundTheGreen: "medium",
        confidencePutting: "high",
      },
    ]));

    expect(report.focusArea.category).toBe("approach");
    expect(report.focusArea.confidence).toBe("high");
  });

  it("flags methodology mix when rounds span versions", () => {
    const report = buildLessonReportData(makeSnapshots([
      { methodologyVersion: "2.0.0" },
      { methodologyVersion: "3.1.0" },
      { methodologyVersion: "3.1.0" },
    ]));

    expect(report.methodologyMix).toBe(true);
    expect(report.caveats).toContain(
      "Selected rounds span multiple methodology versions. Treat trend comparisons as directional."
    );
  });

  it("uses developing-pattern language for 5+ rounds", () => {
    const report = buildLessonReportData(makeSnapshots([
      { sgPutting: -0.1 },
      { sgPutting: -0.2 },
      { sgPutting: -0.3 },
      { sgPutting: -0.4 },
      { sgPutting: -0.5 },
    ]));

    expect(report.trendSignal.confidence).toBe("emerging_pattern");
    expect(report.caveats).not.toContain(
      "Trend signals are still early with only 3-4 rounds selected."
    );
  });
});
