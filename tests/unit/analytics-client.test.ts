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
    trackEvent("form_started");
    expect(mockVercelTrack).toHaveBeenCalledWith("form_started");
  });

  it("calls Vercel track() with event name and optional utm props", () => {
    trackEvent("landing_cta_clicked", { utm_source: "reddit" });
    expect(mockVercelTrack).toHaveBeenCalledWith("landing_cta_clicked", {
      utm_source: "reddit",
    });
  });

  // --- GA4 sink ---

  it("calls window.gtag when GA4 ID and gtag exist", () => {
    const mockGtag = vi.fn();
    (window as unknown as Record<string, unknown>).gtag = mockGtag;

    trackEvent("download_png_clicked", {
      has_share_param: true,
      utm_source: "reddit",
    });

    expect(mockGtag).toHaveBeenCalledWith("event", "download_png_clicked", {
      has_share_param: true,
      utm_source: "reddit",
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

  // --- Narrative events (renamed for clarity) ---

  it("tracks narrative_fetch_started with trust_mode", () => {
    trackEvent("narrative_fetch_started", { trust_mode: "caveated" });
    expect(mockVercelTrack).toHaveBeenCalledWith("narrative_fetch_started", {
      trust_mode: "caveated",
    });
  });

  it("tracks narrative_fetch_completed with trust_mode and payload", () => {
    trackEvent("narrative_fetch_completed", { trust_mode: "assertive", latency_ms: 2500, word_count: 85 });
    expect(mockVercelTrack).toHaveBeenCalledWith("narrative_fetch_completed", {
      trust_mode: "assertive",
      latency_ms: 2500,
      word_count: 85,
    });
  });

  it("tracks narrative_fetch_failed with trust_mode and error type", () => {
    trackEvent("narrative_fetch_failed", { trust_mode: "caveated", error_type: "rate_limited", retry_count: 0 });
    expect(mockVercelTrack).toHaveBeenCalledWith("narrative_fetch_failed", {
      trust_mode: "caveated",
      error_type: "rate_limited",
      retry_count: 0,
    });
  });

  it("tracks narrative_rendered with trust_mode and source", () => {
    trackEvent("narrative_rendered", { trust_mode: "caveated", source: "fetch" });
    expect(mockVercelTrack).toHaveBeenCalledWith("narrative_rendered", {
      trust_mode: "caveated",
      source: "fetch",
    });
  });

  it("tracks narrative_rendered with cache source", () => {
    trackEvent("narrative_rendered", { trust_mode: "assertive", source: "cache" });
    expect(mockVercelTrack).toHaveBeenCalledWith("narrative_rendered", {
      trust_mode: "assertive",
      source: "cache",
    });
  });

  it("tracks narrative_copied with trust_mode", () => {
    trackEvent("narrative_copied", { word_count: 95, surface: "results_page", trust_mode: "caveated" });
    expect(mockVercelTrack).toHaveBeenCalledWith("narrative_copied", {
      word_count: 95,
      surface: "results_page",
      trust_mode: "caveated",
    });
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
