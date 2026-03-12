/**
 * Formatting utilities for golf display values.
 */

import type { StrokesGainedCategory } from "./types";
import { CATEGORY_LABELS } from "./constants";

/** Format a handicap index for user-facing display.
 *  Negative values (plus handicaps) display with a "+" prefix.
 *  Standard values display as-is with one decimal place.
 */
export function formatHandicap(handicapIndex: number): string {
  if (handicapIndex < 0) {
    return `+${Math.abs(handicapIndex).toFixed(1)}`;
  }
  return handicapIndex.toFixed(1);
}

/** Format a strokes gained value with sign prefix and 2 decimal places. */
export function formatSG(value: number): string {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}`;
}

/** Format a date string (YYYY-MM-DD) for display. */
export function formatDate(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

/** Format a date string (YYYY-MM-DD) for compact UI display. */
export function formatCompactDate(dateStr: string): string {
  const date = new Date(`${dateStr}T00:00:00`);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** Format non-zero scoring categories as human-readable parts. */
export function formatScoringBreakdown(s: {
  eagles: number;
  birdies: number;
  pars: number;
  bogeys: number;
  doubleBogeys: number;
  triplePlus: number;
}): string[] {
  const parts: string[] = [];
  if (s.eagles > 0) parts.push(`${s.eagles} eagle${s.eagles !== 1 ? "s" : ""}`);
  if (s.birdies > 0) parts.push(`${s.birdies} birdie${s.birdies !== 1 ? "s" : ""}`);
  if (s.pars > 0) parts.push(`${s.pars} par${s.pars !== 1 ? "s" : ""}`);
  if (s.bogeys > 0) parts.push(`${s.bogeys} bogey${s.bogeys !== 1 ? "s" : ""}`);
  if (s.doubleBogeys > 0) parts.push(`${s.doubleBogeys} double${s.doubleBogeys !== 1 ? "s" : ""}`);
  if (s.triplePlus > 0) parts.push(`${s.triplePlus} triple+`);
  return parts;
}

/** Find the weakest SG category label (most negative value). Returns null if all zero/positive.
 *  Optionally pass skippedCategories to exclude them from consideration.
 */
export function findWeakestCategory(snapshot: {
  sgOffTheTee: number;
  sgApproach: number;
  sgAroundTheGreen: number;
  sgPutting: number;
  skippedCategories?: StrokesGainedCategory[];
}): string | null {
  const skippedSet = new Set(snapshot.skippedCategories ?? []);
  const mapping: { key: StrokesGainedCategory; value: number }[] = [
    { key: "off-the-tee", value: snapshot.sgOffTheTee },
    { key: "approach", value: snapshot.sgApproach },
    { key: "around-the-green", value: snapshot.sgAroundTheGreen },
    { key: "putting", value: snapshot.sgPutting },
  ];
  let weakest: { key: StrokesGainedCategory; value: number } | null = null;
  for (const entry of mapping) {
    if (skippedSet.has(entry.key)) continue;
    if (entry.value < 0 && (weakest === null || entry.value < weakest.value)) {
      weakest = entry;
    }
  }
  return weakest ? CATEGORY_LABELS[weakest.key] : null;
}

/** Build a familiar stats line from available data.
 *  Pass handicapIndex to prefix with "[index] index" (used in OG images).
 */
export function buildFamiliarStats(s: {
  greensInRegulation?: number | null;
  totalPutts?: number | null;
  fairwaysHit?: number | null;
  fairwayAttempts?: number | null;
  handicapIndex?: number | null;
}): string[] {
  const parts: string[] = [];
  if (s.handicapIndex != null) parts.push(`${formatHandicap(s.handicapIndex)} index`);
  if (s.greensInRegulation != null) parts.push(`${s.greensInRegulation} GIR`);
  if (s.totalPutts != null) parts.push(`${s.totalPutts} putts`);
  if (s.fairwaysHit != null && s.fairwayAttempts != null) {
    parts.push(`${s.fairwaysHit}/${s.fairwayAttempts} fairways`);
  }
  return parts;
}
