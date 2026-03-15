// @vitest-environment jsdom

import { describe, it, expect, afterEach, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LastRoundBanner } from "@/app/(tools)/strokes-gained/_components/last-round-banner";

afterEach(cleanup);

describe("LastRoundBanner", () => {
  const defaultProps = {
    courseName: "Pebble Beach",
    score: 87,
    date: "2026-03-15",
    onRestore: vi.fn(),
    onDismiss: vi.fn(),
  };

  it("renders course name, score, and formatted date", () => {
    render(<LastRoundBanner {...defaultProps} />);
    expect(screen.getByText("Pebble Beach")).toBeVisible();
    expect(screen.getByText("87")).toBeVisible();
    expect(screen.getByText("Mar 15, 2026")).toBeVisible();
  });

  it("View Results button calls onRestore", async () => {
    const onRestore = vi.fn();
    const user = userEvent.setup();
    render(<LastRoundBanner {...defaultProps} onRestore={onRestore} />);

    await user.click(screen.getByRole("button", { name: /view results/i }));
    expect(onRestore).toHaveBeenCalledOnce();
  });

  it("Dismiss button calls onDismiss", async () => {
    const onDismiss = vi.fn();
    const user = userEvent.setup();
    render(<LastRoundBanner {...defaultProps} onDismiss={onDismiss} />);

    await user.click(screen.getByRole("button", { name: /dismiss/i }));
    expect(onDismiss).toHaveBeenCalledOnce();
  });

  it("has correct structure and styling", () => {
    const { container } = render(<LastRoundBanner {...defaultProps} />);
    const banner = container.firstElementChild as HTMLElement;
    expect(banner).toBeTruthy();
    expect(banner.dataset.testid).toBe("last-round-banner");
  });
});
