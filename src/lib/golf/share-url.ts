/**
 * Centralized share URL builder for SG round sharing.
 * Always builds encoded ?d= URLs with UTM parameters for attribution.
 *
 * Follows the getSiteUrl() convention (NEXT_PUBLIC_BASE_URL / NEXT_PUBLIC_SITE_URL)
 * so share links resolve to the correct deployment (staging, preview, local).
 */

export type ShareMedium = "copy_link" | "receipt_qr" | "cta";

const FALLBACK_BASE_URL = "https://golfdataviz.com";

function getBaseUrl(): string {
  const value =
    (typeof process !== "undefined" &&
      (process.env.NEXT_PUBLIC_BASE_URL ?? process.env.NEXT_PUBLIC_SITE_URL)) ||
    (typeof window !== "undefined" ? window.location.origin : FALLBACK_BASE_URL);
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

export function buildShareUrl(opts: {
  encodedPayload: string;
  medium: ShareMedium;
  baseUrl?: string;
}): string {
  const base = opts.baseUrl ?? `${getBaseUrl()}/strokes-gained`;
  const url = new URL(base);
  url.searchParams.set("d", opts.encodedPayload);
  url.searchParams.set("utm_source", "share");
  url.searchParams.set("utm_campaign", "round_share");
  url.searchParams.set("utm_medium", opts.medium);
  return url.toString();
}
