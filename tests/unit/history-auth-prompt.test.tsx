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

  it("renders Round History heading and subtitle", () => {
    render(<HistoryAuthPrompt />);
    expect(screen.getByText("Round History")).toBeInTheDocument();
    expect(
      screen.getByText("Your strokes gained performance over time.")
    ).toBeInTheDocument();
  });

  it("renders three feature preview cards", () => {
    render(<HistoryAuthPrompt />);
    expect(screen.getByText("Biggest Mover")).toBeInTheDocument();
    expect(screen.getByText("SG Trends Over Time")).toBeInTheDocument();
    expect(screen.getByText("Round-by-Round Breakdown")).toBeInTheDocument();
  });

  it("renders bridge line above CTA", () => {
    render(<HistoryAuthPrompt />);
    expect(
      screen.getByText("Benchmark a round for free, save it, then track what changes over time.")
    ).toBeInTheDocument();
  });

  it("renders primary CTA for new users and secondary sign-in for existing users", () => {
    render(<HistoryAuthPrompt />);
    expect(screen.getByTestId("auth-prompt-sign-in")).toHaveTextContent(
      "Create free account to start tracking"
    );
    expect(screen.getByTestId("auth-prompt-sign-in-link")).toHaveTextContent(
      "Sign in"
    );
    expect(
      screen.getByText(/Already have an account\?/i)
    ).toBeInTheDocument();
  });
});
