// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { GA4Bootstrap } from "@/lib/analytics/ga4-bootstrap";

describe("GA4Bootstrap", () => {
  afterEach(() => {
    cleanup();
    delete (window as unknown as Record<string, unknown>).gtag;
    delete (window as unknown as Record<string, unknown>).dataLayer;
  });

  beforeEach(() => {
    delete (window as unknown as Record<string, unknown>).gtag;
    delete (window as unknown as Record<string, unknown>).dataLayer;
  });

  it("defines a queueing stub when gtag is absent", () => {
    render(<GA4Bootstrap measurementId="G-TEST123" />);

    expect(typeof window.gtag).toBe("function");
    expect(window.dataLayer).toBeDefined();
    expect(window.dataLayer).toHaveLength(2);
    expect(window.dataLayer?.[1]).toEqual([
      "config",
      "G-TEST123",
      { send_page_view: false },
    ]);
  });

  it("does not overwrite an existing gtag implementation", () => {
    const existingGtag = vi.fn();
    window.gtag = existingGtag;

    render(<GA4Bootstrap measurementId="G-TEST123" />);

    expect(window.gtag).toBe(existingGtag);
    expect(existingGtag).toHaveBeenCalledWith("js", expect.any(Date));
    expect(existingGtag).toHaveBeenCalledWith("config", "G-TEST123", {
      send_page_view: false,
    });
  });

  it("no-ops when the measurement ID is missing", () => {
    render(<GA4Bootstrap measurementId={null} />);

    expect(window.gtag).toBeUndefined();
    expect(window.dataLayer).toBeUndefined();
  });
});
