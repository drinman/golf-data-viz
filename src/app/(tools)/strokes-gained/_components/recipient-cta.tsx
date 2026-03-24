"use client";

import { useEffect, useRef, useState } from "react";
import { CATEGORY_LABELS } from "@/lib/golf/constants";
import { presentSG } from "@/lib/golf/format";
import { trackEvent } from "@/lib/analytics/client";
import type { StrokesGainedResult } from "@/lib/golf/types";
import type { HeadlineSentiment } from "@/lib/golf/share-headline";
import { deriveSentiment, findWorstCategory, buildComparisonTeaser } from "./cta-utils";

interface RecipientCtaProps {
  senderHandicap: number;
  senderResult: StrokesGainedResult;
  surface: "encoded_share" | "token_share";
}

function getSentimentCopy(sentiment: HeadlineSentiment): string {
  switch (sentiment) {
    case "positive":
      return "Your friend is outplaying their peers. Are you?";
    case "negative":
      return "Where are YOU losing strokes?";
    default:
      return "Same handicap. Different game. See yours.";
  }
}

/** Full challenge headline for the inline CTA */
function getChallengeHeadline(result: StrokesGainedResult): string {
  const worst = findWorstCategory(result);
  if (worst) {
    const worstLabel = CATEGORY_LABELS[worst.key].toLowerCase();
    const worstSg = presentSG(worst.value, 1);
    return `Your friend is losing ${worstSg.formatted.replace('-', '')} strokes on ${worstLabel}. Where are YOU losing strokes?`;
  }
  return getSentimentCopy(deriveSentiment(result.total));
}

/** Short challenge for the sticky mobile CTA (limited horizontal space) */
function getShortChallenge(result: StrokesGainedResult): string {
  const worst = findWorstCategory(result);
  if (worst) {
    return `Beat their ${CATEGORY_LABELS[worst.key].toLowerCase()}?`;
  }
  const sentiment = deriveSentiment(result.total);
  switch (sentiment) {
    case "positive":
      return "Outplay your friend?";
    default:
      return "Your turn";
  }
}

export function RecipientCta({ senderHandicap, senderResult, surface }: RecipientCtaProps) {
  const inlineCopy = getChallengeHeadline(senderResult);
  const stickyCopy = getShortChallenge(senderResult);
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

  const sentiment = deriveSentiment(senderResult.total);

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
          {inlineCopy}
        </p>
        {teaser && (
          <p className="mt-1.5 text-sm text-neutral-500">
            {teaser}
          </p>
        )}
        <a
          href={ctaUrl}
          onClick={handleClick}
          className="mt-4 inline-flex min-h-11 items-center rounded-lg bg-brand-800 px-6 py-2.5 text-sm font-medium text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-brand-700 hover:shadow-md active:translate-y-0"
        >
          Compare Your Game
        </a>
        <p className="mt-2 text-xs text-neutral-400">
          Takes 60 seconds · Free
        </p>
      </div>

      {/* Sticky mobile CTA */}
      {showSticky && (
        <div
          data-testid="sticky-recipient-cta"
          className="fixed inset-x-0 z-40 border-t border-cream-200 bg-white/95 px-4 py-3 shadow-lg sm:hidden"
          style={{
            bottom: "calc(env(safe-area-inset-bottom, 0px) + 12px)",
          }}
        >
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
            <p className="text-sm font-medium text-neutral-800">
              {stickyCopy}
            </p>
            <a
              href={ctaUrl}
              onClick={handleClick}
              className="shrink-0 inline-flex min-h-11 items-center rounded-lg bg-brand-800 px-4 py-2 text-sm font-medium text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-brand-700 hover:shadow-md active:translate-y-0"
            >
              Your Turn
            </a>
          </div>
        </div>
      )}
    </>
  );
}
