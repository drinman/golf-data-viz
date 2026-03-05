// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";

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
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    vi.unstubAllEnvs();
    delete (window as unknown as Record<string, unknown>).gtag;
  });

  it("fires page_view on mount with origin + pathname and no query string", () => {
    render(<GA4PageView />);

    expect(mockGtag).toHaveBeenCalledWith("event", "page_view", {
      page_location: expect.stringContaining("/strokes-gained"),
      page_path: "/strokes-gained",
    });

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

  it("never includes the shared ?d= param in page_location", () => {
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
    expect(call[2].page_location).toBe(
      "https://golfdataviz.com/strokes-gained"
    );
  });

  it("retries briefly when gtag loads late", () => {
    delete (window as unknown as Record<string, unknown>).gtag;

    render(<GA4PageView />);

    expect(mockGtag).not.toHaveBeenCalled();

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

  it("stops retrying after 500ms when gtag never appears", () => {
    delete (window as unknown as Record<string, unknown>).gtag;

    render(<GA4PageView />);

    vi.advanceTimersByTime(600);

    (window as unknown as Record<string, unknown>).gtag = mockGtag;
    vi.advanceTimersByTime(200);

    expect(mockGtag).not.toHaveBeenCalled();
  });

  it("no-ops when the measurement ID is missing", () => {
    vi.stubEnv("NEXT_PUBLIC_GA4_MEASUREMENT_ID", "");
    delete (window as unknown as Record<string, unknown>).gtag;

    render(<GA4PageView />);

    (window as unknown as Record<string, unknown>).gtag = mockGtag;
    vi.advanceTimersByTime(600);

    expect(mockGtag).not.toHaveBeenCalled();
  });
});
