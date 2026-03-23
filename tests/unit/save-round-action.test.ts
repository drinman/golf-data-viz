import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { RoundInput } from "@/lib/golf/types";
import { makeRound, makeSGResult } from "../fixtures/factories";

const {
  mockInsert,
  mockUpdate,
  mockCreateAdminClient,
  mockCheckRateLimit,
  mockCaptureMonitoringException,
  mockGenerateClaimToken,
  mockGetUser,
  mockRevalidatePath,
} = vi.hoisted(() => ({
  mockInsert: vi.fn(),
  mockUpdate: vi.fn(),
  mockCreateAdminClient: vi.fn(),
  mockCheckRateLimit: vi.fn(),
  mockCaptureMonitoringException: vi.fn(),
  mockGenerateClaimToken: vi.fn(),
  mockGetUser: vi.fn(),
  mockRevalidatePath: vi.fn(),
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

vi.mock("@/lib/security/claim-token", () => ({
  generateClaimToken: mockGenerateClaimToken,
  hashClaimToken: vi.fn(),
}));

vi.mock("@/lib/supabase/auth", () => ({
  getUser: mockGetUser,
}));

vi.mock("next/cache", () => ({
  revalidatePath: mockRevalidatePath,
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
import * as strokesGainedModule from "@/lib/golf/strokes-gained";
import * as strokesGainedV3Module from "@/lib/golf/strokes-gained-v3";

const verification = {};

const FAKE_CLAIM_TOKEN = "abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890";
const FAKE_CLAIM_HASH = "hashedvalue01234567890abcdef1234567890abcdef1234567890abcdef1234";
const FAKE_CLAIM_EXPIRES = "2026-04-08T00:00:00.000Z";

describe("saveRound server action", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("ENABLE_ROUND_SAVE", "true");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service-role-key");
    vi.spyOn(console, "warn").mockImplementation(() => {});
    mockGetUser.mockResolvedValue(null);
    mockCheckRateLimit.mockResolvedValue({ allowed: true });
    mockGenerateClaimToken.mockResolvedValue({
      rawToken: FAKE_CLAIM_TOKEN,
      hash: FAKE_CLAIM_HASH,
      expiresAt: FAKE_CLAIM_EXPIRES,
    });
    mockUpdate.mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    });
    mockCreateAdminClient.mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === "rounds") {
          return {
            insert: mockInsert,
            update: mockUpdate,
          };
        }
        // sg_shadow_comparisons
        return {
          insert: vi.fn().mockResolvedValue({ error: null }),
        };
      }),
    });
    mockInsert.mockReturnValue({
      select: vi.fn().mockResolvedValue({ error: null, data: [{ id: "test-round-id" }] }),
    });
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

  it("returns success with roundId and claimToken on successful admin insert", async () => {
    const result = await saveRound(makeRound(), verification);
    expect(result).toEqual({
      success: true,
      roundId: "test-round-id",
      claimToken: FAKE_CLAIM_TOKEN,
      isOwned: false,
    });
    expect(mockCreateAdminClient).toHaveBeenCalledTimes(1);
  });

  it("stores claim_token_hash (not raw token) via update after insert", async () => {
    await saveRound(makeRound(), verification);

    expect(mockUpdate).toHaveBeenCalledWith({
      claim_token_hash: FAKE_CLAIM_HASH,
      claim_token_expires_at: FAKE_CLAIM_EXPIRES,
    });
  });

  it("returns DB_ERROR when Supabase insert reports an error", async () => {
    mockInsert.mockReturnValue({
      select: vi.fn().mockResolvedValue({
        error: { message: "check constraint violated", code: "23514" },
        data: null,
      }),
    });

    const result = await saveRound(makeRound(), verification);

    expect(result).toEqual({
      success: false,
      code: "DB_ERROR",
      message: "Round could not be saved.",
    });
  });

  it("rejects numeric-only course names before touching the database", async () => {
    const result = await saveRound(
      makeRound({
        course: "98",
      }),
      verification
    );

    expect(result.success).toBe(false);
    expect(result).toMatchObject({
      code: "VALIDATION",
      message: "Course name must include letters",
    });
    expect(mockCreateAdminClient).not.toHaveBeenCalled();
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("returns DUPLICATE_ROUND when unique constraint violation (23505) occurs", async () => {
    mockInsert.mockReturnValue({
      select: vi.fn().mockResolvedValue({
        error: {
          message: 'duplicate key value violates unique constraint "rounds_dedup_idx"',
          code: "23505",
        },
        data: null,
      }),
    });

    const result = await saveRound(makeRound(), verification);

    expect(result).toEqual({
      success: false,
      code: "DUPLICATE_ROUND",
      message: "This round was already saved.",
    });
    expect(mockCaptureMonitoringException).not.toHaveBeenCalled();
  });

  it("retries without trust metadata when production schema is behind app code", async () => {
    mockInsert
      .mockReturnValueOnce({
        select: vi.fn().mockResolvedValue({
          error: {
            message:
              "Could not find the 'trust_reasons' column of 'rounds' in the schema cache",
            code: "PGRST204",
          },
          data: null,
        }),
      })
      .mockReturnValueOnce({
        select: vi.fn().mockResolvedValue({ error: null, data: [{ id: "test-round-id" }] }),
      });

    const result = await saveRound(makeRound(), verification);

    expect(result).toEqual({
      success: true,
      roundId: "test-round-id",
      claimToken: FAKE_CLAIM_TOKEN,
      isOwned: false,
    });
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
    mockInsert.mockReturnValue({
      select: vi.fn().mockRejectedValue(new Error("Network failure")),
    });

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

  it("persists full hardening through the V3 save path when enabled", async () => {
    vi.stubEnv("SG_PHASE2_MODE", "full");

    const v1Spy = vi
      .spyOn(strokesGainedModule, "calculateStrokesGained")
      .mockReturnValue(
        makeSGResult({
          methodologyVersion: "2.1.0",
          diagnostics: { threePuttImpact: 0.3 },
        })
      );
    const v3Spy = vi
      .spyOn(strokesGainedV3Module, "calculateStrokesGainedV3")
      .mockReturnValue(
        makeSGResult({
          methodologyVersion: "3.3.0",
          calibrationVersion: "seed-1.1.0",
          categories: {
            "off-the-tee": 0.3,
            approach: -0.8,
            "around-the-green": -0.5,
            putting: -0.2,
          },
          total: -1.2,
          diagnostics: { threePuttImpact: 0.3 },
        })
      );

    await saveRound(makeRound({ threePutts: 4 }), verification);

    expect(v1Spy).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
    );
    expect(v3Spy).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
    );
    expect(mockInsert.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        sg_putting: -0.2,
        methodology_version: "3.3.0",
        calibration_version: "seed-1.1.0",
      })
    );
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
      onePutts: "" as unknown as number,
      threePutts: "" as unknown as number,
    } as RoundInput;

    await saveRound(rawInput, verification);

    const insertedRow = mockInsert.mock.calls[0][0];
    expect(typeof insertedRow.score).toBe("number");
    expect(insertedRow.score).toBe(87);
    expect(typeof insertedRow.handicap_index).toBe("number");
    expect(insertedRow.handicap_index).toBe(14.3);
    expect(insertedRow.one_putts).toBeNull();
    expect(insertedRow.three_putts).toBeNull();
  });

  it("returns fake success with UUID roundId when honeypot field is filled", async () => {
    const result = await saveRound(makeRound(), { honeypot: "gotcha" });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.roundId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
      expect(result.claimToken).toBe("");
      expect(result.isOwned).toBe(false);
    }
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("proceeds normally when honeypot is empty", async () => {
    const result = await saveRound(makeRound(), { honeypot: "" });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.roundId).toBe("test-round-id");
    }
    expect(mockInsert).toHaveBeenCalled();
  });

  it("proceeds normally when honeypot is undefined", async () => {
    const result = await saveRound(makeRound(), {});

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.roundId).toBe("test-round-id");
    }
    expect(mockInsert).toHaveBeenCalled();
  });

  it("still returns success if claim token generation fails (best-effort)", async () => {
    mockGenerateClaimToken.mockRejectedValue(new Error("Crypto unavailable"));

    const result = await saveRound(makeRound(), verification);

    expect(result).toEqual({
      success: true,
      roundId: "test-round-id",
      claimToken: "",
      isOwned: false,
    });
  });

  it("retries without one_putts when production schema is behind app code", async () => {
    mockInsert
      .mockReturnValueOnce({
        select: vi.fn().mockResolvedValue({
          error: {
            message:
              "Could not find the 'one_putts' column of 'rounds' in the schema cache",
            code: "PGRST204",
          },
          data: null,
        }),
      })
      .mockReturnValueOnce({
        select: vi.fn().mockResolvedValue({ error: null, data: [{ id: "test-round-id" }] }),
      });

    const result = await saveRound(makeRound({ onePutts: 5 }), verification);

    expect(result).toEqual({
      success: true,
      roundId: "test-round-id",
      claimToken: FAKE_CLAIM_TOKEN,
      isOwned: false,
    });
    expect(mockInsert).toHaveBeenCalledTimes(2);
    // First attempt includes one_putts
    expect(mockInsert.mock.calls[0][0]).toEqual(
      expect.objectContaining({ one_putts: 5 })
    );
    // Retry should NOT include one_putts
    expect(mockInsert.mock.calls[1][0]).toEqual(
      expect.not.objectContaining({ one_putts: expect.anything() })
    );
  });

  it("sets user_id when authenticated user saves a round", async () => {
    mockGetUser.mockResolvedValue({ id: "user-123" });

    const result = await saveRound(makeRound(), verification);

    expect(result).toEqual({
      success: true,
      roundId: "test-round-id",
      claimToken: "",
      isOwned: true,
    });
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: "user-123" })
    );
    expect(mockGenerateClaimToken).not.toHaveBeenCalled();
  });

  it("revalidates history routes after an authenticated save succeeds", async () => {
    mockGetUser.mockResolvedValue({ id: "user-123" });

    await saveRound(makeRound(), verification);

    expect(mockRevalidatePath).toHaveBeenNthCalledWith(
      1,
      "/strokes-gained/rounds/test-round-id"
    );
    expect(mockRevalidatePath).toHaveBeenNthCalledWith(
      2,
      "/strokes-gained/history"
    );
    expect(mockRevalidatePath).toHaveBeenNthCalledWith(
      3,
      "/strokes-gained/lesson-prep"
    );
  });

  it("updates the existing owned round on duplicate save for authenticated user", async () => {
    mockGetUser.mockResolvedValue({ id: "user-456" });

    mockInsert.mockReturnValue({
      select: vi.fn().mockResolvedValue({
        error: {
          message: 'duplicate key value violates unique constraint "rounds_dedup_idx"',
          code: "23505",
        },
        data: null,
      }),
    });

    const existingLookupChain = {
      eq: vi.fn(),
      single: vi.fn().mockResolvedValue({
        data: { id: "existing-round-id", user_id: "user-456" },
        error: null,
      }),
    };
    existingLookupChain.eq.mockReturnValue(existingLookupChain);

    const mockUpdateSelect = vi.fn().mockResolvedValue({
      data: [{ id: "existing-round-id" }],
      error: null,
    });
    const mockUpdateEqUser = vi.fn().mockReturnValue({ select: mockUpdateSelect });
    const mockUpdateEqId = vi.fn().mockReturnValue({ eq: mockUpdateEqUser });
    const mockOwnedUpdate = vi.fn().mockReturnValue({ eq: mockUpdateEqId });

    mockCreateAdminClient.mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === "rounds") {
          return {
            insert: mockInsert,
            update: mockOwnedUpdate,
            select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue(existingLookupChain) }),
          };
        }
        return { insert: vi.fn().mockResolvedValue({ error: null }) };
      }),
    });

    const result = await saveRound(
      makeRound({ fairwaysHit: 10, greensInRegulation: 8 }),
      verification
    );

    expect(result).toEqual({
      success: true,
      roundId: "existing-round-id",
      claimToken: "",
      isOwned: true,
    });
    expect(mockOwnedUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "user-456",
        fairways_hit: 10,
        greens_in_regulation: 8,
      })
    );
    expect(mockRevalidatePath).toHaveBeenCalledWith(
      "/strokes-gained/rounds/existing-round-id"
    );
    expect(mockRevalidatePath).toHaveBeenCalledWith("/strokes-gained/history");
  });

  it("claims existing anonymous round on duplicate for authenticated user", async () => {
    mockGetUser.mockResolvedValue({ id: "user-456" });

    // Insert fails with duplicate
    mockInsert.mockReturnValue({
      select: vi.fn().mockResolvedValue({
        error: {
          message: 'duplicate key value violates unique constraint "rounds_dedup_idx"',
          code: "23505",
        },
        data: null,
      }),
    });

    // Build a chainable mock that supports .select().eq().eq().eq().eq().eq().single()
    // and .update().eq().is().select()
    const mockClaimUpdate = vi.fn();
    const eqChain = {
      eq: vi.fn(),
      single: vi.fn().mockResolvedValue({
        data: { id: "existing-round-id", user_id: null },
        error: null,
      }),
    };
    // Each .eq() returns the same chainable object
    eqChain.eq.mockReturnValue(eqChain);

    const mockClaimSelect = vi.fn().mockResolvedValue({ data: [{ id: "existing-round-id" }], error: null });
    const mockClaimIs = vi.fn().mockReturnValue({ select: mockClaimSelect });
    const mockClaimEq = vi.fn().mockReturnValue({ is: mockClaimIs });
    mockClaimUpdate.mockReturnValue({ eq: mockClaimEq });

    mockCreateAdminClient.mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === "rounds") {
          return {
            insert: mockInsert,
            update: mockClaimUpdate,
            select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue(eqChain) }),
          };
        }
        return { insert: vi.fn().mockResolvedValue({ error: null }) };
      }),
    });

    const result = await saveRound(makeRound(), verification);

    expect(result).toEqual({
      success: true,
      roundId: "existing-round-id",
      claimToken: "",
      isOwned: true,
    });
    expect(mockClaimUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: "user-456" })
    );
    expect(mockRevalidatePath).toHaveBeenCalledWith(
      "/strokes-gained/rounds/existing-round-id"
    );
  });
});
