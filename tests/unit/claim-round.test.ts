import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const {
  mockGetUser,
  mockCreateAdminClient,
  mockHashClaimToken,
} = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockCreateAdminClient: vi.fn(),
  mockHashClaimToken: vi.fn(),
}));

vi.mock("@/lib/supabase/auth", () => ({
  getUser: mockGetUser,
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: mockCreateAdminClient,
}));

vi.mock("@/lib/security/claim-token", () => ({
  generateClaimToken: vi.fn(),
  hashClaimToken: mockHashClaimToken,
}));

// Mock all dependencies that saveRound imports (required because claimRound
// lives in the same "use server" file)
vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: vi.fn().mockResolvedValue({ allowed: true }),
  extractClientIp: vi.fn(() => "1.2.3.4"),
}));
vi.mock("@/lib/monitoring/sentry", () => ({
  captureMonitoringException: vi.fn(),
}));
vi.mock("@/lib/security/turnstile", () => ({
  verifyTurnstileToken: vi.fn().mockResolvedValue({ ok: true, result: { success: true, errorCodes: [] } }),
}));
vi.mock("next/headers", () => ({
  headers: vi.fn(async () => ({
    get: (key: string) => {
      const map: Record<string, string> = {
        "x-forwarded-for": "1.2.3.4",
        host: "golfdataviz.com",
      };
      return map[key] ?? null;
    },
  })),
}));
vi.mock("@/lib/golf/round-mapper", () => ({
  toRoundInsert: vi.fn(() => ({})),
}));
vi.mock("@/lib/golf/schemas", () => ({
  roundInputSchema: { safeParse: vi.fn(() => ({ success: true, data: {} })) },
}));
vi.mock("@/lib/golf/benchmarks", () => ({
  getInterpolatedBenchmark: vi.fn(() => ({})),
}));
vi.mock("@/lib/golf/strokes-gained", () => ({
  calculateStrokesGained: vi.fn(() => ({ total: 0, categories: {} })),
}));
vi.mock("@/lib/golf/strokes-gained-v3", () => ({
  calculateStrokesGainedV3: vi.fn(() => ({ total: 0, categories: {} })),
}));
vi.mock("@/lib/golf/phase2-mode", () => ({
  getSgPhase2Mode: vi.fn(() => "off"),
}));
vi.mock("@/lib/golf/round-trust", () => ({
  assessRoundTrust: vi.fn(() => ({ status: "pending", reasons: [] })),
}));
vi.mock("@/lib/round-save", () => ({
  getRoundSaveAvailability: vi.fn(() => ({ enabled: true })),
}));
vi.mock("@/lib/golf/trouble-context", () => ({
  validateTroubleContext: vi.fn(),
  buildTroubleContextSummary: vi.fn(),
}));

import { claimRound } from "@/app/(tools)/strokes-gained/actions";

const VALID_ROUND_ID = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";
const VALID_CLAIM_TOKEN = "abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890";
const HASHED_TOKEN = "hashedtokenvalue1234567890abcdef1234567890abcdef1234567890abcdef";
const FAKE_USER_ID = "user0abc-1234-5678-9def-user00000000";

function makeFakeUser(id = FAKE_USER_ID) {
  return {
    id,
    email: "golfer@example.com",
    app_metadata: {},
    user_metadata: {},
    aud: "authenticated",
    created_at: "2026-01-01T00:00:00Z",
  };
}

// Build Supabase mock query builder
let selectData: { data: unknown[] | null; error: unknown | null };
let updateFn: ReturnType<typeof vi.fn>;

function setupAdminMock() {
  // The atomic update chain: update().eq("id").is("user_id", null).eq("claim_token_hash").select("id")
  const mockUpdateSelect = vi.fn().mockResolvedValue({ data: [{ id: VALID_ROUND_ID }], error: null });
  const mockUpdateEqHash = vi.fn().mockReturnValue({ select: mockUpdateSelect });
  const mockUpdateIs = vi.fn().mockReturnValue({ eq: mockUpdateEqHash });
  const mockUpdateEqId = vi.fn().mockReturnValue({ is: mockUpdateIs });
  updateFn = vi.fn().mockReturnValue({ eq: mockUpdateEqId });

  mockCreateAdminClient.mockReturnValue({
    from: vi.fn(() => ({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue(selectData),
      }),
      update: updateFn,
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue({ error: null, data: [{ id: "test-id" }] }),
      }),
    })),
  });
}

describe("claimRound server action", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockHashClaimToken.mockResolvedValue(HASHED_TOKEN);

    selectData = {
      data: [
        {
          id: VALID_ROUND_ID,
          user_id: null,
          claim_token_hash: HASHED_TOKEN,
          claim_token_expires_at: new Date(
            Date.now() + 7 * 24 * 60 * 60 * 1000
          ).toISOString(),
        },
      ],
      error: null,
    };

    setupAdminMock();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("fails with 'unauthenticated' when no user session exists", async () => {
    mockGetUser.mockResolvedValue(null);

    const result = await claimRound(VALID_ROUND_ID, VALID_CLAIM_TOKEN);

    expect(result).toEqual({
      success: false,
      code: "unauthenticated",
      message: expect.stringContaining("sign in"),
    });
  });

  it("fails with 'round_not_found' when roundId format is invalid", async () => {
    mockGetUser.mockResolvedValue(makeFakeUser());

    const result = await claimRound("not-a-uuid", VALID_CLAIM_TOKEN);

    expect(result).toEqual({
      success: false,
      code: "round_not_found",
      message: expect.any(String),
    });
  });

  it("fails with 'round_not_found' when round does not exist in DB", async () => {
    mockGetUser.mockResolvedValue(makeFakeUser());
    selectData = { data: [], error: null };
    setupAdminMock();

    const result = await claimRound(VALID_ROUND_ID, VALID_CLAIM_TOKEN);

    expect(result).toEqual({
      success: false,
      code: "round_not_found",
      message: expect.any(String),
    });
  });

  it("fails with 'already_claimed' when round has a user_id", async () => {
    mockGetUser.mockResolvedValue(makeFakeUser());
    selectData = {
      data: [
        {
          id: VALID_ROUND_ID,
          user_id: "other-user-id",
          claim_token_hash: HASHED_TOKEN,
          claim_token_expires_at: new Date(
            Date.now() + 7 * 24 * 60 * 60 * 1000
          ).toISOString(),
        },
      ],
      error: null,
    };
    setupAdminMock();

    const result = await claimRound(VALID_ROUND_ID, VALID_CLAIM_TOKEN);

    expect(result).toEqual({
      success: false,
      code: "already_claimed",
      message: expect.any(String),
    });
  });

  it("fails with 'token_expired' when claim_token_expires_at is in the past", async () => {
    mockGetUser.mockResolvedValue(makeFakeUser());
    selectData = {
      data: [
        {
          id: VALID_ROUND_ID,
          user_id: null,
          claim_token_hash: HASHED_TOKEN,
          claim_token_expires_at: new Date(Date.now() - 1000).toISOString(),
        },
      ],
      error: null,
    };
    setupAdminMock();

    const result = await claimRound(VALID_ROUND_ID, VALID_CLAIM_TOKEN);

    expect(result).toEqual({
      success: false,
      code: "token_expired",
      message: expect.any(String),
    });
  });

  it("fails with 'token_mismatch' when claim token hash does not match", async () => {
    mockGetUser.mockResolvedValue(makeFakeUser());
    mockHashClaimToken.mockResolvedValue("wrong_hash_value_that_does_not_match_the_stored_hash_at_all_64ch");

    const result = await claimRound(VALID_ROUND_ID, VALID_CLAIM_TOKEN);

    expect(result).toEqual({
      success: false,
      code: "token_mismatch",
      message: expect.any(String),
    });
  });

  it("succeeds with valid auth + valid token", async () => {
    mockGetUser.mockResolvedValue(makeFakeUser());

    const result = await claimRound(VALID_ROUND_ID, VALID_CLAIM_TOKEN);

    expect(result).toEqual({
      success: true,
      claimedRoundId: VALID_ROUND_ID,
    });
  });

  it("sets user_id and clears claim token fields on success", async () => {
    mockGetUser.mockResolvedValue(makeFakeUser());

    await claimRound(VALID_ROUND_ID, VALID_CLAIM_TOKEN);

    expect(updateFn).toHaveBeenCalledWith({
      user_id: FAKE_USER_ID,
      claim_token_hash: null,
      claim_token_expires_at: null,
    });
  });

  it("hashes the provided claim token before comparison", async () => {
    mockGetUser.mockResolvedValue(makeFakeUser());

    await claimRound(VALID_ROUND_ID, VALID_CLAIM_TOKEN);

    expect(mockHashClaimToken).toHaveBeenCalledWith(VALID_CLAIM_TOKEN);
  });
});
