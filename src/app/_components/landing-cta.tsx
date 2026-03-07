"use client";

import { trackEvent } from "@/lib/analytics/client";

function getUtmSource(): string | undefined {
  if (typeof window === "undefined") return undefined;
  return new URLSearchParams(window.location.search).get("utm_source") ?? undefined;
}

function getCtaHref(utmSource?: string): string {
  if (!utmSource) return "/strokes-gained";

  const params = new URLSearchParams({ utm_source: utmSource });
  return `/strokes-gained?${params.toString()}`;
}

interface LandingCtaProps {
  utmSource?: string;
  eventName?: "landing_cta_clicked" | "sample_preview_cta_clicked";
  testId?: string;
}

export function LandingCta({
  utmSource,
  eventName = "landing_cta_clicked",
  testId = "hero-cta",
}: LandingCtaProps) {
  const effectiveUtmSource = utmSource ?? getUtmSource();

  return (
    <a
      href={getCtaHref(effectiveUtmSource)}
      data-testid={testId}
      className="inline-block rounded-lg bg-brand-800 px-6 py-3 text-base font-semibold text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-brand-700 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-brand-800/30 focus:ring-offset-2 active:translate-y-0"
      onClick={() => {
        trackEvent(eventName, { utm_source: effectiveUtmSource });
      }}
    >
      Benchmark My Round
    </a>
  );
}
