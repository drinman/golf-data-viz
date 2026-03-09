import { describe, it, expect, vi, afterEach } from "vitest";
import { generateClaimToken, hashClaimToken } from "@/lib/security/claim-token";

describe("generateClaimToken", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns a 64-character hex string for rawToken", async () => {
    const { rawToken } = await generateClaimToken();
    expect(rawToken).toMatch(/^[0-9a-f]{64}$/);
  });

  it("returns a 64-character hex string for hash", async () => {
    const { hash } = await generateClaimToken();
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("hash differs from rawToken", async () => {
    const { rawToken, hash } = await generateClaimToken();
    expect(hash).not.toBe(rawToken);
  });

  it("expiresAt is approximately 30 days in the future", async () => {
    const before = Date.now();
    const { expiresAt } = await generateClaimToken();
    const after = Date.now();

    const expiresMs = new Date(expiresAt).getTime();
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;

    // Allow 5 seconds of clock drift
    expect(expiresMs).toBeGreaterThanOrEqual(before + thirtyDaysMs - 5000);
    expect(expiresMs).toBeLessThanOrEqual(after + thirtyDaysMs + 5000);
  });

  it("expiresAt is a valid ISO-8601 string", async () => {
    const { expiresAt } = await generateClaimToken();
    const parsed = new Date(expiresAt);
    expect(parsed.toISOString()).toBe(expiresAt);
  });

  it("generates unique tokens on successive calls", async () => {
    const a = await generateClaimToken();
    const b = await generateClaimToken();
    expect(a.rawToken).not.toBe(b.rawToken);
    expect(a.hash).not.toBe(b.hash);
  });
});

describe("hashClaimToken", () => {
  it("produces a 64-character hex string", async () => {
    const hash = await hashClaimToken("test-token-abc");
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("produces consistent output for the same input", async () => {
    const hash1 = await hashClaimToken("deterministic-input");
    const hash2 = await hashClaimToken("deterministic-input");
    expect(hash1).toBe(hash2);
  });

  it("produces different output for different inputs", async () => {
    const hash1 = await hashClaimToken("input-a");
    const hash2 = await hashClaimToken("input-b");
    expect(hash1).not.toBe(hash2);
  });

  it("matches the hash produced by generateClaimToken for the same token", async () => {
    const { rawToken, hash } = await generateClaimToken();
    const reHashed = await hashClaimToken(rawToken);
    expect(reHashed).toBe(hash);
  });
});
