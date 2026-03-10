import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockCreateClient, mockFrom } = vi.hoisted(() => {
  const mockSingle = vi.fn();
  const mockEq = vi.fn(() => ({ single: mockSingle }));
  const mockSelect = vi.fn(() => ({ eq: mockEq }));
  const mockFrom = vi.fn(() => ({ select: mockSelect }));
  const mockCreateClient = vi.fn(async () => ({ from: mockFrom }));

  return { mockCreateClient, mockFrom, mockSingle, mockEq, mockSelect };
});

vi.mock("@/lib/supabase/server", () => ({
  createClient: mockCreateClient,
}));

import {
  PremiumRequiredError,
  deriveEntitlements,
  getViewerEntitlements,
  requirePremium,
} from "@/lib/billing/entitlements";

describe("deriveEntitlements", () => {
  it("treats active premium as able to generate and view reports", () => {
    const result = deriveEntitlements({
      premium_status: "premium",
      premium_expires_at: "2026-03-20T00:00:00.000Z",
    }, new Date("2026-03-10T00:00:00.000Z"));

    expect(result.status).toBe("premium");
    expect(result.canGenerateLessonReports).toBe(true);
    expect(result.canViewExistingLessonReports).toBe(true);
    expect(result.inGracePeriod).toBe(false);
  });

  it("treats grace period as view-only for existing reports", () => {
    const result = deriveEntitlements({
      premium_status: "grace_period",
      premium_expires_at: "2026-03-08T00:00:00.000Z",
    }, new Date("2026-03-10T00:00:00.000Z"));

    expect(result.status).toBe("grace_period");
    expect(result.canGenerateLessonReports).toBe(false);
    expect(result.canViewExistingLessonReports).toBe(true);
    expect(result.inGracePeriod).toBe(true);
  });

  it("drops expired grace-period users back to free access", () => {
    const result = deriveEntitlements({
      premium_status: "grace_period",
      premium_expires_at: "2026-03-01T00:00:00.000Z",
    }, new Date("2026-03-10T00:00:00.000Z"));

    expect(result.status).toBe("free");
    expect(result.canGenerateLessonReports).toBe(false);
    expect(result.canViewExistingLessonReports).toBe(false);
    expect(result.inGracePeriod).toBe(false);
  });

  it("treats lifetime access as always premium", () => {
    const result = deriveEntitlements({
      premium_status: "lifetime",
      premium_expires_at: null,
    }, new Date("2026-03-10T00:00:00.000Z"));

    expect(result.status).toBe("lifetime");
    expect(result.canGenerateLessonReports).toBe(true);
    expect(result.canViewExistingLessonReports).toBe(true);
  });
});

describe("getViewerEntitlements", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns free defaults when no profile row exists", async () => {
    const single = vi.fn().mockResolvedValue({
      data: null,
      error: { code: "PGRST116", message: "Row not found" },
    });
    const eq = vi.fn(() => ({ single }));
    const select = vi.fn(() => ({ eq }));
    mockFrom.mockReturnValue({ select });

    const result = await getViewerEntitlements("user-1");

    expect(result.status).toBe("free");
    expect(result.canGenerateLessonReports).toBe(false);
  });

  it("loads and derives entitlements from the profile row", async () => {
    const single = vi.fn().mockResolvedValue({
      data: {
        premium_status: "premium",
        premium_expires_at: "2026-03-20T00:00:00.000Z",
      },
      error: null,
    });
    const eq = vi.fn(() => ({ single }));
    const select = vi.fn(() => ({ eq }));
    mockFrom.mockReturnValue({ select });

    const result = await getViewerEntitlements("user-1", {
      now: new Date("2026-03-10T00:00:00.000Z"),
    });

    expect(result.status).toBe("premium");
    expect(result.canGenerateLessonReports).toBe(true);
  });
});

describe("requirePremium", () => {
  it("throws PremiumRequiredError when report generation is unavailable", () => {
    expect(() =>
      requirePremium(
        {
          status: "free",
          canGenerateLessonReports: false,
          canViewExistingLessonReports: false,
          expiresAt: null,
          inGracePeriod: false,
        },
        "lesson_report_generation"
      )
    ).toThrow(PremiumRequiredError);
  });

  it("returns entitlements when premium access is allowed", () => {
    const entitlements = {
      status: "premium" as const,
      canGenerateLessonReports: true,
      canViewExistingLessonReports: true,
      expiresAt: "2026-03-20T00:00:00.000Z",
      inGracePeriod: false,
    };

    expect(
      requirePremium(entitlements, "lesson_report_generation")
    ).toEqual(entitlements);
  });
});
