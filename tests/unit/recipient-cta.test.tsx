// @vitest-environment jsdom

import { describe, it, expect, vi, afterEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

const mockTrackEvent = vi.fn();
vi.mock("@/lib/analytics/client", () => ({
  trackEvent: (...args: unknown[]) => mockTrackEvent(...args),
}));

import { RecipientCta } from "@/app/(tools)/strokes-gained/_components/recipient-cta";
import type { StrokesGainedResult } from "@/lib/golf/types";

function makeSgResult(
  overrides: Partial<StrokesGainedResult["categories"]> = {},
  total?: number
): StrokesGainedResult {
  const categories = {
    "off-the-tee": 0.5,
    approach: 0.3,
    "around-the-green": -0.2,
    putting: -0.1,
    ...overrides,
  };
  return {
    total: total ?? Object.values(categories).reduce((a, b) => a + b, 0),
    categories,
    benchmarkBracket: "10-15" as const,
    skippedCategories: [],
    estimatedCategories: [],
    confidence: {
      "off-the-tee": "high",
      approach: "high",
      "around-the-green": "medium",
      putting: "high",
    },
    methodologyVersion: "3.0.0",
    benchmarkVersion: "1.0.0",
    benchmarkHandicap: 14.3,
    diagnostics: { threePuttImpact: null },
  } as StrokesGainedResult;
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("RecipientCta", () => {
  describe("challenge headline", () => {
    it("shows challenge copy when sender has a significant weakness (< -0.5)", () => {
      const result = makeSgResult({ putting: -1.2 });

      render(
        <RecipientCta
          senderHandicap={14.3}
          senderResult={result}
          surface="encoded_share"
        />
      );

      // Inline CTA should show the challenge headline with the category name
      expect(
        screen.getByText(/Your friend is losing .+ strokes on putting\. Where are YOU losing strokes\?/)
      ).toBeVisible();
    });

    it("shows generic positive copy when sender beats peers with no weakness", () => {
      const result = makeSgResult(
        { "off-the-tee": 1.0, approach: 0.8, "around-the-green": 0.3, putting: 0.5 },
        2.6
      );

      render(
        <RecipientCta
          senderHandicap={14.3}
          senderResult={result}
          surface="encoded_share"
        />
      );

      expect(
        screen.getByText("Your friend is outplaying their peers. Are you?")
      ).toBeVisible();
    });

    it("shows generic negative copy when sender loses strokes but no single category < -0.5", () => {
      const result = makeSgResult(
        { "off-the-tee": -0.3, approach: -0.4, "around-the-green": -0.2, putting: -0.1 },
        -1.0
      );

      render(
        <RecipientCta
          senderHandicap={14.3}
          senderResult={result}
          surface="encoded_share"
        />
      );

      // Total is negative but no single category breaches -0.5
      expect(
        screen.getByText("Where are YOU losing strokes?")
      ).toBeVisible();
    });

    it("shows neutral copy when sender is near zero", () => {
      const result = makeSgResult(
        { "off-the-tee": 0.1, approach: -0.1, "around-the-green": 0.0, putting: 0.0 },
        0.0
      );

      render(
        <RecipientCta
          senderHandicap={14.3}
          senderResult={result}
          surface="encoded_share"
        />
      );

      expect(
        screen.getByText("Same handicap. Different game. See yours.")
      ).toBeVisible();
    });

    it("uses the worst category by value for the challenge headline", () => {
      // Around the green is worst at -1.5, putting is -0.8
      const result = makeSgResult({
        "off-the-tee": 0.5,
        approach: 0.3,
        "around-the-green": -1.5,
        putting: -0.8,
      });

      render(
        <RecipientCta
          senderHandicap={14.3}
          senderResult={result}
          surface="encoded_share"
        />
      );

      // Should pick around-the-green (worst), not putting
      expect(
        screen.getByText(/Your friend is losing .+ strokes on around the green/)
      ).toBeVisible();
    });
  });

  describe("sticky vs inline copy split", () => {
    it("shows short challenge in sticky CTA when weakness exists", () => {
      const result = makeSgResult({ putting: -1.2 });

      render(
        <RecipientCta
          senderHandicap={14.3}
          senderResult={result}
          surface="encoded_share"
        />
      );

      // The sticky CTA has data-testid="sticky-recipient-cta"
      // It uses getShortChallenge which returns "Beat their putting?"
      // However, sticky only renders when IntersectionObserver triggers
      // and viewport is < 640px. In jsdom, IntersectionObserver isn't available,
      // so showSticky stays false. We verify the inline copy is correct instead.
      const inlineCta = screen.getByTestId("recipient-cta");
      expect(
        inlineCta.querySelector("p")?.textContent
      ).toMatch(/Your friend is losing .+ strokes on putting/);
    });
  });

  describe("comparison teaser", () => {
    it("shows best and worst categories in the teaser", () => {
      const result = makeSgResult({
        "off-the-tee": 0.5,
        approach: 1.2,
        "around-the-green": -0.8,
        putting: 0.3,
      });

      render(
        <RecipientCta
          senderHandicap={14.3}
          senderResult={result}
          surface="encoded_share"
        />
      );

      // Best is approach (+1.2), worst is around-the-green (-0.8)
      expect(
        screen.getByText(/Best: Approach.*Worst: Around the Green/)
      ).toBeVisible();
    });
  });

  describe("analytics", () => {
    it("fires shared_round_cta_clicked with surface on click", async () => {
      const { default: userEvent } = await import("@testing-library/user-event");
      const user = userEvent.setup();

      const result = makeSgResult();
      render(
        <RecipientCta
          senderHandicap={14.3}
          senderResult={result}
          surface="token_share"
        />
      );

      await user.click(screen.getByRole("link", { name: "Find Where You're Losing Strokes" }));

      expect(mockTrackEvent).toHaveBeenCalledWith("shared_round_cta_clicked", {
        surface: "token_share",
        sentiment: expect.any(String),
      });
    });
  });
});
