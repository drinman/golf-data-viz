import { createHash } from "node:crypto";
import { captureMonitoringException } from "@/lib/monitoring/sentry";

const DEFAULT_MINUTE_WINDOW_SECONDS = 60;
const DEFAULT_HOUR_WINDOW_SECONDS = 60 * 60;
const DEFAULT_MAX_PER_MINUTE = 5;
const DEFAULT_MAX_PER_HOUR = 30;
const KV_FETCH_TIMEOUT_MS = 3000;
const MIN_RATE_LIMIT_SALT_LENGTH = 16;
const DEV_FALLBACK_SALT = "dev-rate-limit-fallback-salt";

type RateLimitReason = "minute" | "hour";

export interface RateLimitDecision {
  allowed: boolean;
  reason?: RateLimitReason;
}

export interface HeaderReader {
  get(name: string): string | null;
}

export interface RateLimitStore {
  increment(key: string, ttlSeconds: number): Promise<number>;
}

export class InMemoryRateLimitStore implements RateLimitStore {
  private readonly counts = new Map<string, { count: number; expiresAt: number }>();

  async increment(key: string, ttlSeconds: number): Promise<number> {
    const now = Date.now();
    const existing = this.counts.get(key);
    if (!existing || existing.expiresAt <= now) {
      this.counts.set(key, {
        count: 1,
        expiresAt: now + ttlSeconds * 1000,
      });
      return 1;
    }

    existing.count += 1;
    this.counts.set(key, existing);
    return existing.count;
  }

  /** Exposed for tests only */
  _size(): number {
    return this.counts.size;
  }
}

class VercelKvRateLimitStore implements RateLimitStore {
  constructor(
    private readonly restUrl: string,
    private readonly restToken: string
  ) {}

  async increment(key: string, ttlSeconds: number): Promise<number> {
    const endpoint = `${this.restUrl.replace(/\/$/, "")}/pipeline`;
    const response = await fetch(endpoint, {
      method: "POST",
      signal: AbortSignal.timeout(KV_FETCH_TIMEOUT_MS),
      headers: {
        Authorization: `Bearer ${this.restToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify([
        // Fixed window: set TTL once on first write, then increment.
        ["SET", key, 0, "EX", ttlSeconds, "NX"],
        ["INCR", key],
      ]),
    });

    if (!response.ok) {
      throw new Error(`KV pipeline request failed (${response.status})`);
    }

    const payload = (await response.json()) as Array<{ result: unknown }>;
    const value = Number(payload?.[1]?.result);
    if (!Number.isFinite(value)) {
      throw new Error("KV pipeline returned non-numeric counter");
    }

    return value;
  }
}

let defaultStore: RateLimitStore | null = null;
let hasWarnedInMemoryFallback = false;
let hasWarnedSaltFallback = false;

function isProductionRuntime(): boolean {
  return process.env.NODE_ENV === "production";
}

function warnSaltFallbackOnce(reason: "missing" | "too_short"): string {
  if (!hasWarnedSaltFallback) {
    hasWarnedSaltFallback = true;
    const nodeEnv = process.env.NODE_ENV ?? "unknown";
    console.warn(
      `[rate-limit] RATE_LIMIT_SALT ${reason}; using non-production fallback salt`
    );
    captureMonitoringException(new Error("Rate limit salt fallback active"), {
      source: "rate-limit",
      code: "RATE_LIMIT_SALT_FALLBACK",
      reason,
      min_length: MIN_RATE_LIMIT_SALT_LENGTH,
      node_env: nodeEnv,
    });
  }

  return DEV_FALLBACK_SALT;
}

function warnInMemoryFallbackOnce(): void {
  if (hasWarnedInMemoryFallback || !isProductionRuntime()) return;

  hasWarnedInMemoryFallback = true;
  console.warn(
    "[rate-limit] KV credentials missing; falling back to in-memory store in production"
  );
  captureMonitoringException(
    new Error("Rate limiter fell back to in-memory store in production"),
    {
      source: "rate-limit",
      code: "RATE_LIMIT_IN_MEMORY_FALLBACK",
    }
  );
}

function getDefaultStore(): RateLimitStore {
  if (defaultStore) return defaultStore;

  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (url && token) {
    defaultStore = new VercelKvRateLimitStore(url, token);
    return defaultStore;
  }

  warnInMemoryFallbackOnce();
  defaultStore = new InMemoryRateLimitStore();
  return defaultStore;
}

function parseFirstIp(value: string | null): string | null {
  if (!value) return null;
  const first = value
    .split(",")
    .map((part) => part.trim())
    .find(Boolean);
  return first || null;
}

export function extractClientIp(headers: HeaderReader): string {
  return (
    parseFirstIp(headers.get("x-vercel-forwarded-for")) ||
    parseFirstIp(headers.get("x-forwarded-for")) ||
    parseFirstIp(headers.get("cf-connecting-ip")) ||
    "unknown"
  );
}

export function hashRateLimitKey(ip: string): string {
  const configuredSalt = process.env.RATE_LIMIT_SALT?.trim();

  let salt = configuredSalt;
  if (!salt) {
    if (isProductionRuntime()) {
      throw new Error("RATE_LIMIT_SALT is required in production");
    }
    salt = warnSaltFallbackOnce("missing");
  } else if (salt.length < MIN_RATE_LIMIT_SALT_LENGTH) {
    if (isProductionRuntime()) {
      throw new Error(
        `RATE_LIMIT_SALT must be at least ${MIN_RATE_LIMIT_SALT_LENGTH} characters in production`
      );
    }
    salt = warnSaltFallbackOnce("too_short");
  }

  return createHash("sha256").update(`${salt}:${ip}`).digest("hex");
}

export interface RateLimitOptions {
  prefix?: string;
  maxPerMinute?: number;
  maxPerHour?: number;
}

export async function checkRateLimit(
  ip: string,
  store: RateLimitStore = getDefaultStore(),
  options?: RateLimitOptions
): Promise<RateLimitDecision> {
  const prefix = options?.prefix ?? "save_round";
  const maxPerMinute = options?.maxPerMinute ?? DEFAULT_MAX_PER_MINUTE;
  const maxPerHour = options?.maxPerHour ?? DEFAULT_MAX_PER_HOUR;

  try {
    const key = hashRateLimitKey(ip || "unknown");
    const checkMinute = !options || options.maxPerMinute !== undefined;

    const checks: Promise<number>[] = [];
    if (checkMinute) {
      checks.push(store.increment(`${prefix}:minute:${key}`, DEFAULT_MINUTE_WINDOW_SECONDS));
    }
    checks.push(store.increment(`${prefix}:hour:${key}`, DEFAULT_HOUR_WINDOW_SECONDS));

    const results = await Promise.all(checks);
    const minuteCount = checkMinute ? results[0] : undefined;
    const hourCount = checkMinute ? results[1] : results[0];

    if (minuteCount !== undefined && minuteCount > maxPerMinute) {
      return { allowed: false, reason: "minute" };
    }

    if (hourCount > maxPerHour) {
      return { allowed: false, reason: "hour" };
    }

    return { allowed: true };
  } catch (error) {
    console.error("[rate-limit] Check failed:", error);
    captureMonitoringException(error, {
      source: "checkRateLimit",
      code: "KV_UNAVAILABLE",
    });
    // Fail open: allow saves when KV is unreachable. With Turnstile removed,
    // rate limiting is the primary bot defense. A KV outage leaves honeypot +
    // trust scoring + dedup as protection — sufficient at current scale.
    // Losing real user saves to KV blips is worse than theoretical bot risk.
    return { allowed: true };
  }
}

/** Exposed for tests only */
export function _resetRateLimitStore() {
  defaultStore = null;
  hasWarnedInMemoryFallback = false;
  hasWarnedSaltFallback = false;
}
