// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, within, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SiteHeader } from "@/components/site-header";

const mockUser = vi.hoisted(() => ({
  current: null as { id: string; email: string } | null,
}));

const mockPathname = vi.hoisted(() => ({ current: "/" }));
const mockSignOut = vi.hoisted(() => vi.fn(async () => ({ error: null })));
const mockPush = vi.hoisted(() => vi.fn());
const mockRefresh = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname.current,
  useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
}));

// Mock useSupabaseUser since it depends on Supabase client
vi.mock("@/lib/supabase/auth-client", () => ({
  useSupabaseUser: () => ({ user: mockUser.current, loading: false }),
  signOut: (...args: unknown[]) => mockSignOut(...args),
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
    mockPathname.current = "/";
    mockTrackEvent.mockClear();
    mockSignOut.mockClear();
    mockPush.mockClear();
    mockRefresh.mockClear();
  });

  it("renders logo and title", () => {
    render(<SiteHeader />);
    expect(screen.getByText("Golf Data Viz")).toBeInTheDocument();
  });

  it("has desktop SG Benchmarker nav link", () => {
    render(<SiteHeader />);
    const nav = screen.getByLabelText("Main");
    const link = within(nav).getByText("SG Benchmarker");
    expect(link.closest("a")).toHaveAttribute("href", "/strokes-gained");
  });

  it("has desktop Methodology nav link", () => {
    render(<SiteHeader />);
    const nav = screen.getByLabelText("Main");
    const link = within(nav).getByText("Methodology");
    expect(link.closest("a")).toHaveAttribute("href", "/methodology");
  });

  it("has desktop History nav link", () => {
    render(<SiteHeader />);
    const nav = screen.getByLabelText("Main");
    const link = within(nav).getByText("History");
    expect(link.closest("a")).toHaveAttribute("href", "/strokes-gained/history");
  });

  it("does not show UserMenu when unauthenticated", () => {
    render(<SiteHeader />);
    expect(screen.queryByTestId("user-menu-mock")).not.toBeInTheDocument();
  });

  it("shows desktop Sign in button when unauthenticated", () => {
    render(<SiteHeader />);
    expect(screen.getByTestId("header-sign-in")).toBeInTheDocument();
    expect(screen.getByTestId("header-sign-in")).toHaveTextContent("Sign in");
  });

  it("opens auth modal when desktop Sign in is clicked", async () => {
    const user = userEvent.setup();
    render(<SiteHeader />);

    await user.click(screen.getByTestId("header-sign-in"));

    expect(screen.getByTestId("auth-modal-mock")).toBeInTheDocument();
    expect(mockTrackEvent).toHaveBeenCalledWith("auth_modal_opened", {
      surface: "header_sign_in",
    });
  });

  it("shows mobile toggle and opens/closes mobile panel", async () => {
    const user = userEvent.setup();
    render(<SiteHeader />);

    const toggle = screen.getByTestId("mobile-nav-toggle");
    const panel = screen.getByTestId("mobile-nav-panel");

    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(panel).toHaveAttribute("data-state", "closed");

    await user.click(toggle);

    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(panel).toHaveAttribute("data-state", "open");

    await user.click(toggle);

    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(panel).toHaveAttribute("data-state", "closed");
  });

  it("opens auth modal when mobile Sign in is clicked", async () => {
    const user = userEvent.setup();
    render(<SiteHeader />);

    await user.click(screen.getByTestId("mobile-nav-toggle"));
    await user.click(screen.getByTestId("mobile-nav-sign-in"));

    expect(screen.getByTestId("auth-modal-mock")).toBeInTheDocument();
    expect(screen.getByTestId("mobile-nav-panel")).toHaveAttribute("data-state", "closed");
    expect(mockTrackEvent).toHaveBeenCalledWith("auth_modal_opened", {
      surface: "header_sign_in",
    });
  });

  it("closes mobile panel on Escape", async () => {
    const user = userEvent.setup();
    render(<SiteHeader />);

    await user.click(screen.getByTestId("mobile-nav-toggle"));
    expect(screen.getByTestId("mobile-nav-panel")).toHaveAttribute("data-state", "open");

    await user.keyboard("{Escape}");
    expect(screen.getByTestId("mobile-nav-panel")).toHaveAttribute("data-state", "closed");
  });

  it("shows logged-in mobile account actions", async () => {
    mockUser.current = { id: "user-1", email: "test@example.com" };
    const user = userEvent.setup();
    render(<SiteHeader />);

    await user.click(screen.getByTestId("mobile-nav-toggle"));

    const mobileNav = screen.getByLabelText("Mobile main navigation");
    expect(within(mobileNav).getByText("test@example.com")).toBeInTheDocument();
    expect(within(mobileNav).getByText("Lesson Prep").closest("a")).toHaveAttribute(
      "href",
      "/strokes-gained/lesson-prep",
    );
    expect(within(mobileNav).getByRole("button", { name: "Sign out" })).toBeInTheDocument();
  });

  it("does not show desktop Sign in when authenticated", () => {
    mockUser.current = { id: "user-1", email: "test@example.com" };
    render(<SiteHeader />);
    expect(screen.queryByTestId("header-sign-in")).not.toBeInTheDocument();
    expect(screen.getByTestId("user-menu-mock")).toBeInTheDocument();
  });

  it("switches header state when scrolled", () => {
    render(<SiteHeader />);
    const header = screen.getByTestId("site-header");

    expect(header).toHaveAttribute("data-scrolled", "false");
    Object.defineProperty(window, "scrollY", { value: 20, configurable: true });
    fireEvent.scroll(window);

    expect(header).toHaveAttribute("data-scrolled", "true");
  });
});
