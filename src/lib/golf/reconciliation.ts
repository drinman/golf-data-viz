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

/** Broadie's actual amateur variance shares (Every Shot Counts, 2014). */
const BROADIE_SHARES: Record<StrokesGainedCategory, number> = {
  "off-the-tee": 0.28,
  approach: 0.40,
  "around-the-green": 0.17,
  putting: 0.15,
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
      unattributed: 0,
    };
  }

  // Hybrid: Broadie share × inverse-confidence, then normalize
  const hybridWeights = activeCats.map(
    (cat) => BROADIE_SHARES[cat] * (1 / CONFIDENCE_WEIGHTS[confidence[cat]])
  );
  const totalHybridWeight = hybridWeights.reduce((s, w) => s + w, 0);

  activeCats.forEach((cat, i) => {
    const share = hybridWeights[i] / totalHybridWeight;
    adjustments[cat] = gap * share;
    categories[cat] = provisionals[cat] + adjustments[cat];
  });

  // Sign-flip prevention: clamp categories that would reverse sign, then
  // redistribute the clamped overshoot to unclamped categories. Iterate
  // because redistribution can cause secondary sign flips.
  let unattributed = 0;
  const flags: string[] = [];
  const clamped = new Set<StrokesGainedCategory>();

  for (let pass = 0; pass < activeCats.length; pass++) {
    let flippedThisPass = false;

    for (const cat of activeCats) {
      if (clamped.has(cat)) continue;
      if (provisionals[cat] !== 0 &&
          Math.sign(provisionals[cat]) !== Math.sign(categories[cat])) {
        unattributed += categories[cat];
        adjustments[cat] = -provisionals[cat];
        categories[cat] = 0;
        clamped.add(cat);
        flippedThisPass = true;
        if (!flags.includes("sign_flip_prevented")) {
          flags.push("sign_flip_prevented");
        }
      }
    }

    if (!flippedThisPass || unattributed === 0) break;

    // Redistribute to remaining unclamped categories
    const unclamped = activeCats.filter((cat) => !clamped.has(cat) && categories[cat] !== 0);
    if (unclamped.length === 0) break;

    const unclampedWeights = unclamped.map(
      (cat) => BROADIE_SHARES[cat] * (1 / CONFIDENCE_WEIGHTS[confidence[cat]])
    );
    const totalWeight = unclampedWeights.reduce((s, w) => s + w, 0);
    unclamped.forEach((cat, i) => {
      const share = unclampedWeights[i] / totalWeight;
      const extra = unattributed * share;
      adjustments[cat] += extra;
      categories[cat] += extra;
    });
    unattributed = 0;
  }

  // Compute scale factor: max |adjustment / provisional| for non-zero provisionals
  let scaleFactor = 0;
  for (const cat of activeCats) {
    if (provisionals[cat] !== 0) {
      const ratio = Math.abs(adjustments[cat] / provisionals[cat]);
      if (ratio > scaleFactor) scaleFactor = ratio;
    }
  }

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
    unattributed,
  };
}
