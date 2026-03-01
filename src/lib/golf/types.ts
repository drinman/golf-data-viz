/**
 * Core golf domain types for the Golf Data Viz platform.
 *
 * These types model round data, strokes gained categories,
 * and handicap benchmark brackets.
 */

/** Handicap bracket for peer benchmarking */
export type HandicapBracket =
  | "0-5"
  | "5-10"
  | "10-15"
  | "15-20"
  | "20-25"
  | "25-30"
  | "30+";

/** Strokes Gained categories (standard PGA methodology adapted for amateurs) */
export type StrokesGainedCategory =
  | "off-the-tee"
  | "approach"
  | "around-the-green"
  | "putting";

/** Raw round stats as entered by the user */
export interface RoundInput {
  course: string;
  date: string;
  score: number;
  handicapIndex: number;
  courseRating: number;
  slopeRating: number;

  // Per-round aggregate stats
  fairwaysHit: number;
  fairwayAttempts: number;
  greensInRegulation: number;
  totalPutts: number;
  penaltyStrokes: number;

  // Scoring distribution
  eagles: number;
  birdies: number;
  pars: number;
  bogeys: number;
  doubleBogeys: number;
  triplePlus: number;

  // Optional detailed stats
  upAndDownAttempts?: number;
  upAndDownConverted?: number;
  sandSaves?: number;
  sandSaveAttempts?: number;
  threePutts?: number;
}

/** Calculated strokes gained breakdown */
export interface StrokesGainedResult {
  total: number;
  categories: Record<StrokesGainedCategory, number>;
  /** Which handicap bracket the comparison is against */
  benchmarkBracket: HandicapBracket;
}

/** Benchmark data for a single handicap bracket */
export interface BracketBenchmark {
  bracket: HandicapBracket;
  averageScore: number;
  fairwayPercentage: number;
  girPercentage: number;
  puttsPerRound: number;
  upAndDownPercentage: number;
  penaltiesPerRound: number;
  /** Scoring distribution averages */
  scoring: {
    eaglesPerRound: number;
    birdiesPerRound: number;
    parsPerRound: number;
    bogeysPerRound: number;
    doublesPerRound: number;
    triplePlusPerRound: number;
  };
}

/** Benchmark provenance metadata for trust signals */
export interface BenchmarkMeta {
  version: string;
  updatedAt: string;
  provisional: boolean;
  sources: string[];
}

/** Chart-ready data shape for Nivo radar chart */
export interface RadarChartDatum {
  category: string;
  player: number;
}
