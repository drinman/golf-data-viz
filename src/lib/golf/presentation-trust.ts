import { getInterpolatedBenchmark } from "./benchmarks";
import { detectInputPath } from "./calibration";
import { CATEGORY_ORDER } from "./constants";
import { toStrokesGainedResult } from "./round-detail-adapter";
import type { RoundTrustStatus } from "./round-trust";
import type {
  PresentationTrust,
  RoundDetailSnapshot,
  RoundInput,
  StrokesGainedCategory,
  StrokesGainedResult,
} from "./types";

function createEmptyCategoryReasons(): Record<StrokesGainedCategory, string[]> {
  return {
    "off-the-tee": [],
    approach: [],
    "around-the-green": [],
    putting: [],
  };
}

function pushUnique(values: string[], value: string) {
  if (!values.includes(value)) {
    values.push(value);
  }
}

function hasDirectUpAndDownData(input: RoundInput): boolean {
  return (
    input.upAndDownAttempts != null &&
    input.upAndDownConverted != null &&
    input.upAndDownAttempts > 0
  );
}

function isCategorySkipped(
  result: StrokesGainedResult,
  category: StrokesGainedCategory
): boolean {
  return result.skippedCategories.includes(category);
}

function deriveLowGirPuttingCaveat(
  input: RoundInput,
  result: StrokesGainedResult
): boolean {
  if (result.diagnostics.lowGirPuttingCaveat != null) {
    return result.diagnostics.lowGirPuttingCaveat;
  }

  const gir = input.greensInRegulation;
  if (gir == null) {
    return false;
  }

  const benchmark = getInterpolatedBenchmark(
    result.benchmarkHandicap ?? input.handicapIndex
  );
  return gir / 18 < benchmark.girPercentage / 100 - 0.1;
}

/**
 * Absolute per-round count difference of doubles+triples vs benchmark averages.
 * Both sides are per-round values (input is a single round, benchmark rates are
 * per-round averages), so this is already a rate comparison. The >= 1.5 threshold
 * scales naturally across brackets: a 30+ hcp with 3.0 benchmark doubles needs
 * 5+ doubles to trigger, which is proportionally similar to a 14-hcp needing
 * 3+ doubles against a 1.5 benchmark.
 */
function deriveScoringDivergence(
  input: RoundInput,
  result: StrokesGainedResult
): number {
  const benchmark = getInterpolatedBenchmark(
    result.benchmarkHandicap ?? input.handicapIndex
  );
  return (
    input.doubleBogeys +
    input.triplePlus -
    (benchmark.scoring.doublesPerRound + benchmark.scoring.triplePlusPerRound)
  );
}

export function buildRoundInputFromSnapshot(
  snapshot: RoundDetailSnapshot
): RoundInput {
  return {
    course: snapshot.courseName,
    date: snapshot.playedAt,
    score: snapshot.score,
    handicapIndex: snapshot.handicapIndex,
    // USGA-standard neutral values (par 72, slope 113). These fields are
    // required by RoundInput but not consumed in presentation-trust derivation.
    courseRating: snapshot.courseRating ?? 72,
    slopeRating: snapshot.slopeRating ?? 113,
    fairwaysHit: snapshot.fairwaysHit ?? undefined,
    fairwayAttempts: snapshot.fairwayAttempts ?? 0,
    greensInRegulation: snapshot.greensInRegulation ?? undefined,
    totalPutts: snapshot.totalPutts ?? 0,
    penaltyStrokes: snapshot.penaltyStrokes ?? 0,
    eagles: snapshot.eagles ?? 0,
    birdies: snapshot.birdies ?? 0,
    pars: snapshot.pars ?? 0,
    bogeys: snapshot.bogeys ?? 0,
    doubleBogeys: snapshot.doubleBogeys ?? 0,
    triplePlus: snapshot.triplePlus ?? 0,
    upAndDownAttempts: snapshot.upAndDownAttempts ?? undefined,
    upAndDownConverted: snapshot.upAndDownConverted ?? undefined,
    onePutts: snapshot.onePutts ?? undefined,
    threePutts: snapshot.threePutts ?? undefined,
  };
}

export function derivePresentationTrust({
  input,
  result,
  roundTrustStatus,
}: {
  input: RoundInput;
  result: StrokesGainedResult;
  roundTrustStatus?: RoundTrustStatus | null;
}): PresentationTrust {
  const categoryReasons = createEmptyCategoryReasons();

  if (roundTrustStatus === "quarantined") {
    return {
      mode: "quarantined",
      promotableCategories: [],
      roundReasons: ["round_trust_quarantined"],
      categoryReasons,
    };
  }

  const promotable = {
    "off-the-tee":
      !isCategorySkipped(result, "off-the-tee") &&
      result.confidence["off-the-tee"] !== "low",
    approach:
      !isCategorySkipped(result, "approach") &&
      result.confidence.approach === "high",
    "around-the-green":
      !isCategorySkipped(result, "around-the-green") &&
      hasDirectUpAndDownData(input),
    putting:
      !isCategorySkipped(result, "putting") &&
      result.confidence.putting === "high",
  } satisfies Record<StrokesGainedCategory, boolean>;

  const roundReasons: string[] = [];
  const inputPath = result.inputPath ?? detectInputPath(input);
  const lowGirPuttingCaveat = deriveLowGirPuttingCaveat(input, result);
  const scoringDivergence = deriveScoringDivergence(input, result);

  let additionalAtgSuppressions = 0;

  if (inputPath === "atg-fallback") {
    promotable["around-the-green"] = false;
    pushUnique(categoryReasons["around-the-green"], "atg_fallback");

    if (promotable.approach && Math.abs(result.categories.approach) < 1.0) {
      promotable.approach = false;
      additionalAtgSuppressions += 1;
      pushUnique(categoryReasons.approach, "atg_fallback_low_signal");
    }

    if (
      promotable.approach &&
      result.categories.approach > 1.0 &&
      scoringDivergence >= 1.5
    ) {
      promotable.approach = false;
      additionalAtgSuppressions += 1;
      pushUnique(categoryReasons.approach, "atg_fallback_scoring_divergence");
    }

    if (
      promotable.putting &&
      Math.abs(result.categories.approach) >= 1.25
    ) {
      promotable.putting = false;
      additionalAtgSuppressions += 1;
      pushUnique(categoryReasons.putting, "atg_fallback_approach_instability");
    }
  }

  if (lowGirPuttingCaveat) {
    promotable.putting = false;
    pushUnique(roundReasons, "low_gir_putting_caveat");
    pushUnique(categoryReasons.putting, "low_gir_putting_caveat");
  }

  if (inputPath === "atg-fallback" && additionalAtgSuppressions > 0) {
    pushUnique(roundReasons, "atg_fallback_additional_suppression");
  }

  if (result.reconciliationFlags?.includes("excessive_scaling")) {
    pushUnique(roundReasons, "excessive_scaling");
  }

  if (result.benchmarkBracket === "plus") {
    pushUnique(roundReasons, "plus_benchmark_caveat");
  }

  if (result.benchmarkBracket === "30+") {
    pushUnique(roundReasons, "thirty_plus_benchmark_caveat");
  }

  return {
    mode: roundReasons.length > 0 ? "caveated" : "assertive",
    promotableCategories: CATEGORY_ORDER.filter((category) => promotable[category]),
    roundReasons,
    categoryReasons,
  };
}

export function derivePresentationTrustFromSnapshot(
  snapshot: RoundDetailSnapshot
): PresentationTrust {
  return derivePresentationTrust({
    input: buildRoundInputFromSnapshot(snapshot),
    result: toStrokesGainedResult(snapshot),
    roundTrustStatus: snapshot.trustStatus as RoundTrustStatus | null,
  });
}

export function isAssertivePresentationTrust(
  presentationTrust: PresentationTrust | null | undefined
): boolean {
  return !presentationTrust || presentationTrust.mode === "assertive";
}

export function isPresentationTrustEnabled(): boolean {
  return process.env.NEXT_PUBLIC_SG_PRESENTATION_TRUST === "on";
}
