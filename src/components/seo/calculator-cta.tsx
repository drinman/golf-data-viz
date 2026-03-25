"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { trackEvent } from "@/lib/analytics/client";

interface CalculatorCtaProps {
  surface: string;
}

export function CalculatorCta({ surface }: CalculatorCtaProps) {
  const pathname = usePathname();

  return (
    <div className="rounded-lg border border-brand-100 bg-brand-50 px-5 py-4">
      <p className="font-display text-lg tracking-tight text-neutral-950">
        Ready to benchmark your round?
      </p>
      <p className="mt-1 text-sm text-neutral-600">
        Enter your scorecard stats and see where you gain and lose strokes
        compared to golfers at your level.
      </p>
      <Link
        href="/strokes-gained"
        onClick={() =>
          trackEvent("seo_cta_clicked", {
            surface,
            source_path: pathname,
          })
        }
        className="mt-3 inline-flex min-h-11 items-center rounded-lg bg-brand-800 px-5 py-2.5 text-sm font-medium text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-brand-700 hover:shadow-md active:translate-y-0"
      >
        Try the Strokes Gained Calculator
      </Link>
    </div>
  );
}
