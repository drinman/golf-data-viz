// @vitest-environment jsdom

import { render, screen, waitFor, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const { mockSignInWithEmail, mockSignUpWithEmail, mockSignInWithGoogle } =
  vi.hoisted(() => ({
    mockSignInWithEmail: vi.fn(),
    mockSignUpWithEmail: vi.fn(),
    mockSignInWithGoogle: vi.fn(),
  }));

vi.mock("@/lib/supabase/auth-client", () => ({
  signInWithEmail: mockSignInWithEmail,
  signUpWithEmail: mockSignUpWithEmail,
  signInWithGoogle: mockSignInWithGoogle,
}));

import { AuthModal } from "@/components/auth/auth-modal";

describe("AuthModal", () => {
  let onClose: ReturnType<typeof vi.fn>;
  let onSuccess: ReturnType<typeof vi.fn>;
  let originalLocalStorage: Storage;
  let mockStorage: Record<string, string> | null;
  const pendingOauthClaim = JSON.stringify({
    roundId: "round-123",
    claimToken: "claim-token-123",
  });

  function installMockLocalStorage() {
    mockStorage = {};

    Object.defineProperty(globalThis, "localStorage", {
      value: {
        getItem: (key: string) => mockStorage?.[key] ?? null,
        setItem: (key: string, value: string) => {
          if (!mockStorage) return;
          mockStorage[key] = value;
        },
        removeItem: (key: string) => {
          if (!mockStorage) return;
          delete mockStorage[key];
        },
        get length() {
          return mockStorage ? Object.keys(mockStorage).length : 0;
        },
        key: (i: number) => (mockStorage ? Object.keys(mockStorage)[i] ?? null : null),
      },
      writable: true,
      configurable: true,
    });
  }

  beforeEach(() => {
    vi.clearAllMocks();
    originalLocalStorage = globalThis.localStorage;
    mockStorage = null;
    onClose = vi.fn();
    onSuccess = vi.fn();
  });

  afterEach(() => {
    cleanup();
    Object.defineProperty(globalThis, "localStorage", {
      value: originalLocalStorage,
      writable: true,
      configurable: true,
    });
  });

  it("does not render when open is false", () => {
    render(<AuthModal open={false} onClose={onClose} />);
    expect(screen.queryByTestId("auth-modal")).not.toBeInTheDocument();
  });

  it("renders sign-in form by default", () => {
    render(<AuthModal open={true} onClose={onClose} onSuccess={onSuccess} />);

    expect(screen.getByTestId("auth-modal-title")).toHaveTextContent(
      "Welcome back"
    );
    expect(screen.getByTestId("auth-submit-btn")).toHaveTextContent("Sign in");
    expect(screen.getByTestId("auth-email-input")).toBeInTheDocument();
    expect(screen.getByTestId("auth-password-input")).toBeInTheDocument();
    expect(screen.getByTestId("google-signin-btn")).toBeInTheDocument();
  });

  it("toggles between sign-in and sign-up modes", async () => {
    const user = userEvent.setup();
    render(<AuthModal open={true} onClose={onClose} onSuccess={onSuccess} />);

    // Should start in sign-in mode
    expect(screen.getByTestId("auth-modal-title")).toHaveTextContent(
      "Welcome back"
    );

    // Toggle to sign-up
    await user.click(screen.getByTestId("auth-toggle-mode"));
    expect(screen.getByTestId("auth-modal-title")).toHaveTextContent(
      "Create your free account"
    );
    expect(screen.getByTestId("auth-submit-btn")).toHaveTextContent(
      "Create account"
    );

    // Toggle back to sign-in
    await user.click(screen.getByTestId("auth-toggle-mode"));
    expect(screen.getByTestId("auth-modal-title")).toHaveTextContent(
      "Welcome back"
    );
  });

  it("shows error on failed sign-in", async () => {
    const user = userEvent.setup();
    mockSignInWithEmail.mockResolvedValue({
      data: { user: null, session: null },
      error: { message: "Invalid login credentials" },
    });

    render(<AuthModal open={true} onClose={onClose} onSuccess={onSuccess} />);

    await user.type(
      screen.getByTestId("auth-email-input"),
      "bad@example.com"
    );
    await user.type(
      screen.getByTestId("auth-password-input"),
      "wrongpassword"
    );
    await user.click(screen.getByTestId("auth-submit-btn"));

    await waitFor(() => {
      expect(screen.getByTestId("auth-error")).toHaveTextContent(
        "Invalid login credentials"
      );
    });

    expect(onSuccess).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("calls onSuccess and onClose after successful sign-in", async () => {
    const user = userEvent.setup();
    mockSignInWithEmail.mockResolvedValue({
      data: {
        user: { id: "u1", email: "golfer@example.com" },
        session: { access_token: "tok" },
      },
      error: null,
    });

    render(<AuthModal open={true} onClose={onClose} onSuccess={onSuccess} />);

    await user.type(
      screen.getByTestId("auth-email-input"),
      "golfer@example.com"
    );
    await user.type(screen.getByTestId("auth-password-input"), "correctpass");
    await user.click(screen.getByTestId("auth-submit-btn"));

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledTimes(1);
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  it("calls onClose when clicking backdrop", async () => {
    const user = userEvent.setup();
    render(<AuthModal open={true} onClose={onClose} onSuccess={onSuccess} />);

    const backdrop = screen.getByTestId("auth-modal-backdrop");
    await user.click(backdrop);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose on Escape key", async () => {
    const user = userEvent.setup();
    render(<AuthModal open={true} onClose={onClose} onSuccess={onSuccess} />);

    await user.keyboard("{Escape}");

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls signInWithGoogle when Google button is clicked", async () => {
    const user = userEvent.setup();
    mockSignInWithGoogle.mockResolvedValue({ data: {}, error: null });

    render(<AuthModal open={true} onClose={onClose} onSuccess={onSuccess} />);

    await user.click(screen.getByTestId("google-signin-btn"));

    expect(mockSignInWithGoogle).toHaveBeenCalledTimes(1);
  });

  it("clears pending OAuth claim state when Google sign-in resolves with an error", async () => {
    const user = userEvent.setup();
    installMockLocalStorage();
    mockSignInWithGoogle.mockResolvedValue({
      data: {},
      error: { message: "OAuth disabled" },
    });

    render(
      <AuthModal
        open={true}
        onClose={onClose}
        onSuccess={onSuccess}
        onGoogleAuthStart={() => {
          localStorage.setItem("pending-oauth-claim", pendingOauthClaim);
        }}
      />
    );

    await user.click(screen.getByTestId("google-signin-btn"));

    await waitFor(() => {
      expect(screen.getByTestId("auth-error")).toHaveTextContent(
        "Could not initiate Google sign-in."
      );
    });

    expect(globalThis.localStorage.getItem("pending-oauth-claim")).toBeNull();
    expect(screen.getByTestId("auth-modal")).toBeInTheDocument();
    expect(onSuccess).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("clears pending OAuth claim state when Google sign-in throws", async () => {
    const user = userEvent.setup();
    installMockLocalStorage();
    mockSignInWithGoogle.mockRejectedValue(new Error("network down"));

    render(
      <AuthModal
        open={true}
        onClose={onClose}
        onSuccess={onSuccess}
        onGoogleAuthStart={() => {
          localStorage.setItem("pending-oauth-claim", pendingOauthClaim);
        }}
      />
    );

    await user.click(screen.getByTestId("google-signin-btn"));

    await waitFor(() => {
      expect(screen.getByTestId("auth-error")).toHaveTextContent(
        "Could not initiate Google sign-in."
      );
    });

    expect(globalThis.localStorage.getItem("pending-oauth-claim")).toBeNull();
    expect(screen.getByTestId("auth-modal")).toBeInTheDocument();
    expect(onSuccess).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("shows loading state during submission", async () => {
    const user = userEvent.setup();
    // Never resolve to keep loading state visible
    mockSignInWithEmail.mockReturnValue(new Promise(() => {}));

    render(<AuthModal open={true} onClose={onClose} onSuccess={onSuccess} />);

    await user.type(
      screen.getByTestId("auth-email-input"),
      "golfer@example.com"
    );
    await user.type(screen.getByTestId("auth-password-input"), "password123");
    await user.click(screen.getByTestId("auth-submit-btn"));

    await waitFor(() => {
      expect(screen.getByTestId("auth-submit-btn")).toHaveTextContent(
        "Please wait..."
      );
      expect(screen.getByTestId("auth-submit-btn")).toBeDisabled();
    });
  });
});
