import type { RoundInput } from "./types";

export type RoundTrustStatus = "trusted" | "quarantined";

export interface RoundTrustAssessment {
  status: RoundTrustStatus;
  reasons: string[];
}

const MIN_COURSE_PAR = 67;
const MAX_COURSE_PAR = 74;
const PUTT_FLOOR = 14;
const DIFFERENTIAL_GAP_THRESHOLD = 20;

function getScoringBreakdownToPar(input: RoundInput): number {
  return (
    -2 * input.eagles +
    -1 * input.birdies +
    input.bogeys +
    2 * input.doubleBogeys +
    3 * input.triplePlus
  );
}

function getDifferential(input: RoundInput): number {
  return ((input.score - input.courseRating) * 113) / input.slopeRating;
}

/**
 * Classifies write-time round trust from golf-stat plausibility only.
 *
 * Future benchmark aggregation paths must query trusted rows only
 * (`WHERE trust_status = 'trusted'`).
 */
export function assessRoundTrust(input: RoundInput): RoundTrustAssessment {
  const hardReasons: string[] = [];
  const softReasons: string[] = [];

  const toPar = getScoringBreakdownToPar(input);
  const minScore = MIN_COURSE_PAR + toPar;
  const maxScore = MAX_COURSE_PAR + toPar;
  if (input.score < minScore || input.score > maxScore) {
    hardReasons.push("score_breakdown_mismatch");
  }

  if (input.totalPutts > input.score) {
    hardReasons.push("putts_exceed_score");
  }

  if (input.totalPutts < PUTT_FLOOR) {
    hardReasons.push("putts_extremely_low");
  }

  const differentialGap = Math.abs(getDifferential(input) - input.handicapIndex);
  if (differentialGap > DIFFERENTIAL_GAP_THRESHOLD) {
    softReasons.push("differential_handicap_gap");
  }

  const scoringSpikes = input.birdies + input.eagles;
  if (input.handicapIndex >= 25 && scoringSpikes >= 3) {
    softReasons.push("high_hcp_scoring_spike");
  } else if (input.handicapIndex >= 18 && scoringSpikes >= 5) {
    softReasons.push("mid_high_hcp_scoring_spike");
  }

  if (input.score <= 78 && input.totalPutts >= 40) {
    softReasons.push("low_score_high_putts");
  }
  if (input.score >= 110 && input.totalPutts <= 20) {
    softReasons.push("high_score_low_putts");
  }

  const reasons = [...hardReasons, ...softReasons];
  const status: RoundTrustStatus =
    hardReasons.length > 0 || softReasons.length >= 2
      ? "quarantined"
      : "trusted";

  return { status, reasons };
}
