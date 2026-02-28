// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const { mockVercelTrack } = vi.hoisted(() => ({
  mockVercelTrack: vi.fn(),
}));

vi.mock("@vercel/analytics", () => ({
  track: mockVercelTrack,
}));

import { trackEvent } from "@/lib/analytics/client";

describe("trackEvent", () => {
  beforeEach(() => {
    mockVercelTrack.mockClear();
    // Clean up gtag between tests
    delete (window as unknown as Record<string, unknown>).gtag;
    // Set GA4 measurement ID
    vi.stubEnv("NEXT_PUBLIC_GA4_MEASUREMENT_ID", "G-TEST123");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  // --- Vercel Analytics sink ---

  it("calls Vercel track() with event name", () => {
    trackEvent("landing_cta_clicked");
    expect(mockVercelTrack).toHaveBeenCalledWith("landing_cta_clicked", undefined);
  });

  it("calls Vercel track() with event name and props", () => {
    trackEvent("calculation_completed", {
      benchmark_bracket: "10-15",
      total_sg: -1.5,
      score: 87,
    });
    expect(mockVercelTrack).toHaveBeenCalledWith("calculation_completed", {
      benchmark_bracket: "10-15",
      total_sg: -1.5,
      score: 87,
    });
  });

  // --- GA4 sink ---

  it("calls window.gtag when GA4 ID and gtag exist", () => {
    const mockGtag = vi.fn();
    (window as unknown as Record<string, unknown>).gtag = mockGtag;

    trackEvent("download_png_clicked", { has_share_param: true });

    expect(mockGtag).toHaveBeenCalledWith("event", "download_png_clicked", {
      has_share_param: true,
      page_location: expect.stringMatching(/^https?:\/\//),
    });
  });

  it("strips query string from page_location sent to GA4", () => {
    const mockGtag = vi.fn();
    (window as unknown as Record<string, unknown>).gtag = mockGtag;

    // Simulate a URL with ?d= query param (shared round data)
    Object.defineProperty(window, "location", {
      value: {
        origin: "https://golfdataviz.com",
        pathname: "/strokes-gained",
        search: "?d=encodedRoundData",
        href: "https://golfdataviz.com/strokes-gained?d=encodedRoundData",
      },
      writable: true,
      configurable: true,
    });

    trackEvent("copy_link_clicked", { has_share_param: true });

    const gtagCall = mockGtag.mock.calls[0];
    expect(gtagCall[2].page_location).toBe(
      "https://golfdataviz.com/strokes-gained"
    );
    expect(gtagCall[2].page_location).not.toContain("?d=");
  });

  it("does not throw when gtag is missing", () => {
    expect(() => trackEvent("form_started")).not.toThrow();
  });

  it("does not throw when GA4 measurement ID is missing", () => {
    vi.stubEnv("NEXT_PUBLIC_GA4_MEASUREMENT_ID", "");
    const mockGtag = vi.fn();
    (window as unknown as Record<string, unknown>).gtag = mockGtag;

    expect(() => trackEvent("copy_link_clicked", { has_share_param: false })).not.toThrow();
    // Should not call gtag when ID is missing
    expect(mockGtag).not.toHaveBeenCalled();
  });

  // --- No-throw guarantees ---

  it("does not throw when Vercel track throws", () => {
    mockVercelTrack.mockImplementation(() => {
      throw new Error("Vercel error");
    });
    expect(() => trackEvent("landing_cta_clicked")).not.toThrow();
  });

  it("does not throw when gtag throws", () => {
    vi.stubEnv("NEXT_PUBLIC_GA4_MEASUREMENT_ID", "G-TEST123");
    (window as unknown as Record<string, unknown>).gtag = () => {
      throw new Error("gtag error");
    };
    expect(() => trackEvent("form_started")).not.toThrow();
  });
});
