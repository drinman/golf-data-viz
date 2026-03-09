// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SiteHeader } from "@/components/site-header";

const mockUser = vi.hoisted(() => ({
  current: null as { id: string; email: string } | null,
}));

// Mock useSupabaseUser since it depends on Supabase client
vi.mock("@/lib/supabase/auth-client", () => ({
  useSupabaseUser: () => ({ user: mockUser.current, loading: false }),
}));

// Mock UserMenu
vi.mock("@/components/auth/user-menu", () => ({
  UserMenu: ({ user }: { user: { email: string } }) => (
    <div data-testid="user-menu-mock">{user.email}</div>
  ),
}));

// Mock AuthModal
vi.mock("@/components/auth/auth-modal", () => ({
  AuthModal: ({ open }: { open: boolean }) =>
    open ? <div data-testid="auth-modal-mock" /> : null,
}));

// Mock analytics
const mockTrackEvent = vi.fn();
vi.mock("@/lib/analytics/client", () => ({
  trackEvent: (...args: unknown[]) => mockTrackEvent(...args),
}));

describe("SiteHeader", () => {
  afterEach(() => {
    cleanup();
    mockUser.current = null;
    mockTrackEvent.mockClear();
  });

  it("renders logo and title", () => {
    render(<SiteHeader />);
    expect(screen.getByText("Golf Data Viz")).toBeInTheDocument();
  });

  it("has SG Benchmarker nav link", () => {
    render(<SiteHeader />);
    const nav = screen.getByRole("navigation");
    const link = within(nav).getByText("SG Benchmarker");
    expect(link.closest("a")).toHaveAttribute("href", "/strokes-gained");
  });

  it("has Methodology nav link", () => {
    render(<SiteHeader />);
    const nav = screen.getByRole("navigation");
    const link = within(nav).getByText("Methodology");
    expect(link.closest("a")).toHaveAttribute("href", "/methodology");
  });

  it("has History nav link", () => {
    render(<SiteHeader />);
    const nav = screen.getByRole("navigation");
    const link = within(nav).getByText("History");
    expect(link.closest("a")).toHaveAttribute("href", "/strokes-gained/history");
  });

  it("does not show UserMenu when unauthenticated", () => {
    render(<SiteHeader />);
    expect(screen.queryByTestId("user-menu-mock")).not.toBeInTheDocument();
  });

  it("shows Sign in button when unauthenticated", () => {
    render(<SiteHeader />);
    expect(screen.getByTestId("header-sign-in")).toBeInTheDocument();
    expect(screen.getByTestId("header-sign-in")).toHaveTextContent("Sign in");
  });

  it("opens auth modal when Sign in is clicked", async () => {
    const user = userEvent.setup();
    render(<SiteHeader />);

    await user.click(screen.getByTestId("header-sign-in"));

    expect(screen.getByTestId("auth-modal-mock")).toBeInTheDocument();
    expect(mockTrackEvent).toHaveBeenCalledWith("auth_modal_opened", {
      surface: "header_sign_in",
    });
  });

  it("does not show Sign in when authenticated", () => {
    mockUser.current = { id: "user-1", email: "test@example.com" };
    render(<SiteHeader />);
    expect(screen.queryByTestId("header-sign-in")).not.toBeInTheDocument();
    expect(screen.getByTestId("user-menu-mock")).toBeInTheDocument();
  });
});
