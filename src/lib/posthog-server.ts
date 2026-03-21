import { PostHog } from "posthog-node";

let _client: PostHog | null = null;

/**
 * Returns a shared PostHog server client (singleton).
 * In environments without a token (tests), returns a disabled client
 * that silently drops events.
 *
 * With flushAt: 1, each event is sent immediately — no batching.
 * Callers should use flush() (not shutdown()) to ensure delivery
 * in serverless contexts. shutdown() is terminal and would break
 * the singleton for subsequent requests in the same process.
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
