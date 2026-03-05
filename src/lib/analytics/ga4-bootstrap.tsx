"use client";

import { useEffect } from "react";

declare global {
  interface Window {
    dataLayer?: unknown[];
  }
}

interface GA4BootstrapProps {
  measurementId?: string | null;
}

export function GA4Bootstrap({ measurementId }: GA4BootstrapProps) {
  useEffect(() => {
    if (!measurementId || typeof window === "undefined") return;

    window.dataLayer = window.dataLayer || [];
    if (typeof window.gtag !== "function") {
      window.gtag = (...args: unknown[]) => {
        window.dataLayer!.push(args);
      };
    }

    window.gtag("js", new Date());
    window.gtag("config", measurementId, { send_page_view: false });
  }, [measurementId]);

  return null;
}
