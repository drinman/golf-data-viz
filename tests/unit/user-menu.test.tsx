// @vitest-environment jsdom

import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { User } from "@supabase/supabase-js";

const { mockSignOut } = vi.hoisted(() => ({
  mockSignOut: vi.fn(),
}));

vi.mock("@/lib/supabase/auth-client", () => ({
  signOut: mockSignOut,
}));

// Mock next/link to render a plain anchor
vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
    [key: string]: unknown;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

import { UserMenu } from "@/components/auth/user-menu";

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: "user-123",
    email: "golfer@example.com",
    app_metadata: {},
    user_metadata: {},
    aud: "authenticated",
    created_at: "2026-01-01T00:00:00Z",
    ...overrides,
  } as User;
}

describe("UserMenu", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders user email in the trigger button", () => {
    render(<UserMenu user={makeUser()} />);

    const trigger = screen.getByTestId("user-menu-trigger");
    expect(trigger).toHaveTextContent("golfer@example.com");
  });

  it("truncates long email addresses", () => {
    render(
      <UserMenu
        user={makeUser({ email: "areallylongemail@someverylongdomain.com" })}
      />
    );

    const trigger = screen.getByTestId("user-menu-trigger");
    expect(trigger).toHaveTextContent("areallylongemail@some...");
  });

  it("shows dropdown on click", async () => {
    const user = userEvent.setup();
    render(<UserMenu user={makeUser()} />);

    // Dropdown should not be visible initially
    expect(screen.queryByTestId("user-menu-dropdown")).not.toBeInTheDocument();

    // Click the trigger
    await user.click(screen.getByTestId("user-menu-trigger"));

    // Dropdown should now be visible
    expect(screen.getByTestId("user-menu-dropdown")).toBeInTheDocument();
    expect(screen.getByTestId("user-menu-history")).toBeInTheDocument();
    expect(screen.getByTestId("user-menu-signout")).toBeInTheDocument();
  });

  it("has a History link pointing to /strokes-gained/history", async () => {
    const user = userEvent.setup();
    render(<UserMenu user={makeUser()} />);

    await user.click(screen.getByTestId("user-menu-trigger"));

    const historyLink = screen.getByTestId("user-menu-history");
    expect(historyLink).toHaveAttribute("href", "/strokes-gained/history");
  });

  it("calls signOut when sign out button is clicked", async () => {
    const user = userEvent.setup();
    mockSignOut.mockResolvedValue({ error: null });

    // Mock window.location
    const originalLocation = window.location;
    Object.defineProperty(window, "location", {
      writable: true,
      value: { ...originalLocation, href: "" },
    });

    render(<UserMenu user={makeUser()} />);

    await user.click(screen.getByTestId("user-menu-trigger"));
    await user.click(screen.getByTestId("user-menu-signout"));

    expect(mockSignOut).toHaveBeenCalledTimes(1);

    // Restore
    Object.defineProperty(window, "location", {
      writable: true,
      value: originalLocation,
    });
  });

  it("closes dropdown on Escape key", async () => {
    const user = userEvent.setup();
    render(<UserMenu user={makeUser()} />);

    await user.click(screen.getByTestId("user-menu-trigger"));
    expect(screen.getByTestId("user-menu-dropdown")).toBeInTheDocument();

    await user.keyboard("{Escape}");
    expect(screen.queryByTestId("user-menu-dropdown")).not.toBeInTheDocument();
  });
});
