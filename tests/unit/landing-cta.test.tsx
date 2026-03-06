// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LandingCta } from "@/app/_components/landing-cta";

const { mockTrackEvent } = vi.hoisted(() => ({
  mockTrackEvent: vi.fn(),
}));

vi.mock("@/lib/analytics/client", () => ({
  trackEvent: mockTrackEvent,
}));

describe("LandingCta analytics", () => {
  beforeEach(() => {
    mockTrackEvent.mockClear();
    window.history.pushState({}, "", "/?utm_source=reddit");
  });

  it("includes utm_source when the CTA is clicked", async () => {
    const user = userEvent.setup();

    render(<LandingCta />);
    const cta = screen.getByRole("link", { name: "Benchmark My Round" });
    expect(cta).toHaveAttribute("href", "/strokes-gained?utm_source=reddit");
    cta.addEventListener("click", (event) => event.preventDefault());
    await user.click(cta);

    expect(mockTrackEvent).toHaveBeenCalledWith("landing_cta_clicked", {
      utm_source: "reddit",
    });
  });
});
