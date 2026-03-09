import type {
  ConfidenceLevel,
  HandicapBracket,
  StrokesGainedCategory,
} from "./types";

/** Current methodology version — stamped on every StrokesGainedResult. */
export const METHODOLOGY_VERSION = "2.0.0" as const;

/** Phase 2 methodology version for the V3 pipeline. */
export const METHODOLOGY_VERSION_V3 = "3.1.0" as const;

/** Current calibration version — must match coefficients-seed-v1.json "version" field. */
export const CALIBRATION_VERSION = "seed-1.0.0" as const;

/** Current attribution correction version — must match attribution-correction-v1.json "version" field. */
export const ATTRIBUTION_CORRECTION_VERSION = "ac-1.0.0" as const;

/** Short display labels for handicap brackets (e.g., "10–15 HCP"). */
export const BRACKET_LABELS: Record<HandicapBracket, string> = {
  plus: "Plus HCP",
  "0-5": "0–5 HCP",
  "5-10": "5–10 HCP",
  "10-15": "10–15 HCP",
  "15-20": "15–20 HCP",
  "20-25": "20–25 HCP",
  "25-30": "25–30 HCP",
  "30+": "30+ HCP",
};

/** Display labels for SG categories. */
export const CATEGORY_LABELS: Record<StrokesGainedCategory, string> = {
  "off-the-tee": "Off the Tee",
  approach: "Approach",
  "around-the-green": "Around the Green",
  putting: "Putting",
};

/** Canonical display order for SG categories. */
export const CATEGORY_ORDER: StrokesGainedCategory[] = [
  "off-the-tee",
  "approach",
  "around-the-green",
  "putting",
];

/** Display labels for confidence levels. */
export const CONFIDENCE_LABELS: Record<ConfidenceLevel, string> = {
  high: "High",
  medium: "Med",
  low: "Low",
};

/** Hex colors for confidence levels — for Satori (OG images) and raw-color contexts. */
export const CONFIDENCE_COLORS_HEX: Record<ConfidenceLevel, { bg: string; text: string }> = {
  high: { bg: "#f0fdf4", text: "#16a34a" },
  medium: { bg: "#fffbeb", text: "#b45309" },
  low: { bg: "#f5f5f4", text: "#a8a29e" },
};

/** SG values within ±threshold are considered effectively zero. */
export const SG_NEAR_ZERO_THRESHOLD = 0.05 as const;

/** Tailwind classes for confidence levels — for ConfidenceBadge component. */
export const CONFIDENCE_COLORS_TW: Record<ConfidenceLevel, { bg: string; text: string }> = {
  high: { bg: "bg-brand-50", text: "text-data-positive" },
  medium: { bg: "bg-amber-50", text: "text-amber-700" },
  low: { bg: "bg-neutral-100", text: "text-neutral-500" },
};
