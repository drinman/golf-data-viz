import type { RoundInput, BracketBenchmark, TotalAnchorResult } from "./types";

export function isValidForCourseAdjustment(input: RoundInput): boolean {
  return (
    input.courseRating > 0 &&
    input.slopeRating >= 55 &&
    input.slopeRating <= 155
  );
}

export function computeTotalAnchor(
  input: RoundInput,
  benchmark: BracketBenchmark
): TotalAnchorResult {
  if (isValidForCourseAdjustment(input)) {
    const peerExpectation =
      input.courseRating + (input.handicapIndex * input.slopeRating) / 113;
    const anchorValue = peerExpectation - input.score;
    const playerDifferential = input.score - input.courseRating;
    return {
      value: anchorValue,
      mode: "course_adjusted",
      playerDifferential,
      peerExpectation,
    };
  }

  // Course-neutral fallback
  return {
    value: benchmark.averageScore - input.score,
    mode: "course_neutral",
    playerDifferential: null,
    peerExpectation: benchmark.averageScore,
  };
}
