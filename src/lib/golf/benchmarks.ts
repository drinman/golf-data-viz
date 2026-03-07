/**
 * Handicap peer benchmark data and lookup utilities.
 *
 * Sources for benchmark data:
 * - USGA/R&A handicap statistics
 * - Arccos aggregate data (public reports)
 * - Shot Scope performance data (by handicap band)
 * - Lou Stagner's published amateur statistics
 */

import type {
  BenchmarkAnchor,
  BenchmarkMeta,
  BracketBenchmark,
  CitationMetricKey,
  ChangelogEntry,
  HandicapBracket,
  MetricCitation,
} from "./types";
import { ALL_HANDICAP_BRACKETS } from "./types";
import rawData from "@/data/benchmarks/handicap-brackets.json";

interface BenchmarkFile {
  version: string;
  updatedAt: string;
  provisional: boolean;
  sources: string[];
  methodology: string;
  sampleSizeByBracket: Record<string, number | null>;
  notes: string[];
  anchors: BenchmarkAnchor[];
  citations: Record<CitationMetricKey, MetricCitation[]>;
  changelog: ChangelogEntry[];
  brackets: BracketBenchmark[];
}

const data = rawData as BenchmarkFile;

/** Load all bracket benchmarks from static JSON. */
export function loadBrackets(): BracketBenchmark[] {
  return data.brackets;
}

/** Get benchmark provenance metadata for trust signals. */
export function getBenchmarkMeta(): BenchmarkMeta {
  return {
    version: data.version,
    updatedAt: data.updatedAt,
    provisional: data.provisional,
    sources: data.sources ?? [],
    citations: data.citations,
    changelog: data.changelog,
  };
}

/** Derive display status from a metric's citation array. */
export function getCitationStatus(
  citations: MetricCitation[]
): "pending" | "partial" | "sourced" {
  const withCoverage = citations.filter((c) => c.coveredBrackets.length > 0);
  if (withCoverage.length === 0) return "pending";

  const covered = new Set(withCoverage.flatMap((c) => c.coveredBrackets));
  const allCovered = ALL_HANDICAP_BRACKETS.every((b) => covered.has(b));
  return allCovered ? "sourced" : "partial";
}

/** Map handicap index to bracket label. */
function handicapToBracketLabel(index: number): HandicapBracket {
  if (!Number.isFinite(index) || index < 0 || index > 54) {
    throw new RangeError(
      `Handicap index must be between 0 and 54, got ${index}`
    );
  }
  if (index < 5) return "0-5";
  if (index < 10) return "5-10";
  if (index < 15) return "10-15";
  if (index < 20) return "15-20";
  if (index < 25) return "20-25";
  if (index < 30) return "25-30";
  return "30+";
}

/** Get the benchmark for a given handicap index (snap-to-nearest bracket). Display-only. */
export function getBracketForHandicap(index: number): BracketBenchmark {
  const label = handicapToBracketLabel(index);
  const bracket = data.brackets.find((b) => b.bracket === label);
  if (!bracket) {
    throw new Error(`Bracket not found for label: ${label}`);
  }
  return bracket;
}

/** Sorted anchors from the benchmark data file. */
const sortedAnchors: BenchmarkAnchor[] = [...data.anchors].sort(
  (a, b) => a.handicapIndex - b.handicapIndex
);

/** Interpolate a BenchmarkAnchor for an exact handicap index. */
export function interpolateBenchmark(handicapIndex: number): BenchmarkAnchor {
  if (!Number.isFinite(handicapIndex) || handicapIndex < 0 || handicapIndex > 54) {
    throw new RangeError(
      `Handicap index must be between 0 and 54, got ${handicapIndex}`
    );
  }

  const first = sortedAnchors[0];
  const last = sortedAnchors[sortedAnchors.length - 1];

  // Clamp to boundaries
  if (handicapIndex <= first.handicapIndex) return { ...first, handicapIndex };
  if (handicapIndex >= last.handicapIndex) return { ...last, handicapIndex };

  // Find straddling anchors
  let lower = first;
  let upper = sortedAnchors[1];
  for (let i = 1; i < sortedAnchors.length; i++) {
    if (sortedAnchors[i].handicapIndex >= handicapIndex) {
      lower = sortedAnchors[i - 1];
      upper = sortedAnchors[i];
      break;
    }
  }

  // Exact match
  if (handicapIndex === lower.handicapIndex) return { ...lower };
  if (handicapIndex === upper.handicapIndex) return { ...upper };

  const t =
    (handicapIndex - lower.handicapIndex) /
    (upper.handicapIndex - lower.handicapIndex);

  function lerp(a: number, b: number): number {
    return a + (b - a) * t;
  }

  return {
    handicapIndex,
    averageScore: lerp(lower.averageScore, upper.averageScore),
    fairwayPercentage: lerp(lower.fairwayPercentage, upper.fairwayPercentage),
    girPercentage: lerp(lower.girPercentage, upper.girPercentage),
    puttsPerRound: lerp(lower.puttsPerRound, upper.puttsPerRound),
    upAndDownPercentage: lerp(lower.upAndDownPercentage, upper.upAndDownPercentage),
    penaltiesPerRound: lerp(lower.penaltiesPerRound, upper.penaltiesPerRound),
  };
}

/** Get interpolated benchmark in BracketBenchmark shape for downstream compat. */
export function getInterpolatedBenchmark(handicapIndex: number): BracketBenchmark {
  const anchor = interpolateBenchmark(handicapIndex);
  const bracket = handicapToBracketLabel(handicapIndex);

  // Scoring distribution (eagles, birdies, pars, etc.) is only used for GIR
  // estimation — a fallback when the user doesn't provide GIR directly.
  // It's not in the anchors array and isn't interpolated; snapping to the
  // nearest bracket is acceptable because the GIR estimate is already marked
  // as "medium" confidence regardless.
  const bracketData = data.brackets.find((b) => b.bracket === bracket);
  const scoring = bracketData?.scoring ?? {
    eaglesPerRound: 0,
    birdiesPerRound: 0,
    parsPerRound: 0,
    bogeysPerRound: 0,
    doublesPerRound: 0,
    triplePlusPerRound: 0,
  };

  return {
    bracket,
    averageScore: anchor.averageScore,
    fairwayPercentage: anchor.fairwayPercentage,
    girPercentage: anchor.girPercentage,
    puttsPerRound: anchor.puttsPerRound,
    upAndDownPercentage: anchor.upAndDownPercentage,
    penaltiesPerRound: anchor.penaltiesPerRound,
    scoring,
  };
}

/** Get the benchmark data version string. */
export function getBenchmarkVersion(): string {
  return data.version;
}
