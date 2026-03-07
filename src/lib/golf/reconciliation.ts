import type {
  ConfidenceLevel,
  ReconciliationResult,
  StrokesGainedCategory,
} from "./types";

const CONFIDENCE_WEIGHTS: Record<ConfidenceLevel, number> = {
  high: 3,
  medium: 2,
  low: 1,
};

const EXCESSIVE_SCALING_THRESHOLD = 0.5;
const DEFAULT_TOLERANCE = 0.1;

const ALL_CATEGORIES: StrokesGainedCategory[] = [
  "off-the-tee",
  "approach",
  "around-the-green",
  "putting",
];

export function reconcileCategories(
  provisionals: Record<StrokesGainedCategory, number>,
  totalAnchor: number,
  confidence: Record<StrokesGainedCategory, ConfidenceLevel>,
  skippedCategories: StrokesGainedCategory[],
  tolerance: number = DEFAULT_TOLERANCE
): ReconciliationResult {
  const skippedSet = new Set(skippedCategories);
  const activeCats = ALL_CATEGORIES.filter((c) => !skippedSet.has(c));

  const preReconciliationSum = activeCats.reduce(
    (sum, cat) => sum + provisionals[cat],
    0
  );
  const gap = totalAnchor - preReconciliationSum;

  // Initialize with no adjustments
  const categories = { ...provisionals };
  const adjustments: Record<StrokesGainedCategory, number> = {
    "off-the-tee": 0,
    approach: 0,
    "around-the-green": 0,
    putting: 0,
  };

  if (Math.abs(gap) <= tolerance) {
    return {
      categories,
      adjustments,
      preReconciliationSum,
      scaleFactor: 0,
      gap,
      flags: [],
    };
  }

  // Compute inverse-confidence shares
  const inverseWeights = activeCats.map(
    (cat) => 1 / CONFIDENCE_WEIGHTS[confidence[cat]]
  );
  const totalInverseWeight = inverseWeights.reduce((s, w) => s + w, 0);

  activeCats.forEach((cat, i) => {
    const share = inverseWeights[i] / totalInverseWeight;
    adjustments[cat] = gap * share;
    categories[cat] = provisionals[cat] + adjustments[cat];
  });

  // Compute scale factor: max |adjustment / provisional| for non-zero provisionals
  let scaleFactor = 0;
  for (const cat of activeCats) {
    if (provisionals[cat] !== 0) {
      const ratio = Math.abs(adjustments[cat] / provisionals[cat]);
      if (ratio > scaleFactor) scaleFactor = ratio;
    }
  }

  const flags: string[] = [];
  if (scaleFactor > EXCESSIVE_SCALING_THRESHOLD) {
    flags.push("excessive_scaling");
  }

  return {
    categories,
    adjustments,
    preReconciliationSum,
    scaleFactor,
    gap,
    flags,
  };
}
