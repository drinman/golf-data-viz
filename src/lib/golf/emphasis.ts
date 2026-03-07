import type { StrokesGainedCategory, StrokesGainedResult } from "./types";

export function getEmphasizedCategories(
  result: StrokesGainedResult
): StrokesGainedCategory[] {
  const skipped = new Set(result.skippedCategories ?? []);
  const emphasized: StrokesGainedCategory[] = [];

  if (!skipped.has("putting")) {
    emphasized.push("putting");
  }

  if (
    !skipped.has("around-the-green") &&
    result.confidence["around-the-green"] !== "low"
  ) {
    emphasized.push("around-the-green");
  }

  return emphasized;
}
