// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

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
