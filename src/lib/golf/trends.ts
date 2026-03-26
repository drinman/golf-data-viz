/**
 * Trend analysis for multi-round Strokes Gained data.
 *
 * Pure functions that transform round snapshots into chart-ready
 * trend series and surface the biggest-moving category.
 */

import type { StrokesGainedCategory } from "./types";
import {
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  getMajorVersion,
  MIN_ROUNDS_FOR_MULTI_ROUND_INSIGHTS,
} from "./constants";

// ── Types ──

export interface RoundSgSnapshot {
  roundId: string;
  playedAt: string;
  courseName: string;
  score: number;
  handicapIndex: number;
  sgTotal: number;
  sgOffTheTee: number;
  sgApproach: number;
  sgAroundTheGreen: number;
  sgPutting: number;
  methodologyVersion: string | null;
  benchmarkBracket: string | null;
}

export interface TrendDataPoint {
  x: string;
  y: number;
}

export interface TrendSeries {
  id: string;
  color: string;
  data: TrendDataPoint[];
}

export type MovementDirection = "improving" | "declining" | "stable";

export interface BiggestMover {
  category: StrokesGainedCategory;
  label: string;
  direction: MovementDirection;
  delta: number;
  confidence: "recent_movement" | "emerging_pattern";
  copyText: string;
}

// ── Constants ──

export const TREND_CATEGORY_COLORS: Record<StrokesGainedCategory, string> = {
  "off-the-tee": "#2563eb",
  approach: "#16a34a",
  "around-the-green": "#d97706",
  putting: "#9333ea",
};

/** Minimum absolute delta to surface a biggest mover. */
const MOVER_THRESHOLD = 0.15;

// ── Helpers ──

function getSgValue(
  round: RoundSgSnapshot,
  category: StrokesGainedCategory
): number {
  switch (category) {
    case "off-the-tee":
      return round.sgOffTheTee;
    case "approach":
      return round.sgApproach;
    case "around-the-green":
      return round.sgAroundTheGreen;
    case "putting":
      return round.sgPutting;
  }
}

function avg(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

// ── Public functions ──

/**
 * Transform round snapshots into Nivo-compatible trend series.
 *
 * Returns one series per SG category, sorted ascending by playedAt.
 * X-axis uses ordinal labels ("Round 1", "Round 2", ...).
 */
export function toTrendSeries(rounds: RoundSgSnapshot[]): TrendSeries[] {
  if (rounds.length === 0) return [];

  const sorted = [...rounds].sort(
    (a, b) => new Date(a.playedAt).getTime() - new Date(b.playedAt).getTime()
  );

  return CATEGORY_ORDER.map((category) => ({
    id: CATEGORY_LABELS[category],
    color: TREND_CATEGORY_COLORS[category],
    data: sorted.map((round, i) => ({
      x: String(i + 1),
      y: getSgValue(round, category),
    })),
  }));
}

/**
 * Find the SG category with the biggest recent movement.
 *
 * - Fewer than MIN_ROUNDS_FOR_MULTI_ROUND_INSIGHTS rounds: returns null
 * - 3 rounds: point comparison of first vs last (recent_movement)
 * - 4 rounds: avg of earliest 2 vs avg of latest 2 (recent_movement)
 * - 5 rounds: avg of earliest 2 vs avg of latest 2 (emerging_pattern)
 * - 6+ rounds: avg of earliest 3 vs avg of latest 3 (emerging_pattern)
 * - Windows never overlap — odd counts exclude the middle round(s)
 * - Returns null if no category delta exceeds the threshold (0.15)
 */
export function calculateBiggestMover(
  rounds: RoundSgSnapshot[]
): BiggestMover | null {
  if (rounds.length < MIN_ROUNDS_FOR_MULTI_ROUND_INSIGHTS) return null;

  const sorted = [...rounds].sort(
    (a, b) => new Date(a.playedAt).getTime() - new Date(b.playedAt).getTime()
  );

  // Confidence is tied to total round count, not window size.
  const confidence: BiggestMover["confidence"] =
    sorted.length >= 5 ? "emerging_pattern" : "recent_movement";

  // Use non-overlapping windows. For odd-count sets, exclude the middle round(s).
  const preferredWindow = sorted.length >= 6 ? 3 : 2;
  const windowSize = Math.min(preferredWindow, Math.floor(sorted.length / 2));

  const earliest = sorted.slice(0, windowSize);
  const latest = sorted.slice(sorted.length - windowSize);

  // Calculate delta for each category
  let bestCategory: StrokesGainedCategory | null = null;
  let bestAbsDelta = 0;
  let bestDelta = 0;

  for (const category of CATEGORY_ORDER) {
    const earlyAvg = avg(earliest.map((r) => getSgValue(r, category)));
    const lateAvg = avg(latest.map((r) => getSgValue(r, category)));
    const delta = lateAvg - earlyAvg;
    const absDelta = Math.abs(delta);

    if (absDelta > bestAbsDelta) {
      bestAbsDelta = absDelta;
      bestDelta = delta;
      bestCategory = category;
    }
  }

  if (bestCategory === null || bestAbsDelta < MOVER_THRESHOLD) {
    return null;
  }

  const direction: MovementDirection =
    bestDelta > 0 ? "improving" : bestDelta < 0 ? "declining" : "stable";

  const label = CATEGORY_LABELS[bestCategory];
  const roundedDelta = Math.abs(Math.round(bestDelta * 10) / 10);
  const directionWord =
    direction === "improving" ? "improvement" : "decline";
  const qualifier =
    confidence === "recent_movement"
      ? "recent"
      : "a developing pattern of";

  const copyText =
    direction === "improving"
      ? `Your ${label.toLowerCase()} game has shown ${qualifier} improvement \u2014 gaining ${roundedDelta} more strokes per round in your last few rounds.`
      : `Your ${label.toLowerCase()} game has shown ${qualifier} ${directionWord} \u2014 losing ${roundedDelta} more strokes per round in your last few rounds.`;

  return {
    category: bestCategory,
    label,
    direction,
    delta: bestDelta,
    confidence,
    copyText,
  };
}

/**
 * Compute a zero-centered, padded y-axis domain for the trend chart.
 * Symmetric around zero so negative and positive values get equal visual weight.
 */
export function computeYDomain(series: TrendSeries[]): { min: number; max: number } {
  const allValues = series.flatMap((s) => s.data.map((d) => d.y));
  if (allValues.length === 0) return { min: -1, max: 1 };

  const dataMin = Math.min(...allValues);
  const dataMax = Math.max(...allValues);
  const maxAbs = Math.max(Math.abs(dataMin), Math.abs(dataMax));

  // Pad by 20% (minimum 0.3 strokes) so points aren't at edges
  const paddedAbs = maxAbs + Math.max(maxAbs * 0.2, 0.3);

  return {
    min: Math.floor(-paddedAbs * 5) / 5, // Round down to nearest 0.2
    max: Math.ceil(paddedAbs * 5) / 5, // Round up to nearest 0.2
  };
}

/**
 * Check whether a set of rounds spans multiple methodology versions.
 *
 * Returns true only if there are 2+ distinct non-null methodologyVersion values.
 */
export function hasMethodologyMix(rounds: RoundSgSnapshot[]): boolean {
  const majors = new Set(
    rounds
      .map((r) => getMajorVersion(r.methodologyVersion))
      .filter((v): v is string => v !== null)
  );
  return majors.size > 1;
}
