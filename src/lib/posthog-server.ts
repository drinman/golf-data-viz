import { PostHog } from "posthog-node";

/**
 * Returns a PostHog server client. In environments without a token (tests),
 * creates a disabled client that silently drops events.
 */
export function getPostHogClient(): PostHog {
  const token = process.env.NEXT_PUBLIC_POSTHOG_TOKEN ?? "phx_noop";
  const client = new PostHog(token, {
    host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
    flushAt: 1,
    flushInterval: 0,
  });
  // When no real token is configured, disable to prevent network calls
  if (!process.env.NEXT_PUBLIC_POSTHOG_TOKEN) {
    client.disable();
  }
  return client;
}
