import type { RoundInput, StrokesGainedResult } from "@/lib/golf/types";

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
    ...overrides,
  };
}
