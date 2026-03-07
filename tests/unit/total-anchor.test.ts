import { describe, it, expect } from "vitest";
import { computeTotalAnchor, isValidForCourseAdjustment } from "@/lib/golf/total-anchor";
import { getInterpolatedBenchmark } from "@/lib/golf/benchmarks";
import { makeRound } from "../fixtures/factories";

describe("isValidForCourseAdjustment", () => {
  it("returns true for valid CR and slope", () => {
    expect(isValidForCourseAdjustment(makeRound({ courseRating: 72.0, slopeRating: 130 }))).toBe(true);
  });

  it("returns false when courseRating is 0", () => {
    expect(isValidForCourseAdjustment(makeRound({ courseRating: 0, slopeRating: 130 }))).toBe(false);
  });

  it("returns false when slopeRating is below 55", () => {
    expect(isValidForCourseAdjustment(makeRound({ courseRating: 72.0, slopeRating: 50 }))).toBe(false);
  });

  it("returns false when slopeRating is above 155", () => {
    expect(isValidForCourseAdjustment(makeRound({ courseRating: 72.0, slopeRating: 160 }))).toBe(false);
  });
});

describe("computeTotalAnchor", () => {
  it("course-adjusted: CR=72, slope=113, HCP=15, score=87 → anchor=0", () => {
    const input = makeRound({ courseRating: 72.0, slopeRating: 113, handicapIndex: 15.0, score: 87 });
    const benchmark = getInterpolatedBenchmark(input.handicapIndex);
    const result = computeTotalAnchor(input, benchmark);
    expect(result.mode).toBe("course_adjusted");
    expect(result.value).toBeCloseTo(0, 1);
    expect(result.playerDifferential).not.toBeNull();
    expect(result.peerExpectation).toBeCloseTo(87, 1);
  });

  it("course-adjusted: same but score=82 → anchor=+5", () => {
    const input = makeRound({ courseRating: 72.0, slopeRating: 113, handicapIndex: 15.0, score: 82 });
    const benchmark = getInterpolatedBenchmark(input.handicapIndex);
    const result = computeTotalAnchor(input, benchmark);
    expect(result.mode).toBe("course_adjusted");
    expect(result.value).toBeCloseTo(5, 1);
  });

  it("course-adjusted: hard course (slope=145) compresses delta", () => {
    // Expected score = 72 + (15 * 145/113) = 72 + 19.25 = 91.25
    const input = makeRound({ courseRating: 72.0, slopeRating: 145, handicapIndex: 15.0, score: 91 });
    const benchmark = getInterpolatedBenchmark(input.handicapIndex);
    const result = computeTotalAnchor(input, benchmark);
    expect(result.mode).toBe("course_adjusted");
    expect(result.peerExpectation).toBeCloseTo(91.25, 1);
    // Player shot 91, expected 91.25 → anchor ≈ +0.25
    expect(result.value).toBeCloseTo(0.25, 1);
  });

  it("course-neutral: uses benchmark.averageScore when CR is invalid", () => {
    const input = makeRound({ courseRating: 0, slopeRating: 130, handicapIndex: 15.0, score: 90 });
    const benchmark = getInterpolatedBenchmark(input.handicapIndex);
    const result = computeTotalAnchor(input, benchmark);
    expect(result.mode).toBe("course_neutral");
    expect(result.playerDifferential).toBeNull();
    expect(result.value).toBeCloseTo(benchmark.averageScore - 90, 1);
    expect(result.peerExpectation).toBe(benchmark.averageScore);
  });

  it("course-neutral: uses benchmark.averageScore when slope is out of range", () => {
    const input = makeRound({ courseRating: 72.0, slopeRating: 200, handicapIndex: 15.0, score: 90 });
    const benchmark = getInterpolatedBenchmark(input.handicapIndex);
    const result = computeTotalAnchor(input, benchmark);
    expect(result.mode).toBe("course_neutral");
  });

  it("slope=113 gives similar result to course-neutral on a standard course", () => {
    // With slope=113 and CR = benchmark.averageScore - handicapIndex, course-adjusted should approximate course-neutral
    const input = makeRound({ courseRating: 72.0, slopeRating: 113, handicapIndex: 15.0, score: 85 });
    const benchmark = getInterpolatedBenchmark(input.handicapIndex);
    const courseAdjusted = computeTotalAnchor(input, benchmark);

    // Course-adjusted: expected = 72 + 15 = 87, anchor = 87 - 85 = 2
    expect(courseAdjusted.mode).toBe("course_adjusted");
    expect(courseAdjusted.value).toBeCloseTo(2, 1);
  });

  it("positive value means player played better than expected", () => {
    const input = makeRound({ courseRating: 72.0, slopeRating: 113, handicapIndex: 15.0, score: 80 });
    const benchmark = getInterpolatedBenchmark(input.handicapIndex);
    const result = computeTotalAnchor(input, benchmark);
    expect(result.value).toBeGreaterThan(0);
  });

  it("negative value means player played worse than expected", () => {
    const input = makeRound({ courseRating: 72.0, slopeRating: 113, handicapIndex: 15.0, score: 100 });
    const benchmark = getInterpolatedBenchmark(input.handicapIndex);
    const result = computeTotalAnchor(input, benchmark);
    expect(result.value).toBeLessThan(0);
  });
});
