import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const { mockCaptureMonitoringException } = vi.hoisted(() => ({
  mockCaptureMonitoringException: vi.fn(),
}));

vi.mock("@/lib/monitoring/sentry", () => ({
  captureMonitoringException: mockCaptureMonitoringException,
}));

vi.mock("server-only", () => ({}));

import { verifyTurnstileToken } from "@/lib/security/turnstile";

describe("verifyTurnstileToken", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubEnv("TURNSTILE_SECRET_KEY", "turnstile-secret-key");
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
    mockCaptureMonitoringException.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("accepts a successful verification response", async () => {
    fetchMock.mockResolvedValue({
      json: async () => ({
        success: true,
        action: "save_round",
        hostname: "golfdataviz.com",
        "error-codes": [],
      }),
    });

    const result = await verifyTurnstileToken({
      token: "token",
      remoteIp: "1.2.3.4",
      expectedHostname: "golfdataviz.com:443",
    });

    expect(result).toEqual({
      ok: true,
      result: {
        success: true,
        errorCodes: [],
        action: "save_round",
        hostname: "golfdataviz.com",
      },
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      expect.objectContaining({
        method: "POST",
      })
    );
  });

  it("fails when Cloudflare rejects the token", async () => {
    fetchMock.mockResolvedValue({
      json: async () => ({
        success: false,
        action: "save_round",
        hostname: "golfdataviz.com",
        "error-codes": ["timeout-or-duplicate"],
      }),
    });

    const result = await verifyTurnstileToken({
      token: "token",
      remoteIp: "1.2.3.4",
      expectedHostname: "golfdataviz.com",
    });

    expect(result).toEqual({
      ok: false,
      reason: "verification_failed",
      result: {
        success: false,
        errorCodes: ["timeout-or-duplicate"],
        action: "save_round",
        hostname: "golfdataviz.com",
      },
    });
  });

  it("fails on action mismatch", async () => {
    fetchMock.mockResolvedValue({
      json: async () => ({
        success: true,
        action: "login",
        hostname: "golfdataviz.com",
      }),
    });

    const result = await verifyTurnstileToken({
      token: "token",
      remoteIp: "1.2.3.4",
      expectedHostname: "golfdataviz.com",
    });

    expect(result).toEqual({
      ok: false,
      reason: "action_mismatch",
      result: {
        success: true,
        errorCodes: [],
        action: "login",
        hostname: "golfdataviz.com",
      },
    });
  });

  it("fails on hostname mismatch", async () => {
    fetchMock.mockResolvedValue({
      json: async () => ({
        success: true,
        action: "save_round",
        hostname: "preview.golfdataviz.com",
      }),
    });

    const result = await verifyTurnstileToken({
      token: "token",
      remoteIp: "1.2.3.4",
      expectedHostname: "golfdataviz.com",
    });

    expect(result).toEqual({
      ok: false,
      reason: "hostname_mismatch",
      result: {
        success: true,
        errorCodes: [],
        action: "save_round",
        hostname: "preview.golfdataviz.com",
      },
    });
  });

  it("fails on transport errors", async () => {
    fetchMock.mockRejectedValue(new Error("network down"));

    const result = await verifyTurnstileToken({
      token: "token",
      remoteIp: "1.2.3.4",
      expectedHostname: "golfdataviz.com",
    });

    expect(result).toEqual({
      ok: false,
      reason: "transport",
      result: {
        success: false,
        errorCodes: ["verification-transport-failed"],
        action: null,
        hostname: null,
      },
    });
  });

  it("treats malformed responses as verification failures", async () => {
    fetchMock.mockResolvedValue({
      json: async () => "not-an-object",
    });

    const result = await verifyTurnstileToken({
      token: "token",
      remoteIp: "1.2.3.4",
      expectedHostname: "golfdataviz.com",
    });

    expect(result).toEqual({
      ok: false,
      reason: "verification_failed",
      result: {
        success: false,
        errorCodes: [],
        action: null,
        hostname: null,
      },
    });
  });
});
