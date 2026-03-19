"use client";

import { useEffect, useRef, useState } from "react";
import { CATEGORY_ORDER, CATEGORY_LABELS } from "@/lib/golf/constants";
import { presentSG, formatHandicap } from "@/lib/golf/format";
import { trackEvent } from "@/lib/analytics/client";
import type { StrokesGainedResult } from "@/lib/golf/types";
import type { HeadlineSentiment } from "@/lib/golf/share-headline";

interface RecipientCtaProps {
  senderHandicap: number;
  senderResult: StrokesGainedResult;
  surface: "encoded_share" | "token_share";
}

function deriveSentiment(total: number): HeadlineSentiment {
  if (total > 0.5) return "positive";
  if (total < -0.5) return "negative";
  return "neutral";
}

function getSentimentCopy(sentiment: HeadlineSentiment): string {
  switch (sentiment) {
    case "positive":
      return "Your friend is beating their peers. Can you?";
    case "negative":
      return "Think you can do better? Find out.";
    default:
      return "How do your stats compare?";
  }
}

function buildComparisonTeaser(
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

export function RecipientCta({ senderHandicap, senderResult, surface }: RecipientCtaProps) {
  const sentiment = deriveSentiment(senderResult.total);
  const copy = getSentimentCopy(sentiment);
  const teaser = buildComparisonTeaser(senderHandicap, senderResult);

  const ctaUrl = `/strokes-gained?handicap=${senderHandicap}&utm_source=share&utm_medium=cta&utm_campaign=round_share`;

  const inlineRef = useRef<HTMLDivElement>(null);
  const [showSticky, setShowSticky] = useState(false);

  useEffect(() => {
    const el = inlineRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        // Only show sticky on mobile viewports
        const isMobile = window.innerWidth < 640;
        setShowSticky(isMobile && !entry.isIntersecting);
      },
      { threshold: 0 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  function handleClick() {
    trackEvent("shared_round_cta_clicked", { surface, sentiment });
  }

  return (
    <>
      {/* Inline CTA */}
      <div
        ref={inlineRef}
        data-testid="recipient-cta"
        className="mt-10 animate-fade-up rounded-xl border-2 border-accent-500 bg-accent-500/5 px-5 py-5 text-center"
      >
        <p className="font-display text-lg font-bold tracking-tight text-neutral-950">
          {copy}
        </p>
        {teaser && (
          <p className="mt-1.5 text-sm text-neutral-500">
            {teaser}
          </p>
        )}
        <a
          href={ctaUrl}
          onClick={handleClick}
          className="mt-4 inline-block rounded-lg bg-brand-800 px-6 py-2.5 text-sm font-medium text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-brand-700 hover:shadow-md active:translate-y-0"
        >
          Try It Free
        </a>
      </div>

      {/* Sticky mobile CTA */}
      {showSticky && (
        <div
          data-testid="sticky-recipient-cta"
          className="fixed inset-x-0 bottom-0 z-40 border-t border-cream-200 bg-white/95 px-4 py-3 shadow-lg backdrop-blur-sm sm:hidden"
        >
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
            <p className="text-sm font-medium text-neutral-800">
              {copy}
            </p>
            <a
              href={ctaUrl}
              onClick={handleClick}
              className="shrink-0 rounded-lg bg-brand-800 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700"
            >
              Try It
            </a>
          </div>
        </div>
      )}
    </>
  );
}
