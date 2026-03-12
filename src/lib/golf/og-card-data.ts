/**
 * Shared data preparation for OG image routes.
 * Used by both the stateless ?d= route and the saved round share route.
 */

import type { StrokesGainedCategory, StrokesGainedResult } from "./types";
import {
  BRACKET_LABELS,
  CATEGORY_LABELS,
  CATEGORY_ORDER,
} from "./constants";
import { formatSG } from "./format";

export function truncateText(value: string, max: number): string {
  return value.length <= max ? value : `${value.slice(0, max - 1)}…`;
}

export function getBracketLabel(result: StrokesGainedResult): string {
  return BRACKET_LABELS[result.benchmarkBracket] ?? result.benchmarkBracket;
}

/** Short category abbreviations for compact OG SG row. */
const OG_CATEGORY_ABBREV: Record<StrokesGainedCategory, string> = {
  "off-the-tee": "OTT",
  approach: "APP",
  "around-the-green": "ATG",
  putting: "PUTT",
};

/** Build a compact "OTT +1.2  APP -2.8  ATG +0.1  PUTT -0.8" string for OG images. */
export function buildCompactSGRow(result: StrokesGainedResult): string {
  const skippedSet = new Set(result.skippedCategories);
  return CATEGORY_ORDER
    .filter((key) => !skippedSet.has(key))
    .map((key) => `${OG_CATEGORY_ABBREV[key]} ${formatSG(result.categories[key])}`)
    .join("  ");
}

/** Find the weakest (most negative) SG category label. Null if all >= 0. */
export function findWeakestCategoryFromResult(result: StrokesGainedResult): string | null {
  const skippedSet = new Set(result.skippedCategories);
  let weakest: { key: StrokesGainedCategory; value: number } | null = null;
  for (const key of CATEGORY_ORDER) {
    if (skippedSet.has(key)) continue;
    const value = result.categories[key];
    if (value < 0 && (weakest === null || value < weakest.value)) {
      weakest = { key, value };
    }
  }
  return weakest ? CATEGORY_LABELS[weakest.key] : null;
}

