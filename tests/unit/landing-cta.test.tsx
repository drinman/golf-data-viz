// @vitest-environment jsdom

import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LandingCta } from "@/app/_components/landing-cta";

const { mockTrackEvent } = vi.hoisted(() => ({
  mockTrackEvent: vi.fn(),
}));

vi.mock("@/lib/analytics/client", () => ({
  trackEvent: mockTrackEvent,
}));

describe("LandingCta analytics", () => {
  afterEach(() => cleanup());

  beforeEach(() => {
    mockTrackEvent.mockClear();
    window.history.pushState({}, "", "/?utm_source=reddit");
  });

  it("includes utm_source when the CTA is clicked", async () => {
    const user = userEvent.setup();

    render(<LandingCta />);
    const cta = screen.getByRole("link", { name: "Find Where I'm Losing Strokes" });
    expect(cta).toHaveAttribute("href", "/strokes-gained?utm_source=reddit");
    cta.addEventListener("click", (event) => event.preventDefault());
    await user.click(cta);

    expect(mockTrackEvent).toHaveBeenCalledWith("landing_cta_clicked", {
      utm_source: "reddit",
    });
  });

  it("renders trust line when showTrustLine is true", () => {
    render(<LandingCta showTrustLine />);
    expect(screen.getByText(/6 numbers/)).toBeVisible();
    expect(screen.getByText(/90 seconds/)).toBeVisible();
  });

  it("does not render trust line by default", () => {
    render(<LandingCta />);
    expect(screen.queryByText(/6 numbers/)).not.toBeInTheDocument();
  });
});
