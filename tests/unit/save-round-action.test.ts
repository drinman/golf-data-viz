import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { RoundInput } from "@/lib/golf/types";
import { makeRound } from "../fixtures/factories";

const {
  mockInsert,
  mockCreateAdminClient,
  mockCheckRateLimit,
  mockCaptureMonitoringException,
  mockVerifyTurnstileToken,
} = vi.hoisted(() => ({
  mockInsert: vi.fn(),
  mockCreateAdminClient: vi.fn(),
  mockCheckRateLimit: vi.fn(),
  mockCaptureMonitoringException: vi.fn(),
  mockVerifyTurnstileToken: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: mockCreateAdminClient,
}));

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: mockCheckRateLimit,
  extractClientIp: vi.fn(() => "1.2.3.4"),
}));

vi.mock("@/lib/monitoring/sentry", () => ({
  captureMonitoringException: mockCaptureMonitoringException,
}));

vi.mock("@/lib/security/turnstile", () => ({
  verifyTurnstileToken: mockVerifyTurnstileToken,
}));

vi.mock("next/headers", () => ({
  headers: vi.fn(
    async () => new Map([
      ["x-forwarded-for", "1.2.3.4"],
      ["host", "golfdataviz.com"],
    ])
  ),
}));

import { SupabaseConfigError } from "@/lib/supabase/errors";
import { saveRound } from "@/app/(tools)/strokes-gained/actions";

const verification = {
  turnstileToken: "turnstile-token",
};

describe("saveRound server action", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("ENABLE_ROUND_SAVE", "true");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service-role-key");
    vi.stubEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY", "turnstile-site-key");
    vi.stubEnv("TURNSTILE_SECRET_KEY", "turnstile-secret-key");
    vi.spyOn(console, "warn").mockImplementation(() => {});
    mockCheckRateLimit.mockResolvedValue({ allowed: true });
    mockVerifyTurnstileToken.mockResolvedValue({
      ok: true,
      result: {
        success: true,
        errorCodes: [],
        action: "save_round",
        hostname: "golfdataviz.com",
      },
    });
    mockCreateAdminClient.mockReturnValue({
      from: vi.fn(() => ({
        insert: mockInsert,
      })),
    });
    mockInsert.mockResolvedValue({ error: null });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("fails closed when ENABLE_ROUND_SAVE is not set to true", async () => {
    vi.stubEnv("ENABLE_ROUND_SAVE", "false");

    const result = await saveRound(makeRound(), verification);

    expect(result).toEqual({
      success: false,
      code: "SAVE_DISABLED",
      message: "Cloud save unavailable — your results are still shown below.",
    });
    expect(mockCreateAdminClient).not.toHaveBeenCalled();
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("returns success on successful admin insert", async () => {
    const result = await saveRound(makeRound(), verification);
    expect(result).toEqual({ success: true });
    expect(mockCreateAdminClient).toHaveBeenCalledTimes(1);
  });

  it("returns DB_ERROR when Supabase insert reports an error", async () => {
    mockInsert.mockResolvedValue({
      error: { message: "check constraint violated", code: "23514" },
    });

    const result = await saveRound(makeRound(), verification);

    expect(result).toEqual({
      success: false,
      code: "DB_ERROR",
      message: "Round could not be saved.",
    });
  });

  it("retries without trust metadata when production schema is behind app code", async () => {
    mockInsert
      .mockResolvedValueOnce({
        error: {
          message:
            "Could not find the 'trust_reasons' column of 'rounds' in the schema cache",
          code: "PGRST204",
        },
      })
      .mockResolvedValueOnce({ error: null });

    const result = await saveRound(makeRound(), verification);

    expect(result).toEqual({ success: true });
    expect(mockInsert).toHaveBeenCalledTimes(2);
    expect(mockInsert.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        trust_status: "trusted",
        trust_reasons: [],
      })
    );
    expect(mockInsert.mock.calls[1][0]).toEqual(
      expect.not.objectContaining({
        trust_status: expect.anything(),
        trust_reasons: expect.anything(),
      })
    );
  });

  it("returns UNEXPECTED when insert throws", async () => {
    mockInsert.mockRejectedValue(new Error("Network failure"));

    const result = await saveRound(makeRound(), verification);

    expect(result).toEqual({
      success: false,
      code: "UNEXPECTED",
      message: "An unexpected error occurred.",
    });
  });

  it("returns VALIDATION when server-side schema validation fails", async () => {
    const invalidRound = makeRound({ score: 999 });

    const result = await saveRound(invalidRound, verification);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe("VALIDATION");
      expect(result.message).toMatch(/score/i);
    }
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("returns VALIDATION when scoring breakdown does not sum to 18 holes", async () => {
    const invalidRound = makeRound({
      eagles: 1,
      birdies: 1,
      pars: 6,
      bogeys: 7,
      doubleBogeys: 1,
      triplePlus: 1,
    });

    const result = await saveRound(invalidRound, verification);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe("VALIDATION");
      expect(result.message).toMatch(/18|hole|sum/i);
    }
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("returns RATE_LIMITED when request exceeds limit", async () => {
    mockCheckRateLimit.mockResolvedValue({ allowed: false, reason: "minute" });

    const result = await saveRound(makeRound(), verification);

    expect(result).toEqual({
      success: false,
      code: "RATE_LIMITED",
      message: "Too many requests. Please try again shortly.",
    });
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("captures sampled monitoring event when rate limited", async () => {
    mockCheckRateLimit.mockResolvedValue({ allowed: false, reason: "minute" });
    vi.spyOn(Math, "random").mockReturnValue(0.05);

    const result = await saveRound(makeRound(), verification);

    expect(result).toEqual({
      success: false,
      code: "RATE_LIMITED",
      message: "Too many requests. Please try again shortly.",
    });
    expect(mockCaptureMonitoringException).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        source: "saveRound",
        code: "RATE_LIMITED",
        reason: "minute",
      })
    );
  });

  it("does not capture monitoring event when rate-limited sample is skipped", async () => {
    mockCheckRateLimit.mockResolvedValue({ allowed: false, reason: "hour" });
    vi.spyOn(Math, "random").mockReturnValue(0.99);

    const result = await saveRound(makeRound(), verification);

    expect(result).toEqual({
      success: false,
      code: "RATE_LIMITED",
      message: "Too many requests. Please try again shortly.",
    });
    expect(mockCaptureMonitoringException).not.toHaveBeenCalled();
  });

  it("returns SAVE_DISABLED when admin client config is missing", async () => {
    mockCreateAdminClient.mockImplementation(() => {
      throw new SupabaseConfigError("Missing config");
    });

    const result = await saveRound(makeRound(), verification);

    expect(result).toEqual({
      success: false,
      code: "SAVE_DISABLED",
      message: "Cloud save unavailable — your results are still shown below.",
    });
    expect(mockCaptureMonitoringException).toHaveBeenCalledWith(
      expect.any(SupabaseConfigError),
      expect.objectContaining({
        source: "saveRound",
        code: "SAVE_DISABLED",
      })
    );
  });

  it("writes mapped snake_case payload through admin client", async () => {
    await saveRound(makeRound({ course: "Pebble Beach", date: "2026-01-15" }), verification);

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        course_name: "Pebble Beach",
        played_at: "2026-01-15",
        handicap_index: 14.3,
        user_id: null,
      })
    );
  });

  it("maps blank FIR/GIR to null in DB insert", async () => {
    const round = makeRound();
    delete round.fairwaysHit;
    delete round.greensInRegulation;

    await saveRound(round, verification);

    const insertedRow = mockInsert.mock.calls[0][0];
    expect(insertedRow.fairways_hit).toBeNull();
    expect(insertedRow.greens_in_regulation).toBeNull();
  });

  it("writes trusted trust metadata for a typical round", async () => {
    await saveRound(makeRound(), verification);

    const insertedRow = mockInsert.mock.calls[0][0];
    expect(insertedRow.trust_status).toBe("trusted");
    expect(insertedRow.trust_reasons).toEqual([]);
    // trust_scored_at is stamped by the database (trigger/default), not app clock.
    expect(insertedRow.trust_scored_at).toBeUndefined();
  });

  it("writes quarantined trust metadata when trust rules flag anomalies", async () => {
    const anomalousRound = makeRound({
      handicapIndex: 54,
      score: 80,
      eagles: 0,
      birdies: 4,
      pars: 4,
      bogeys: 7,
      doubleBogeys: 2,
      triplePlus: 1,
    });

    await saveRound(anomalousRound, verification);

    const insertedRow = mockInsert.mock.calls[0][0];
    expect(insertedRow.trust_status).toBe("quarantined");
    expect(insertedRow.trust_reasons).toContain("differential_handicap_gap");
    expect(insertedRow.trust_reasons).toContain("high_hcp_scoring_spike");
  });

  it("inserts parsed.data (coerced/sanitized), not raw input", async () => {
    const rawInput = {
      course: "Test Course",
      date: "2026-02-26",
      score: "87" as unknown as number,
      handicapIndex: "14.3" as unknown as number,
      courseRating: "72.0" as unknown as number,
      slopeRating: "130" as unknown as number,
      fairwaysHit: "7" as unknown as number,
      fairwayAttempts: "14" as unknown as number,
      greensInRegulation: "6" as unknown as number,
      totalPutts: "33" as unknown as number,
      penaltyStrokes: "2" as unknown as number,
      eagles: "0" as unknown as number,
      birdies: "1" as unknown as number,
      pars: "7" as unknown as number,
      bogeys: "7" as unknown as number,
      doubleBogeys: "2" as unknown as number,
      triplePlus: "1" as unknown as number,
      threePutts: "" as unknown as number,
    } as RoundInput;

    await saveRound(rawInput, verification);

    const insertedRow = mockInsert.mock.calls[0][0];
    expect(typeof insertedRow.score).toBe("number");
    expect(insertedRow.score).toBe(87);
    expect(typeof insertedRow.handicap_index).toBe("number");
    expect(insertedRow.handicap_index).toBe(14.3);
    expect(insertedRow.three_putts).toBeNull();
  });

  it("returns VERIFICATION_REQUIRED when the Turnstile token is missing", async () => {
    const result = await saveRound(makeRound(), { turnstileToken: null });

    expect(result).toEqual({
      success: false,
      code: "VERIFICATION_REQUIRED",
      message: "Complete the bot check to save anonymously.",
    });
    expect(mockCheckRateLimit).not.toHaveBeenCalled();
    expect(mockVerifyTurnstileToken).not.toHaveBeenCalled();
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("returns VERIFICATION_FAILED when Turnstile verification rejects the request", async () => {
    mockVerifyTurnstileToken.mockResolvedValueOnce({
      ok: false,
      reason: "verification_failed",
      result: {
        success: false,
        errorCodes: ["timeout-or-duplicate"],
        action: "save_round",
        hostname: "golfdataviz.com",
      },
    });

    const result = await saveRound(makeRound(), verification);

    expect(result).toEqual({
      success: false,
      code: "VERIFICATION_FAILED",
      message: "Bot check failed. Please try again.",
    });
    expect(mockInsert).not.toHaveBeenCalled();
  });
});
