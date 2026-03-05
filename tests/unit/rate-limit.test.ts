import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  checkRateLimit,
  extractClientIp,
  hashRateLimitKey,
  InMemoryRateLimitStore,
  _resetRateLimitStore,
} from "@/lib/rate-limit";

describe("rate limiter", () => {
  beforeEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
    vi.stubEnv("RATE_LIMIT_SALT", "test-salt");
    _resetRateLimitStore();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("extracts client IP using the expected header precedence", () => {
    const headers = {
      get(name: string) {
        if (name === "x-vercel-forwarded-for") return "3.3.3.3";
        if (name === "x-forwarded-for") return "2.2.2.2";
        if (name === "cf-connecting-ip") return "1.1.1.1";
        return null;
      },
    };

    expect(extractClientIp(headers)).toBe("3.3.3.3");
  });

  it("falls back to x-forwarded-for and then cf-connecting-ip", () => {
    const headers = {
      get(name: string) {
        if (name === "x-forwarded-for") return "2.2.2.2, 2.2.2.3";
        if (name === "cf-connecting-ip") return "1.1.1.1";
        return null;
      },
    };

    expect(extractClientIp(headers)).toBe("2.2.2.2");
  });

  it("returns unknown when no client IP headers are present", () => {
    const headers = { get: () => null };
    expect(extractClientIp(headers)).toBe("unknown");
  });

  it("hashes IP keys with the RATE_LIMIT_SALT", () => {
    const hashed = hashRateLimitKey("1.2.3.4");
    expect(hashed).not.toBe("1.2.3.4");
    expect(hashed).toHaveLength(64);
  });

  it("fails closed when RATE_LIMIT_SALT is missing", async () => {
    vi.stubEnv("RATE_LIMIT_SALT", "");
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const decision = await checkRateLimit("1.2.3.4", new InMemoryRateLimitStore());
    expect(decision).toEqual({ allowed: false, reason: "minute" });
    expect(errorSpy).toHaveBeenCalled();
  });

  it("blocks the 6th request within a minute", async () => {
    const store = new InMemoryRateLimitStore();
    for (let i = 0; i < 5; i++) {
      const decision = await checkRateLimit("1.2.3.4", store);
      expect(decision).toEqual({ allowed: true });
    }

    const blocked = await checkRateLimit("1.2.3.4", store);
    expect(blocked).toEqual({ allowed: false, reason: "minute" });
  });

  it("resets the minute window after 60 seconds", async () => {
    vi.useFakeTimers();
    const store = new InMemoryRateLimitStore();

    for (let i = 0; i < 6; i++) {
      await checkRateLimit("1.2.3.4", store);
    }
    expect(await checkRateLimit("1.2.3.4", store)).toEqual({
      allowed: false,
      reason: "minute",
    });

    vi.advanceTimersByTime(61_000);
    expect(await checkRateLimit("1.2.3.4", store)).toEqual({ allowed: true });
  });

  it("blocks the 31st request within an hour", async () => {
    vi.useFakeTimers();
    const store = new InMemoryRateLimitStore();

    for (let i = 0; i < 30; i++) {
      const decision = await checkRateLimit("1.2.3.4", store);
      expect(decision).toEqual({ allowed: true });
      vi.advanceTimersByTime(61_000);
    }

    const blocked = await checkRateLimit("1.2.3.4", store);
    expect(blocked).toEqual({ allowed: false, reason: "hour" });
  });

  it("tracks IPs independently", async () => {
    const store = new InMemoryRateLimitStore();
    for (let i = 0; i < 6; i++) {
      await checkRateLimit("1.1.1.1", store);
    }

    expect(await checkRateLimit("1.1.1.1", store)).toEqual({
      allowed: false,
      reason: "minute",
    });
    expect(await checkRateLimit("2.2.2.2", store)).toEqual({ allowed: true });
  });

  it("uses fixed-window KV pipeline commands with request timeout", async () => {
    vi.stubEnv("KV_REST_API_URL", "https://example.upstash.io");
    vi.stubEnv("KV_REST_API_TOKEN", "test-token");
    _resetRateLimitStore();

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ result: "OK" }, { result: 1 }],
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await checkRateLimit("1.2.3.4");

    expect(result).toEqual({ allowed: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);

    const [firstUrl, firstInit] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(firstUrl).toBe("https://example.upstash.io/pipeline");
    expect(firstInit.signal).toBeInstanceOf(AbortSignal);

    const commands = JSON.parse(String(firstInit.body)) as unknown[][];
    expect(commands).toHaveLength(2);
    expect(commands[0][0]).toBe("SET");
    expect(commands[0][2]).toBe(0);
    expect(commands[0][3]).toBe("EX");
    expect(commands[0][5]).toBe("NX");
    expect(commands[1][0]).toBe("INCR");
  });
});
