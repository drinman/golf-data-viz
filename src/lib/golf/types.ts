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

/** Confidence level for a strokes gained category */
export type ConfidenceLevel = "high" | "medium" | "low";

/** A single benchmark anchor point from the canonical source */
export interface BenchmarkAnchor {
  handicapIndex: number;
  averageScore: number;
  fairwayPercentage: number;
  girPercentage: number;
  puttsPerRound: number;
  upAndDownPercentage: number;
  penaltiesPerRound: number;
}

/** Diagnostic values computed alongside SG but not included in totals */
export interface SGDiagnostics {
  /** Impact of three-putt penalty (computed but excluded from SG total) */
  threePuttImpact: number | null;
}

/** Raw round stats as entered by the user */
export interface RoundInput {
  course: string;
  date: string;
  score: number;
  handicapIndex: number;
  courseRating: number;
  slopeRating: number;

  // Per-round aggregate stats (fairwaysHit and GIR optional — user may not track)
  fairwaysHit?: number;
  fairwayAttempts: number;
  greensInRegulation?: number;
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
  /** Categories that could not be calculated due to missing input data. Value is 0, excluded from total. */
  skippedCategories: StrokesGainedCategory[];
  /** Categories whose values were derived from estimated (not user-provided) data */
  estimatedCategories: StrokesGainedCategory[];
  /** Confidence level for each SG category */
  confidence: Record<StrokesGainedCategory, ConfidenceLevel>;
  /** Methodology version used to compute this result */
  methodologyVersion: string;
  /** Version of the benchmark data used (e.g., "1.0.0") */
  benchmarkVersion: string;
  /** Exact handicap index used for interpolation */
  benchmarkHandicap: number;
  /** Diagnostic values computed but not included in totals */
  diagnostics: SGDiagnostics;
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

/** Canonical metric keys for per-metric citation tracking */
export const CITATION_METRIC_KEYS = [
  "averageScore",
  "fairwayPercentage",
  "girPercentage",
  "puttsPerRound",
  "upAndDownPercentage",
  "penaltiesPerRound",
  "scoringDistribution",
] as const;

export type CitationMetricKey = (typeof CITATION_METRIC_KEYS)[number];

/** A single citation source for a benchmark metric */
export interface MetricCitation {
  source: string;
  url: string | null;
  publishedDate: string | null;
  accessedDate: string;
  coveredBrackets: HandicapBracket[];
}

/** Changelog entry for benchmark data versioning */
export interface ChangelogEntry {
  version: string;
  date: string;
  summary: string;
}

/** All 7 handicap brackets for coverage checks */
export const ALL_HANDICAP_BRACKETS: readonly HandicapBracket[] = [
  "0-5",
  "5-10",
  "10-15",
  "15-20",
  "20-25",
  "25-30",
  "30+",
] as const;

/** Benchmark provenance metadata for trust signals */
export interface BenchmarkMeta {
  version: string;
  updatedAt: string;
  provisional: boolean;
  sources: string[];
  citations: Record<CitationMetricKey, MetricCitation[]>;
  changelog: ChangelogEntry[];
}

/** Chart-ready data shape for Nivo radar chart */
export interface RadarChartDatum {
  category: string;
  player: number;
  /** True when the category was skipped due to missing input data */
  skipped?: boolean;
}
