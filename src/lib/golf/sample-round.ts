import type { RoundInput, StrokesGainedResult, RadarChartDatum, StrokesGainedCategory } from "./types";
import { getInterpolatedBenchmark } from "./benchmarks";
import { calculateStrokesGained, toRadarChartData } from "./strokes-gained";
import { BRACKET_LABELS, CATEGORY_LABELS } from "./constants";

/** Realistic 14-handicap round at Torrey Pines South (target user persona). */
export const SAMPLE_ROUND: RoundInput = {
  course: "Torrey Pines South",
  date: "2026-03-01",
  score: 87,
  handicapIndex: 14.3,
  courseRating: 74.6,
  slopeRating: 136,
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
};

export interface CategoryValue {
  label: string;
  value: number;
}

/** Data shape consumed by both preview components and passed through server → client boundary. */
export interface SamplePreviewData {
  chartData: RadarChartDatum[];
  categories: CategoryValue[];
  total: number;
  bracketLabel: string;
  courseName: string;
  handicap: number;
}

export interface SampleResult {
  input: RoundInput;
  result: StrokesGainedResult;
  chartData: RadarChartDatum[];
  bracketLabel: string;
  /** Pre-built preview data ready to pass to components. */
  preview: SamplePreviewData;
}

/** Run the real SG pipeline on the sample round. Deterministic — auto-updates when benchmarks change. */
export function getSampleResult(): SampleResult {
  const benchmark = getInterpolatedBenchmark(SAMPLE_ROUND.handicapIndex);
  const result = calculateStrokesGained(SAMPLE_ROUND, benchmark);
  const chartData = toRadarChartData(result);
  const bracketLabel = BRACKET_LABELS[result.benchmarkBracket];

  const categories = (
    Object.keys(CATEGORY_LABELS) as StrokesGainedCategory[]
  ).map((key) => ({
    label: CATEGORY_LABELS[key],
    value: result.categories[key],
  }));

  const preview: SamplePreviewData = {
    chartData,
    categories,
    total: result.total,
    bracketLabel,
    courseName: SAMPLE_ROUND.course,
    handicap: SAMPLE_ROUND.handicapIndex,
  };

  return { input: SAMPLE_ROUND, result, chartData, bracketLabel, preview };
}
