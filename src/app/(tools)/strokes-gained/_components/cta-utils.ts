import { CATEGORY_ORDER, CATEGORY_LABELS } from "@/lib/golf/constants";
import { presentSG, formatHandicap } from "@/lib/golf/format";
import type { StrokesGainedResult } from "@/lib/golf/types";
import type { HeadlineSentiment } from "@/lib/golf/share-headline";

export function deriveSentiment(total: number): HeadlineSentiment {
  if (total > 0.5) return "positive";
  if (total < -0.5) return "negative";
  return "neutral";
}

export function findWorstCategory(result: StrokesGainedResult) {
  const skippedSet = new Set(result.skippedCategories);
  const active = CATEGORY_ORDER.filter((k) => !skippedSet.has(k));
  if (active.length === 0) return null;

  let worst = { key: active[0], value: result.categories[active[0]] };
  for (const key of active) {
    if (result.categories[key] < worst.value) worst = { key, value: result.categories[key] };
  }
  return worst.value < -0.5 ? worst : null;
}

export function buildComparisonTeaser(
  handicap: number,
  result: StrokesGainedResult,
): string | null {
  const skippedSet = new Set(result.skippedCategories);
  const active = CATEGORY_ORDER.filter((k) => !skippedSet.has(k));
  if (active.length < 2) return null;

  let best = { key: active[0], value: result.categories[active[0]] };
  let worst = { key: active[0], value: result.categories[active[0]] };
  for (const key of active) {
    const val = result.categories[key];
    if (val > best.value) best = { key, value: val };
    if (val < worst.value) worst = { key, value: val };
  }

  const bestSg = presentSG(best.value, 1);
  const worstSg = presentSG(worst.value, 1);

  return `${formatHandicap(handicap)} HCP — Best: ${CATEGORY_LABELS[best.key]} (${bestSg.formatted}) · Worst: ${CATEGORY_LABELS[worst.key]} (${worstSg.formatted})`;
}
