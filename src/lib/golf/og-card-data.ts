/**
 * Shared data preparation for OG image routes.
 * Used by both the stateless ?d= route and the saved round share route.
 */

import type { StrokesGainedResult } from "./types";
import {
  BRACKET_LABELS,
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  CONFIDENCE_COLORS_HEX,
  CONFIDENCE_LABELS,
} from "./constants";
import type { ConfidenceLevel } from "./types";

export interface OGCardEntry {
  label: string;
  value: number;
  skipped: boolean;
  confidence: ConfidenceLevel;
}

export function buildOGCardEntries(result: StrokesGainedResult): OGCardEntry[] {
  const skippedSet = new Set(result.skippedCategories);
  return CATEGORY_ORDER.map((key) => ({
    label: CATEGORY_LABELS[key],
    value: result.categories[key],
    skipped: skippedSet.has(key),
    confidence: result.confidence[key],
  }));
}

export function formatSGForOG(value: number): string {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}`;
}

export function truncateText(value: string, max: number): string {
  return value.length <= max ? value : `${value.slice(0, max - 1)}…`;
}

export function getBracketLabel(result: StrokesGainedResult): string {
  return BRACKET_LABELS[result.benchmarkBracket] ?? result.benchmarkBracket;
}

export { CONFIDENCE_COLORS_HEX, CONFIDENCE_LABELS };
