// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, within } from "@testing-library/react";
import { SiteHeader } from "@/components/site-header";

// Mock useSupabaseUser since it depends on Supabase client
vi.mock("@/lib/supabase/auth-client", () => ({
  useSupabaseUser: () => ({ user: null, loading: false }),
}));

// Mock UserMenu
vi.mock("@/components/auth/user-menu", () => ({
  UserMenu: ({ user }: { user: { email: string } }) => (
    <div data-testid="user-menu-mock">{user.email}</div>
  ),
}));

describe("SiteHeader", () => {
  afterEach(cleanup);

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
});
