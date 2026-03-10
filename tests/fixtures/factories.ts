import type { RoundInput, RoundDetailSnapshot, StrokesGainedResult } from "@/lib/golf/types";
import type { RoundSgSnapshot } from "@/lib/golf/trends";

export function makeRound(overrides: Partial<RoundInput> = {}): RoundInput {
  return {
    course: "Test Course",
    date: "2026-02-26",
    score: 87,
    handicapIndex: 14.3,
    courseRating: 72.0,
    slopeRating: 130,
    fairwaysHit: 7,
    fairwayAttempts: 14,
    greensInRegulation: 6,
    totalPutts: 33,
    penaltyStrokes: 2,
    eagles: 0,
    birdies: 1,
    pars: 7,
    bogeys: 7,
    doubleBogeys: 2,
    triplePlus: 1,
    ...overrides,
  };
}

export function makeRoundSnapshot(
  overrides: Partial<RoundSgSnapshot> = {}
): RoundSgSnapshot {
  return {
    roundId: "test-round-1",
    playedAt: "2026-03-01",
    courseName: "Test Course",
    score: 87,
    handicapIndex: 14.3,
    sgTotal: -1.5,
    sgOffTheTee: 0.3,
    sgApproach: -0.8,
    sgAroundTheGreen: -0.5,
    sgPutting: -0.5,
    methodologyVersion: "2.0.0",
    benchmarkBracket: "10-15",
    ...overrides,
  };
}

export function makeDetailSnapshot(
  overrides: Partial<RoundDetailSnapshot> = {}
): RoundDetailSnapshot {
  return {
    roundId: "test-round-1",
    playedAt: "2026-03-08",
    courseName: "Pine Valley GC",
    score: 82,
    handicapIndex: 14.2,
    sgTotal: 1.52,
    sgOffTheTee: 0.8,
    sgApproach: 0.3,
    sgAroundTheGreen: -0.1,
    sgPutting: 0.52,
    methodologyVersion: "2.0.0",
    benchmarkBracket: "10-15",
    benchmarkVersion: "1.0.0",
    benchmarkHandicap: 14.2,
    benchmarkInterpolationMode: "standard",
    calibrationVersion: null,
    totalAnchorMode: null,
    confidenceOffTheTee: "medium",
    confidenceApproach: "high",
    confidenceAroundTheGreen: "medium",
    confidencePutting: "high",
    estimatedCategories: [],
    skippedCategories: [],
    fairwaysHit: 8,
    fairwayAttempts: 14,
    greensInRegulation: 9,
    upAndDownAttempts: null,
    upAndDownConverted: null,
    ...overrides,
  };
}

export function makeSGResult(
  overrides: Partial<StrokesGainedResult> = {}
): StrokesGainedResult {
  return {
    total: -1.5,
    categories: {
      "off-the-tee": 0.3,
      approach: -0.8,
      "around-the-green": -0.5,
      putting: -0.5,
    },
    benchmarkBracket: "10-15",
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
    ...overrides,
  };
}
