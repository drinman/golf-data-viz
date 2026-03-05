import { createHash } from "node:crypto";

const MINUTE_WINDOW_SECONDS = 60;
const HOUR_WINDOW_SECONDS = 60 * 60;
const MAX_REQUESTS_PER_MINUTE = 5;
const MAX_REQUESTS_PER_HOUR = 30;
const KV_FETCH_TIMEOUT_MS = 3000;

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

function getDefaultStore(): RateLimitStore {
  if (defaultStore) return defaultStore;

  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (url && token) {
    defaultStore = new VercelKvRateLimitStore(url, token);
    return defaultStore;
  }

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
  const salt = process.env.RATE_LIMIT_SALT?.trim();
  if (!salt) {
    throw new Error("RATE_LIMIT_SALT is required");
  }
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex");
}

export async function checkRateLimit(
  ip: string,
  store: RateLimitStore = getDefaultStore()
): Promise<RateLimitDecision> {
  try {
    const key = hashRateLimitKey(ip || "unknown");
    const minuteKey = `save_round:minute:${key}`;
    const hourKey = `save_round:hour:${key}`;

    const [minuteCount, hourCount] = await Promise.all([
      store.increment(minuteKey, MINUTE_WINDOW_SECONDS),
      store.increment(hourKey, HOUR_WINDOW_SECONDS),
    ]);

    if (minuteCount > MAX_REQUESTS_PER_MINUTE) {
      return { allowed: false, reason: "minute" };
    }

    if (hourCount > MAX_REQUESTS_PER_HOUR) {
      return { allowed: false, reason: "hour" };
    }

    return { allowed: true };
  } catch (error) {
    console.error("[rate-limit] Check failed:", error);
    // Fail closed to protect the write path when KV is unavailable.
    return { allowed: false, reason: "minute" };
  }
}

/** Exposed for tests only */
export function _resetRateLimitStore() {
  defaultStore = null;
}
