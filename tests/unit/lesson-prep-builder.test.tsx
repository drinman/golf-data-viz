// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { LessonPrepBuilder } from "@/app/(tools)/strokes-gained/lesson-prep/_components/lesson-prep-builder";
import type { ViewerEntitlements } from "@/lib/billing/entitlements";
import { makeRoundSnapshot } from "../fixtures/factories";

const { mockPush, mockReplace, mockTrackEvent } = vi.hoisted(() => ({
  mockPush: vi.fn(),
  mockReplace: vi.fn(),
  mockTrackEvent: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
  }),
}));

vi.mock("@/lib/analytics/client", () => ({
  trackEvent: mockTrackEvent,
}));

vi.mock("@/app/(tools)/strokes-gained/lesson-prep/actions", () => ({
  generateLessonReport: vi.fn(),
  openLessonPrepBillingPortal: vi.fn(),
  startLessonPrepCheckout: vi.fn(),
}));

const freeEntitlements: ViewerEntitlements = {
  status: "free",
  canGenerateLessonReports: false,
  canViewExistingLessonReports: false,
  expiresAt: null,
  inGracePeriod: false,
};

describe("LessonPrepBuilder", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("handles a one-round account without breaking", () => {
    render(
      <LessonPrepBuilder
        rounds={[makeRoundSnapshot({ roundId: "round-1", courseName: "Torrey Pines" })]}
        entitlements={freeEntitlements}
        checkoutState={null}
      />
    );

    expect(screen.getByText("Lesson Prep Report")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Save at least 3 rounds first. Single-round benchmark, saved detail, and saved-round sharing stay free."
      )
    ).toBeInTheDocument();
    expect(screen.getByText("1 round")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Generate Report" })).not.toBeInTheDocument();
  });
});
