import { track } from "@vercel/analytics";
import type {
  AnalyticsEventProps,
  NoPayloadEvent,
  PayloadEvent,
} from "./events";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

/**
 * Fire an analytics event to both Vercel Analytics and GA4.
 * No-ops when a sink is unavailable. Never throws.
 *
 * Events with required payload fields enforce `props` at the call site.
 * Events with no payload allow omitting `props`.
 */
export function trackEvent(event: NoPayloadEvent): void;
export function trackEvent<E extends PayloadEvent>(
  event: E,
  props: AnalyticsEventProps[E]
): void;
export function trackEvent(
  event: NoPayloadEvent | PayloadEvent,
  props?: Record<string, unknown>
): void {
  // Vercel Analytics
  try {
    track(event, props as Record<string, string | number | boolean | undefined>);
  } catch {
    // Vercel SDK unavailable or errored — swallow
  }

  // GA4 via gtag
  try {
    const gaId = process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID;
    if (gaId && typeof window !== "undefined" && typeof window.gtag === "function") {
      // Strip query string from page_location to avoid leaking ?d= round data.
      // GA4 attaches page_location to all events by default, even custom ones.
      const safeLocation = typeof window.location !== "undefined"
        ? window.location.origin + window.location.pathname
        : undefined;
      window.gtag("event", event, {
        ...props,
        ...(safeLocation ? { page_location: safeLocation } : {}),
      });
    }
  } catch {
    // gtag unavailable or errored — swallow
  }
}
