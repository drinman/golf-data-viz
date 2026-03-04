// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";

// Mock next/navigation
const { mockUsePathname } = vi.hoisted(() => ({
  mockUsePathname: vi.fn(() => "/strokes-gained"),
}));

vi.mock("next/navigation", () => ({
  usePathname: mockUsePathname,
}));

import { GA4PageView } from "@/lib/analytics/ga4-pageview";

describe("GA4PageView component", () => {
  let mockGtag: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubEnv("NEXT_PUBLIC_GA4_MEASUREMENT_ID", "G-TEST123");
    mockGtag = vi.fn();
    (window as unknown as Record<string, unknown>).gtag = mockGtag;
    mockUsePathname.mockReturnValue("/strokes-gained");
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.unstubAllEnvs();
    delete (window as unknown as Record<string, unknown>).gtag;
  });

  it("fires page_view on mount with page_location = origin + pathname (no query string)", () => {
    render(<GA4PageView />);

    expect(mockGtag).toHaveBeenCalledWith("event", "page_view", {
      page_location: expect.stringContaining("/strokes-gained"),
      page_path: "/strokes-gained",
    });

    // Verify no query string in page_location
    const call = mockGtag.mock.calls[0];
    expect(call[2].page_location).not.toContain("?");
  });

  it("re-fires when pathname changes", () => {
    const { rerender } = render(<GA4PageView />);
    expect(mockGtag).toHaveBeenCalledTimes(1);

    mockUsePathname.mockReturnValue("/about");
    rerender(<GA4PageView />);

    expect(mockGtag).toHaveBeenCalledTimes(2);
    expect(mockGtag).toHaveBeenLastCalledWith("event", "page_view", {
      page_location: expect.stringContaining("/about"),
      page_path: "/about",
    });
  });

  it("page_location never contains ?d= even when present in window.location", () => {
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

    render(<GA4PageView />);

    const call = mockGtag.mock.calls[0];
    expect(call[2].page_location).not.toContain("?d=");
    expect(call[2].page_location).toBe(
      "https://golfdataviz.com/strokes-gained"
    );
  });

  it("no-ops gracefully when window.gtag is undefined and times out", () => {
    delete (window as unknown as Record<string, unknown>).gtag;

    expect(() => render(<GA4PageView />)).not.toThrow();

    // Advance past the 5s timeout — should not throw
    vi.advanceTimersByTime(6000);
  });

  it("fires page_view after gtag loads late (delayed script scenario)", () => {
    // Start with no gtag — simulates afterInteractive script not yet loaded
    delete (window as unknown as Record<string, unknown>).gtag;

    render(<GA4PageView />);

    // No call yet — gtag doesn't exist
    expect(mockGtag).not.toHaveBeenCalled();

    // Simulate gtag becoming available after 300ms (script loaded)
    vi.advanceTimersByTime(200);
    expect(mockGtag).not.toHaveBeenCalled();

    (window as unknown as Record<string, unknown>).gtag = mockGtag;
    vi.advanceTimersByTime(100);

    expect(mockGtag).toHaveBeenCalledTimes(1);
    expect(mockGtag).toHaveBeenCalledWith("event", "page_view", {
      page_location: expect.stringContaining("/strokes-gained"),
      page_path: "/strokes-gained",
    });
  });

  it("stops polling after timeout when gtag never appears", () => {
    delete (window as unknown as Record<string, unknown>).gtag;

    render(<GA4PageView />);

    // Advance past the 5s max wait
    vi.advanceTimersByTime(6000);

    // Now add gtag — should NOT fire since polling has stopped
    (window as unknown as Record<string, unknown>).gtag = mockGtag;
    vi.advanceTimersByTime(200);

    expect(mockGtag).not.toHaveBeenCalled();
  });

  it("does not re-poll on subsequent route changes after initial timeout (ad-blocker)", () => {
    delete (window as unknown as Record<string, unknown>).gtag;

    const { rerender } = render(<GA4PageView />);

    // First route: poll times out after 5s
    vi.advanceTimersByTime(6000);
    expect(mockGtag).not.toHaveBeenCalled();

    // Navigate to a new page — should skip polling entirely
    mockUsePathname.mockReturnValue("/methodology");
    rerender(<GA4PageView />);

    // Even after waiting the full timeout again, no polling occurred
    vi.advanceTimersByTime(6000);
    expect(mockGtag).not.toHaveBeenCalled();
  });

  it("fires page_view on next route change when gtag appears after initial timeout (slow network)", () => {
    delete (window as unknown as Record<string, unknown>).gtag;

    const { rerender } = render(<GA4PageView />);

    // First route: poll times out after 5s — gtag still missing
    vi.advanceTimersByTime(6000);
    expect(mockGtag).not.toHaveBeenCalled();

    // gtag finally loads (slow network, not blocked)
    (window as unknown as Record<string, unknown>).gtag = mockGtag;

    // Navigate to a new page — should detect gtag and fire immediately
    mockUsePathname.mockReturnValue("/methodology");
    rerender(<GA4PageView />);

    expect(mockGtag).toHaveBeenCalledTimes(1);
    expect(mockGtag).toHaveBeenCalledWith("event", "page_view", {
      page_location: expect.stringContaining("/methodology"),
      page_path: "/methodology",
    });
  });

  it("skips polling entirely when GA4 measurement ID is not configured", () => {
    vi.stubEnv("NEXT_PUBLIC_GA4_MEASUREMENT_ID", "");
    delete (window as unknown as Record<string, unknown>).gtag;

    render(<GA4PageView />);

    // Simulate gtag appearing (e.g. injected by another script)
    (window as unknown as Record<string, unknown>).gtag = mockGtag;
    vi.advanceTimersByTime(6000);

    // Should never have been called — no polling started
    expect(mockGtag).not.toHaveBeenCalled();
  });
});
