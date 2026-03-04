"use client";

import { trackEvent } from "@/lib/analytics/client";

export function LandingCta() {
  return (
    <a
      href="/strokes-gained"
      data-testid="hero-cta"
      className="inline-block rounded-lg bg-brand-800 px-6 py-3 text-base font-semibold text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-brand-700 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-brand-800/30 focus:ring-offset-2 active:translate-y-0"
      onClick={() => {
        trackEvent("landing_cta_clicked");
      }}
    >
      Benchmark My Round
    </a>
  );
}
