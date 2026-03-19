import type { HandicapBracket } from "@/lib/golf/types";
import { ALL_HANDICAP_BRACKETS } from "@/lib/golf/types";

/** URL-safe slugs for all bracket pages (maps 1:1 with ALL_HANDICAP_BRACKETS). */
export const ALL_BRACKET_SLUGS: string[] = ALL_HANDICAP_BRACKETS.map((b) =>
  b === "30+" ? "30-plus" : b
);

/** Convert a URL slug to a HandicapBracket, or null if invalid. */
export function slugToBracket(slug: string): HandicapBracket | null {
  if (slug === "30-plus") return "30+";
  if ((ALL_HANDICAP_BRACKETS as readonly string[]).includes(slug)) {
    return slug as HandicapBracket;
  }
  return null;
}

/** Convert a HandicapBracket to a URL slug. "plus" maps to "0-5" (no dedicated page). */
export function bracketToSlug(bracket: HandicapBracket): string {
  if (bracket === "plus") return "0-5";
  if (bracket === "30+") return "30-plus";
  return bracket;
}

/** Get adjacent brackets for prev/next navigation. */
export function getAdjacentBrackets(bracket: HandicapBracket): {
  prev: HandicapBracket | null;
  next: HandicapBracket | null;
} {
  const index = ALL_HANDICAP_BRACKETS.indexOf(bracket);
  if (index === -1) return { prev: null, next: null };
  return {
    prev: index > 0 ? ALL_HANDICAP_BRACKETS[index - 1] : null,
    next:
      index < ALL_HANDICAP_BRACKETS.length - 1
        ? ALL_HANDICAP_BRACKETS[index + 1]
        : null,
  };
}
