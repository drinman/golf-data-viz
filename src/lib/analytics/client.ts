import { track } from "@vercel/analytics";
import posthog from "posthog-js";
import type {
  AnalyticsEventProps,
  OptionalPayloadEvent,
  RequiredPayloadEvent,
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
 * Events with optional-or-empty payloads allow omitting `props`.
 */
export function trackEvent<E extends OptionalPayloadEvent>(
  event: E,
  props?: AnalyticsEventProps[E]
): void;
export function trackEvent<E extends RequiredPayloadEvent>(
  event: E,
  props: AnalyticsEventProps[E]
): void;
export function trackEvent(
  event: OptionalPayloadEvent | RequiredPayloadEvent,
  props?: Record<string, unknown>
): void {
  // Vercel Analytics
  try {
    if (props === undefined) {
      track(event);
    } else {
      track(
        event,
        props as Record<string, string | number | boolean | undefined>
      );
    }
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

  // PostHog
  try {
    posthog.capture(event, props);
  } catch {
    // PostHog unavailable or errored — swallow
  }
}
