// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { HistoryAuthPrompt } from "@/app/(tools)/strokes-gained/history/_components/history-auth-prompt";

// Mock the AuthModal since it depends on Supabase client
vi.mock("@/components/auth/auth-modal", () => ({
  AuthModal: ({ open }: { open: boolean }) =>
    open ? <div data-testid="auth-modal-mock" /> : null,
}));

describe("HistoryAuthPrompt", () => {
  afterEach(cleanup);

  it("renders sign-in prompt heading", () => {
    render(<HistoryAuthPrompt />);
    expect(
      screen.getByText("Track Your Progress Over Time")
    ).toBeInTheDocument();
  });

  it("renders sign-in button", () => {
    render(<HistoryAuthPrompt />);
    expect(screen.getByTestId("auth-prompt-sign-in")).toBeInTheDocument();
    expect(
      screen.getByText("Sign in to get started")
    ).toBeInTheDocument();
  });

  it("shows free account note", () => {
    render(<HistoryAuthPrompt />);
    expect(
      screen.getByText(/Free account/i)
    ).toBeInTheDocument();
  });
});
