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
  if (!Number.isFinite(index) || index < -9.9 || index > 54) {
    throw new RangeError(
      `Handicap index must be between -9.9 and 54, got ${index}`
    );
  }
  if (index < 0) return "plus";
  if (index <= 5) return "0-5";
  if (index <= 10) return "5-10";
  if (index <= 15) return "10-15";
  if (index <= 20) return "15-20";
  if (index <= 25) return "20-25";
  if (index <= 30) return "25-30";
  return "30+";
}

/** Get the benchmark for a given handicap index (snap-to-nearest bracket). Display-only. */
export function getBracketForHandicap(index: number): BracketBenchmark {
  const label = handicapToBracketLabel(index);

  // Plus handicap: return extrapolated anchor values with "plus" bracket label.
  if (label === "plus") {
    const extrapolatedAnchor = interpolateBenchmark(index);
    const scratchBracketData = data.brackets.find((b) => b.bracket === "0-5");
    return {
      ...extrapolatedAnchor,
      bracket: "plus" as const,
      scoring: scratchBracketData?.scoring ?? {
        eaglesPerRound: 0,
        birdiesPerRound: 0,
        parsPerRound: 0,
        bogeysPerRound: 0,
        doublesPerRound: 0,
        triplePlusPerRound: 0,
      },
    };
  }

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
  if (!Number.isFinite(handicapIndex) || handicapIndex < -9.9 || handicapIndex > 54) {
    throw new RangeError(
      `Handicap index must be between -9.9 and 54, got ${handicapIndex}`
    );
  }

  // Plus handicaps: extrapolate below scratch using the 0→5 gradient projected in reverse.
  // FIR% is frozen at scratch (non-monotonic in source data). Other metrics have per-metric
  // safety clamps. puttsPerRound and penaltiesPerRound are extrapolated from seed estimates
  // pending second-source validation — this is the softest part of the math.
  // TODO(GOL-44): validate puttsPerRound and penaltiesPerRound gradients against a second source.
  if (handicapIndex < 0) {
    const anchor0 = sortedAnchors[0]; // scratch (0 HCP)
    const anchor5 = sortedAnchors[1]; // 5 HCP
    if (anchor0.handicapIndex !== 0 || anchor5.handicapIndex !== 5) {
      throw new Error("Extrapolation requires anchors at exactly 0 and 5 HCP");
    }
    const span = anchor5.handicapIndex - anchor0.handicapIndex; // 5
    const dist = Math.abs(handicapIndex); // positive distance below scratch

    const extrapolate = (at0: number, at5: number, floor: number, cap: number): number => {
      const gradient = (at5 - at0) / span;
      return Math.max(floor, Math.min(cap, at0 - gradient * dist));
    };

    const result: BenchmarkAnchor = {
      handicapIndex,
      averageScore: extrapolate(anchor0.averageScore, anchor5.averageScore, 60, Infinity),
      fairwayPercentage: anchor0.fairwayPercentage, // frozen at scratch
      girPercentage: extrapolate(anchor0.girPercentage, anchor5.girPercentage, 0, 80),
      puttsPerRound: extrapolate(anchor0.puttsPerRound, anchor5.puttsPerRound, 27, Infinity),
      upAndDownPercentage: extrapolate(anchor0.upAndDownPercentage, anchor5.upAndDownPercentage, 0, 75),
      penaltiesPerRound: extrapolate(anchor0.penaltiesPerRound, anchor5.penaltiesPerRound, 0.05, Infinity),
    };
    if (anchor0.puttsPerGIR != null && anchor5.puttsPerGIR != null) {
      result.puttsPerGIR = extrapolate(anchor0.puttsPerGIR, anchor5.puttsPerGIR, 1.5, 3.0);
    }
    if (anchor0.puttsPerNonGIR != null && anchor5.puttsPerNonGIR != null) {
      result.puttsPerNonGIR = extrapolate(anchor0.puttsPerNonGIR, anchor5.puttsPerNonGIR, 1.0, 2.5);
    }
    return result;
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
  if (handicapIndex === lower.handicapIndex) return { ...lower, handicapIndex };
  if (handicapIndex === upper.handicapIndex) return { ...upper, handicapIndex };

  const t =
    (handicapIndex - lower.handicapIndex) /
    (upper.handicapIndex - lower.handicapIndex);

  function lerp(a: number, b: number): number {
    return a + (b - a) * t;
  }

  const result: BenchmarkAnchor = {
    handicapIndex,
    averageScore: lerp(lower.averageScore, upper.averageScore),
    fairwayPercentage: lerp(lower.fairwayPercentage, upper.fairwayPercentage),
    girPercentage: lerp(lower.girPercentage, upper.girPercentage),
    puttsPerRound: lerp(lower.puttsPerRound, upper.puttsPerRound),
    upAndDownPercentage: lerp(lower.upAndDownPercentage, upper.upAndDownPercentage),
    penaltiesPerRound: lerp(lower.penaltiesPerRound, upper.penaltiesPerRound),
  };
  if (lower.puttsPerGIR != null && upper.puttsPerGIR != null) {
    result.puttsPerGIR = lerp(lower.puttsPerGIR, upper.puttsPerGIR);
  }
  if (lower.puttsPerNonGIR != null && upper.puttsPerNonGIR != null) {
    result.puttsPerNonGIR = lerp(lower.puttsPerNonGIR, upper.puttsPerNonGIR);
  }
  return result;
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
  // For plus handicaps, snap to "0-5" bracket for scoring distribution.
  const scoringBracketLabel = bracket === "plus" ? "0-5" : bracket;
  const bracketData = data.brackets.find((b) => b.bracket === scoringBracketLabel);
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
    puttsPerGIR: anchor.puttsPerGIR,
    puttsPerNonGIR: anchor.puttsPerNonGIR,
    scoring,
  };
}

/** Get the benchmark data version string. */
export function getBenchmarkVersion(): string {
  return data.version;
}
