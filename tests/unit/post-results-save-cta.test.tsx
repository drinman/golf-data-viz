// @vitest-environment jsdom

import { describe, it, expect, afterEach, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Mock saveRound server action
const mockSaveRound = vi.fn();
vi.mock("@/app/(tools)/strokes-gained/actions", () => ({
  saveRound: (...args: unknown[]) => mockSaveRound(...args),
}));

// Mock trackEvent
const mockTrackEvent = vi.fn();
vi.mock("@/lib/analytics/client", () => ({
  trackEvent: (...args: unknown[]) => mockTrackEvent(...args),
}));

import { PostResultsSaveCta } from "@/app/(tools)/strokes-gained/_components/post-results-save-cta";
import type { RoundInput } from "@/lib/golf/types";

const SAMPLE_INPUT: RoundInput = {
  handicapIndex: 14.3,
  course: "Pebble Beach",
  date: "2026-03-15",
  courseRating: 72,
  slopeRating: 130,
  score: 87,
  fairwaysHit: 7,
  fairwayAttempts: 14,
  greensInRegulation: 6,
  totalPutts: 33,
  penaltyStrokes: 2,
  eagles: 0,
  birdies: 1,
  pars: 8,
  bogeys: 6,
  doubleBogeys: 2,
  triplePlus: 1,
};

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("PostResultsSaveCta", () => {
  const defaultProps = {
    input: SAMPLE_INPUT,
    isAuthenticated: false,
    onSaveComplete: vi.fn(),
  };

  describe("copy variants", () => {
    it("renders anonymous copy when isAuthenticated=false", () => {
      render(<PostResultsSaveCta {...defaultProps} />);
      expect(screen.getByText("Want to track your progress?")).toBeVisible();
      expect(
        screen.getByText(
          "Save this round and see how your strokes gained changes over time."
        )
      ).toBeVisible();
      expect(
        screen.getByRole("button", { name: "Save This Round" })
      ).toBeVisible();
    });

    it("renders authenticated copy when isAuthenticated=true", () => {
      render(<PostResultsSaveCta {...defaultProps} isAuthenticated />);
      expect(screen.getByText("Add to your history")).toBeVisible();
      expect(
        screen.getByText(
          "Save this round to your history and track your SG trends."
        )
      ).toBeVisible();
      expect(
        screen.getByRole("button", { name: "Save to History" })
      ).toBeVisible();
    });

    it('shows "Free. No account required." subtext for anonymous users only', () => {
      const { rerender } = render(<PostResultsSaveCta {...defaultProps} />);
      expect(
        screen.getByText("Free. No account required.")
      ).toBeVisible();

      rerender(<PostResultsSaveCta {...defaultProps} isAuthenticated />);
      expect(
        screen.queryByText("Free. No account required.")
      ).toBeNull();
    });
  });

  describe("honeypot", () => {
    it("renders a hidden honeypot input", () => {
      render(<PostResultsSaveCta {...defaultProps} />);
      const honeypot = document.querySelector('input[name="website"]');
      expect(honeypot).toBeTruthy();
      expect(honeypot?.getAttribute("aria-hidden")).toBe("true");
      expect(honeypot?.getAttribute("tabindex")).toBe("-1");
    });
  });

  describe("analytics", () => {
    it("fires post_results_save_cta_viewed on mount", () => {
      render(<PostResultsSaveCta {...defaultProps} />);
      expect(mockTrackEvent).toHaveBeenCalledWith(
        "post_results_save_cta_viewed"
      );
    });

    it("fires post_results_save_cta_clicked on button click", async () => {
      mockSaveRound.mockResolvedValue({
        success: true,
        roundId: "round-123",
        claimToken: "claim-abc",
        isOwned: false,
      });

      const user = userEvent.setup();
      render(<PostResultsSaveCta {...defaultProps} />);

      await user.click(
        screen.getByRole("button", { name: "Save This Round" })
      );

      expect(mockTrackEvent).toHaveBeenCalledWith(
        "post_results_save_cta_clicked"
      );
    });
  });

  describe("save flow", () => {
    it("fires round_saved and calls onSaveComplete on success", async () => {
      const onSaveComplete = vi.fn();
      mockSaveRound.mockResolvedValue({
        success: true,
        roundId: "round-123",
        claimToken: "claim-abc",
        isOwned: false,
      });

      const user = userEvent.setup();
      render(
        <PostResultsSaveCta
          {...defaultProps}
          onSaveComplete={onSaveComplete}
        />
      );

      await user.click(
        screen.getByRole("button", { name: "Save This Round" })
      );

      await waitFor(() => {
        expect(mockTrackEvent).toHaveBeenCalledWith("round_saved", expect.objectContaining({
          auth_state: "anonymous",
        }));
      });

      // Wait for the success micro-interaction beat (300ms)
      await waitFor(
        () => {
          expect(onSaveComplete).toHaveBeenCalledWith({
            success: true,
            roundId: "round-123",
            claimToken: "claim-abc",
            isOwned: false,
          });
        },
        { timeout: 1000 }
      );
    });

    it('shows "Already saved" when server returns DUPLICATE_ROUND', async () => {
      mockSaveRound.mockResolvedValue({
        success: false,
        code: "DUPLICATE_ROUND",
        message: "This round was already saved.",
      });

      const user = userEvent.setup();
      render(<PostResultsSaveCta {...defaultProps} />);

      await user.click(
        screen.getByRole("button", { name: "Save This Round" })
      );

      await waitFor(() => {
        expect(screen.getByText("Already saved")).toBeVisible();
      });

      expect(mockTrackEvent).toHaveBeenCalledWith("round_save_failed", expect.objectContaining({
        error_type: "duplicate",
      }));
    });

    it("shows error with retry on other failures", async () => {
      mockSaveRound.mockResolvedValue({
        success: false,
        code: "DB_ERROR",
        message: "Round could not be saved.",
      });

      const user = userEvent.setup();
      render(<PostResultsSaveCta {...defaultProps} />);

      await user.click(
        screen.getByRole("button", { name: "Save This Round" })
      );

      await waitFor(() => {
        expect(
          screen.getByText("Round could not be saved.")
        ).toBeVisible();
      });

      // Retry button should be visible
      expect(
        screen.getByRole("button", { name: /try again/i })
      ).toBeVisible();

      expect(mockTrackEvent).toHaveBeenCalledWith("round_save_failed", expect.objectContaining({
        error_type: "runtime",
      }));
    });

    it("fires round_save_failed with rate_limited type", async () => {
      mockSaveRound.mockResolvedValue({
        success: false,
        code: "RATE_LIMITED",
        message: "Too many requests.",
      });

      const user = userEvent.setup();
      render(<PostResultsSaveCta {...defaultProps} />);

      await user.click(
        screen.getByRole("button", { name: "Save This Round" })
      );

      await waitFor(() => {
        expect(mockTrackEvent).toHaveBeenCalledWith("round_save_failed", expect.objectContaining({
          error_type: "rate_limited",
        }));
      });
    });
  });
});
