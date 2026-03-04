"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

const MAX_WAIT_MS = 5000;
const POLL_MS = 100;

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
  const gtagUnavailableRef = useRef(false);

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

      // gtag already available — fire immediately (also clears timed-out flag
      // for slow-network cases where gtag loads after the initial timeout)
      if (typeof window.gtag === "function") {
        gtagUnavailableRef.current = false;
        firePageView(pathname);
        return;
      }

      // Previous poll timed out — gtag is likely blocked, don't poll again
      if (gtagUnavailableRef.current) return;

      // gtag not ready yet — poll until it appears or timeout
      const start = Date.now();
      intervalRef.current = setInterval(() => {
        if (typeof window.gtag === "function") {
          clearInterval(intervalRef.current!);
          intervalRef.current = null;
          firePageView(pathname);
        } else if (Date.now() - start >= MAX_WAIT_MS) {
          clearInterval(intervalRef.current!);
          intervalRef.current = null;
          gtagUnavailableRef.current = true;
        }
      }, POLL_MS);
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
