import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the analytics module
const mockTrackEvent = vi.fn();
vi.mock("@/lib/analytics/client", () => ({
  trackEvent: (...args: unknown[]) => mockTrackEvent(...args),
}));

describe("History analytics events", () => {
  beforeEach(() => {
    mockTrackEvent.mockClear();
  });

  it("trackEvent can be called with history_page_viewed", () => {
    mockTrackEvent("history_page_viewed", { round_count: 5 });
    expect(mockTrackEvent).toHaveBeenCalledWith("history_page_viewed", {
      round_count: 5,
    });
  });

  it("trackEvent can be called with trend_chart_viewed", () => {
    mockTrackEvent("trend_chart_viewed", { round_count: 3 });
    expect(mockTrackEvent).toHaveBeenCalledWith("trend_chart_viewed", {
      round_count: 3,
    });
  });

  it("trackEvent can be called with biggest_mover_viewed", () => {
    mockTrackEvent("biggest_mover_viewed", {
      category: "approach",
      direction: "improving",
      confidence: "recent_movement",
    });
    expect(mockTrackEvent).toHaveBeenCalledWith("biggest_mover_viewed", {
      category: "approach",
      direction: "improving",
      confidence: "recent_movement",
    });
  });

  it("trackEvent can be called with round_claimed", () => {
    mockTrackEvent("round_claimed");
    expect(mockTrackEvent).toHaveBeenCalledWith("round_claimed");
  });

  it("trackEvent can be called with round_claim_failed and reason", () => {
    mockTrackEvent("round_claim_failed", { reason: "token_mismatch" });
    expect(mockTrackEvent).toHaveBeenCalledWith("round_claim_failed", {
      reason: "token_mismatch",
    });
  });

  it("trackEvent can be called with auth_modal_opened", () => {
    mockTrackEvent("auth_modal_opened", { surface: "history_page" });
    expect(mockTrackEvent).toHaveBeenCalledWith("auth_modal_opened", {
      surface: "history_page",
    });
  });

  it("trackEvent can be called with auth_completed", () => {
    mockTrackEvent("auth_completed", {
      method: "google",
      surface: "post_save_cta",
    });
    expect(mockTrackEvent).toHaveBeenCalledWith("auth_completed", {
      method: "google",
      surface: "post_save_cta",
    });
  });
});
