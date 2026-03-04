import { describe, it, expect, vi, beforeEach } from "vitest";
import { checkRateLimit, _getStore } from "@/lib/rate-limit";

describe("rate limiter", () => {
  beforeEach(() => {
    _getStore().clear();
    vi.useRealTimers();
  });

  it("allows requests under the limit", () => {
    for (let i = 0; i < 10; i++) {
      expect(checkRateLimit("1.2.3.4")).toBe(true);
    }
  });

  it("blocks the 11th request within the window", () => {
    for (let i = 0; i < 10; i++) {
      checkRateLimit("1.2.3.4");
    }
    expect(checkRateLimit("1.2.3.4")).toBe(false);
  });

  it("tracks IPs independently", () => {
    for (let i = 0; i < 10; i++) {
      checkRateLimit("1.1.1.1");
    }
    expect(checkRateLimit("1.1.1.1")).toBe(false);
    expect(checkRateLimit("2.2.2.2")).toBe(true);
  });

  it("resets after the window expires", () => {
    vi.useFakeTimers();
    for (let i = 0; i < 10; i++) {
      checkRateLimit("1.2.3.4");
    }
    expect(checkRateLimit("1.2.3.4")).toBe(false);

    // Advance past the 60s window
    vi.advanceTimersByTime(61_000);
    expect(checkRateLimit("1.2.3.4")).toBe(true);
    vi.useRealTimers();
  });

  it("falls back gracefully for missing x-forwarded-for (empty key)", () => {
    for (let i = 0; i < 10; i++) {
      checkRateLimit("");
    }
    // Empty string still gets rate limited
    expect(checkRateLimit("")).toBe(false);
  });

  it("handles the 'unknown' fallback key", () => {
    for (let i = 0; i < 10; i++) {
      checkRateLimit("unknown");
    }
    expect(checkRateLimit("unknown")).toBe(false);
  });

  it("cleanup removes stale entries from the store", () => {
    vi.useFakeTimers();
    checkRateLimit("stale-ip");
    expect(_getStore().size).toBe(1);

    // Advance past window + buffer
    vi.advanceTimersByTime(120_000);
    // Trigger cleanup by making a new request
    checkRateLimit("fresh-ip");
    expect(_getStore().has("stale-ip")).toBe(false);
    expect(_getStore().has("fresh-ip")).toBe(true);
    vi.useRealTimers();
  });
});
