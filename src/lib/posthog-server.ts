import { PostHog } from "posthog-node";

let _client: PostHog | null = null;

/**
 * Returns a shared PostHog server client (singleton).
 * In environments without a token (tests), returns a disabled client
 * that silently drops events.
 *
 * Note: posthog-node batches events internally. Callers should still call
 * shutdown() in short-lived contexts (API routes) to flush pending events
 * before the serverless function terminates. shutdown() flushes the queue
 * but does NOT destroy the singleton — subsequent calls continue to work.
 */
export function getPostHogClient(): PostHog {
  if (_client) return _client;
  const token = process.env.NEXT_PUBLIC_POSTHOG_TOKEN ?? "phx_noop";
  _client = new PostHog(token, {
    host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
    flushAt: 1,
    flushInterval: 0,
  });
  if (!process.env.NEXT_PUBLIC_POSTHOG_TOKEN) {
    _client.disable();
  }
  return _client;
}
