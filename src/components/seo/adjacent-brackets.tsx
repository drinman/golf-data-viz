import Link from "next/link";
import type { HandicapBracket } from "@/lib/golf/types";
import { BRACKET_LABELS } from "@/lib/golf/constants";
import { getAdjacentBrackets, bracketToSlug } from "@/lib/seo/slugs";

interface AdjacentBracketsProps {
  current: HandicapBracket;
}

export function AdjacentBrackets({ current }: AdjacentBracketsProps) {
  const { prev, next } = getAdjacentBrackets(current);

  if (!prev && !next) return null;

  return (
    <nav
      aria-label="Adjacent brackets"
      className="flex items-center justify-between gap-4"
    >
      {prev ? (
        <Link
          href={`/benchmarks/${bracketToSlug(prev)}`}
          className="text-sm text-brand-800 underline hover:text-brand-900"
        >
          &larr; {BRACKET_LABELS[prev]}
        </Link>
      ) : (
        <span />
      )}
      {next ? (
        <Link
          href={`/benchmarks/${bracketToSlug(next)}`}
          className="text-sm text-brand-800 underline hover:text-brand-900"
        >
          {BRACKET_LABELS[next]} &rarr;
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}
