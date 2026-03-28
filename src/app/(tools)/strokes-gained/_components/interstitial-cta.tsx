"use client";

import { useEffect, useRef } from "react";
import { CATEGORY_LABELS } from "@/lib/golf/constants";
import { presentSG } from "@/lib/golf/format";
import { trackEvent } from "@/lib/analytics/client";
import type { StrokesGainedResult, RadarChartDatum } from "@/lib/golf/types";
import { deriveSentiment, findWorstCategory } from "./cta-utils";
import { RadarChart } from "@/components/charts/radar-chart";

interface InterstitialCtaProps {
  senderHandicap: number;
  senderResult: StrokesGainedResult;
  senderChartData: RadarChartDatum[];
  bracketLabel: string;
  surface: "encoded_share" | "token_share";
}

function getInterstitialHeadline(result: StrokesGainedResult): string {
  const worst = findWorstCategory(result);
  if (worst) {
    const worstLabel = CATEGORY_LABELS[worst.key].toLowerCase();
    const worstSg = presentSG(worst.value, 1);
    return `Your friend is losing ${worstSg.formatted.replace('-', '')} strokes on ${worstLabel}. Where are YOU losing strokes?`;
  }
  const sentiment = deriveSentiment(result.total);
  switch (sentiment) {
    case "positive":
      return "Your friend is outplaying their peers. Are you?";
    case "negative":
      return "Where are YOU losing strokes?";
    default:
      return "Same handicap. Different game. See yours.";
  }
}

export function InterstitialCta({
  senderHandicap,
  senderResult,
  senderChartData,
  bracketLabel,
  surface,
}: InterstitialCtaProps) {
  const headline = getInterstitialHeadline(senderResult);
  const sentiment = deriveSentiment(senderResult.total);

  const ctaUrl = `/strokes-gained?handicap=${senderHandicap}&utm_source=share&utm_medium=cta&utm_campaign=round_share`;

  const ghostChartData: RadarChartDatum[] = senderChartData.map((d) => ({
    ...d,
    player: d.skipped ? 0 : 50,
  }));

  // IntersectionObserver for one-time view tracking
  const viewedRef = useRef(false);
  const interstitialRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = interstitialRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !viewedRef.current) {
          viewedRef.current = true;
          trackEvent("interstitial_cta_viewed", { surface });
        }
      },
      { threshold: 0.5 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [surface]);

  function handleCtaClick() {
    trackEvent("interstitial_cta_clicked", { surface, sentiment });
  }

  function handleSkip(e: React.MouseEvent<HTMLAnchorElement>) {
    e.preventDefault();
    trackEvent("interstitial_skipped", { surface });
    document.getElementById("results-summary")?.scrollIntoView({ behavior: "smooth" });
  }

  return (
    <div
      ref={interstitialRef}
      data-testid="interstitial-cta"
      className="rounded-xl border-2 border-accent-500 bg-accent-500/5 px-5 py-5 text-center"
    >
      <p className="font-display text-lg font-bold tracking-tight text-neutral-950">
        {headline}
      </p>

      {/* Side-by-side spider comparison */}
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Sender's round */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-800">
            Their Round
          </p>
          <div className="h-[140px] sm:h-[180px]">
            <RadarChart
              data={senderChartData}
              bracketLabel={bracketLabel}
              compact
            />
          </div>
        </div>

        {/* Ghost (viewer's placeholder) */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-800">
            Your Round
          </p>
          <div className="h-[140px] sm:h-[180px]">
            <RadarChart
              data={ghostChartData}
              bracketLabel={bracketLabel}
              compact
              colors={["#a8a29e"]}
              fillOpacity={0.1}
            />
          </div>
          <p className="text-2xl font-bold text-neutral-400" aria-hidden="true">???</p>
          <span className="sr-only">Your results hidden — compare your game to find out</span>
        </div>
      </div>

      {/* CTA button */}
      <a
        href={ctaUrl}
        onClick={handleCtaClick}
        className="mt-4 inline-block min-h-11 rounded-lg bg-brand-800 px-5 py-2.5 text-sm font-medium text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-brand-700 hover:shadow-md active:translate-y-0"
      >
        Compare Your Game
      </a>
      <p className="mt-2 text-xs text-neutral-400">
        Takes 60 seconds · Free
      </p>

      {/* Skip link */}
      <a
        href="#results-summary"
        onClick={handleSkip}
        className="mt-3 inline-flex min-h-11 items-center text-sm text-neutral-400 underline transition-colors hover:text-neutral-600"
      >
        Skip to full results ↓
      </a>
    </div>
  );
}
