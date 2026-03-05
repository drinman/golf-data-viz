"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

const MAX_RETRIES = 5;
const RETRY_MS = 100;

function firePageView(pathname: string) {
  const pageLocation = window.location.origin + pathname;
  window.gtag!("event", "page_view", {
    page_location: pageLocation,
    page_path: pathname,
  });
}

/**
 * Fires a sanitized GA4 page_view on every route change.
 * Uses pathname only (no query params) to avoid leaking ?d= round data.
 *
 * On first render, gtag may not be ready yet (loaded via afterInteractive).
 * Polls briefly until gtag appears, then fires. Subsequent route changes
 * fire immediately since gtag is guaranteed to exist by then.
 */
export function GA4PageView() {
  const pathname = usePathname();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    // Clean up any pending poll from a previous pathname change
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    try {
      if (typeof window === "undefined") return;

      // No GA4 configured — skip entirely
      if (!process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID) return;

      const tryFire = () => {
        if (typeof window.gtag === "function") {
          firePageView(pathname);
          return true;
        }
        return false;
      };

      if (tryFire()) {
        return;
      }

      let attempts = 0;
      intervalRef.current = setInterval(() => {
        attempts += 1;
        if (tryFire() || attempts >= MAX_RETRIES) {
          clearInterval(intervalRef.current!);
          intervalRef.current = null;
        }
      }, RETRY_MS);
    } catch {
      // gtag errored — swallow
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [pathname]);

  return null;
}
