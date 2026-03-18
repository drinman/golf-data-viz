// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { AnalyticsEventProps, AnalyticsEvent } from "@/lib/analytics/events";

// --- Type-level tests: enriched calculation_completed payload ---

describe("calculation_completed enriched payload type", () => {
  it("accepts all enriched fields", () => {
    const payload: AnalyticsEventProps["calculation_completed"] = {
      utm_source: "reddit",
      handicap_bracket: "10-15",
      has_course_rating: true,
      total_sg: -1.5,
      methodology_version: "3.0.0",
    };
    expect(payload.handicap_bracket).toBe("10-15");
    expect(payload.has_course_rating).toBe(true);
    expect(payload.total_sg).toBe(-1.5);
    expect(payload.methodology_version).toBe("3.0.0");
  });

  it("requires enriched fields (utm_source remains optional)", () => {
    const payload: AnalyticsEventProps["calculation_completed"] = {
      handicap_bracket: "15-20",
      has_course_rating: false,
      total_sg: 2.3,
      methodology_version: "3.0.0",
    };
    expect(payload.utm_source).toBeUndefined();
  });
});

// --- Type-level tests: 8 placeholder v2 events ---

describe("placeholder v2 event types", () => {
  it("all 8 placeholder events exist in the AnalyticsEvent union", () => {
    // TypeScript compile-time check: these would fail if any event name
    // were missing from the AnalyticsEvent union or AnalyticsEventProps.
    const events: AnalyticsEvent[] = [
      "download_receipt_clicked",
      "shared_round_cta_clicked",
      "recipient_started_own_calc",
      "recipient_completed_own_calc",
      "probability_calculated",
      "widget_cta_clicked",
      "referral_tier_unlocked",
      "pwa_installed",
    ];
    expect(events).toHaveLength(8);

    // Verify each has EmptyPayload (accepts empty object)
    const p1: AnalyticsEventProps["download_receipt_clicked"] = {};
    const p2: AnalyticsEventProps["shared_round_cta_clicked"] = {};
    const p3: AnalyticsEventProps["recipient_started_own_calc"] = {};
    const p4: AnalyticsEventProps["recipient_completed_own_calc"] = {};
    const p5: AnalyticsEventProps["probability_calculated"] = {};
    const p6: AnalyticsEventProps["widget_cta_clicked"] = {};
    const p7: AnalyticsEventProps["referral_tier_unlocked"] = {};
    const p8: AnalyticsEventProps["pwa_installed"] = {};
    expect([p1, p2, p3, p4, p5, p6, p7, p8]).toHaveLength(8);
  });
});

// --- Dual-sink: enriched payload passes through to GA4 ---

const { mockVercelTrack } = vi.hoisted(() => ({
  mockVercelTrack: vi.fn(),
}));

vi.mock("@vercel/analytics", () => ({
  track: mockVercelTrack,
}));

import { trackEvent } from "@/lib/analytics/client";

describe("enriched calculation_completed dual-sink passthrough", () => {
  beforeEach(() => {
    mockVercelTrack.mockClear();
    delete (window as unknown as Record<string, unknown>).gtag;
    vi.stubEnv("NEXT_PUBLIC_GA4_MEASUREMENT_ID", "G-TEST123");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("sends all enriched fields to GA4 gtag", () => {
    const mockGtag = vi.fn();
    (window as unknown as Record<string, unknown>).gtag = mockGtag;

    trackEvent("calculation_completed", {
      utm_source: "reddit",
      handicap_bracket: "10-15",
      has_course_rating: true,
      total_sg: -1.5,
      methodology_version: "3.0.0",
    });

    expect(mockGtag).toHaveBeenCalledWith("event", "calculation_completed", {
      utm_source: "reddit",
      handicap_bracket: "10-15",
      has_course_rating: true,
      total_sg: -1.5,
      methodology_version: "3.0.0",
      page_location: expect.stringMatching(/^https?:\/\//),
    });
  });

  it("sends all enriched fields to Vercel Analytics", () => {
    trackEvent("calculation_completed", {
      utm_source: "reddit",
      handicap_bracket: "10-15",
      has_course_rating: true,
      total_sg: -1.5,
      methodology_version: "3.0.0",
    });

    expect(mockVercelTrack).toHaveBeenCalledWith("calculation_completed", {
      utm_source: "reddit",
      handicap_bracket: "10-15",
      has_course_rating: true,
      total_sg: -1.5,
      methodology_version: "3.0.0",
    });
  });
});
