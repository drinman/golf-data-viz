import { describe, it, expect } from "vitest";
import type {
  AnalyticsEvent,
  AnalyticsEventProps,
} from "@/lib/analytics/events";

describe("SEO analytics events", () => {
  it("seo_cta_clicked exists in AnalyticsEvent union", () => {
    const event: AnalyticsEvent = "seo_cta_clicked";
    expect(event).toBe("seo_cta_clicked");
  });

  it("seo_cta_clicked payload requires surface and source_path", () => {
    const props: AnalyticsEventProps["seo_cta_clicked"] = {
      surface: "learn_page",
      source_path: "/learn/strokes-gained-explained",
    };
    expect(props.surface).toBeDefined();
    expect(props.source_path).toBeDefined();
  });
});
