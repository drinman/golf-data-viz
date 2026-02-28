"use client";

import { trackEvent } from "@/lib/analytics/client";

export function LandingCta() {
  return (
    <a
      href="/strokes-gained"
      data-testid="hero-cta"
      className="inline-block rounded-md bg-green-600 px-6 py-3 text-base font-semibold text-white shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
      onClick={() => {
        trackEvent("landing_cta_clicked");
      }}
    >
      Benchmark My Round
    </a>
  );
}
