/**
 * Formatting utilities for golf display values.
 */

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
