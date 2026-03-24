"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  signInWithEmail,
  signUpWithEmail,
  signInWithGoogle,
} from "@/lib/supabase/auth-client";

type AuthMode = "signin" | "signup";

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  onGoogleAuthStart?: () => void;
  initialMode?: AuthMode;
}

export function AuthModal({ open, onClose, onSuccess, onGoogleAuthStart, initialMode = "signin" }: AuthModalProps) {
  if (!open) return null;

  return (
    <AuthModalContent onClose={onClose} onSuccess={onSuccess} onGoogleAuthStart={onGoogleAuthStart} initialMode={initialMode} />
  );
}

/** Inner component — unmounts when modal closes, so state resets naturally. */
function AuthModalContent({
  onClose,
  onSuccess,
  onGoogleAuthStart,
  initialMode = "signin",
}: Omit<AuthModalProps, "open">) {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const backdropRef = useRef<HTMLDivElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);

  // Focus email input on mount
  useEffect(() => {
    requestAnimationFrame(() => emailRef.current?.focus());
  }, []);

  // Escape key dismissal
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  // Click-outside dismissal
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === backdropRef.current) onClose();
    },
    [onClose]
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const result =
        mode === "signin"
          ? await signInWithEmail(email, password)
          : await signUpWithEmail(email, password);

      if (result.error) {
        setError(result.error.message);
        setLoading(false);
        return;
      }

      if (mode === "signup" && !result.data.session) {
        // Email confirmation required
        setError(null);
        setEmail("");
        setPassword("");
        setLoading(false);
        setMode("signin");
        setInfo("Check your email to confirm your account, then sign in.");
        return;
      }

      onSuccess?.();
      onClose();
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  async function handleGoogleSignIn() {
    setError(null);
    const handleGoogleStartFailure = () => {
      // OAuth never redirected — clean up any persisted claim context
      try { localStorage.removeItem("pending-oauth-claim"); } catch { /* noop */ }
      setError("Could not initiate Google sign-in.");
    };

    try {
      onGoogleAuthStart?.();
      const result = await signInWithGoogle();
      if (result.error) {
        handleGoogleStartFailure();
      }
    } catch {
      handleGoogleStartFailure();
    }
  }

  return (
    <div
      ref={backdropRef}
      onClick={handleBackdropClick}
      data-testid="auth-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={mode === "signin" ? "Sign in" : "Create account"}
        data-testid="auth-modal"
        className="mx-4 w-full max-w-sm rounded-xl border border-cream-200 bg-white shadow-xl"
      >
        <div className="px-6 pb-6 pt-5">
          {/* Header */}
          <div className="flex items-start justify-between">
            <h2
              data-testid="auth-modal-title"
              className="font-display text-xl tracking-tight text-neutral-950"
            >
              {mode === "signin" ? "Welcome back" : "Create your free account"}
            </h2>
            <button
              type="button"
              onClick={onClose}
              data-testid="auth-modal-close"
              aria-label="Close"
              className="rounded-md p-1 text-neutral-400 transition-colors hover:bg-cream-100 hover:text-neutral-600"
            >
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
              </svg>
            </button>
          </div>
          <p className="mt-1 text-sm text-neutral-600">
            {mode === "signin"
              ? "Sign in to track your rounds and view trends."
              : "Keep your saved rounds and track SG trends over time."}
          </p>

          {/* Google OAuth */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            data-testid="google-signin-btn"
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-cream-200 bg-white px-4 py-2.5 text-sm font-medium text-neutral-800 transition-all hover:border-neutral-400 hover:bg-cream-50"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 001 12c0 1.77.42 3.45 1.18 4.93l3.66-2.84z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            Sign in with Google
          </button>

          {/* Divider */}
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-cream-200" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white px-2 text-neutral-400">or</span>
            </div>
          </div>

          {/* Email form */}
          <form onSubmit={handleSubmit} data-testid="auth-form">
            <div className="space-y-3">
              <div>
                <label
                  htmlFor="auth-email"
                  className="text-xs font-medium text-neutral-600"
                >
                  Email
                </label>
                <input
                  ref={emailRef}
                  id="auth-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  data-testid="auth-email-input"
                  placeholder="you@example.com"
                  className="mt-1 block w-full rounded-lg border border-cream-200 bg-white px-3 py-2 text-sm text-neutral-950 placeholder:text-neutral-400 focus:border-brand-700 focus:outline-none focus:ring-1 focus:ring-brand-700"
                />
              </div>
              <div>
                <label
                  htmlFor="auth-password"
                  className="text-xs font-medium text-neutral-600"
                >
                  Password
                </label>
                <input
                  id="auth-password"
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  data-testid="auth-password-input"
                  placeholder="At least 6 characters"
                  className="mt-1 block w-full rounded-lg border border-cream-200 bg-white px-3 py-2 text-sm text-neutral-950 placeholder:text-neutral-400 focus:border-brand-700 focus:outline-none focus:ring-1 focus:ring-brand-700"
                />
              </div>
            </div>

            {/* Info display */}
            {info && (
              <p
                data-testid="auth-info"
                className="mt-3 text-sm text-green-700"
              >
                {info}
              </p>
            )}

            {/* Error display */}
            {error && (
              <div
                data-testid="auth-error"
                className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700"
              >
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              data-testid="auth-submit-btn"
              className="mt-4 w-full rounded-lg bg-brand-800 px-4 py-2.5 text-sm font-medium text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-brand-700 hover:shadow-md active:translate-y-0 disabled:pointer-events-none disabled:opacity-50"
            >
              {loading
                ? "Please wait..."
                : mode === "signin"
                  ? "Sign in"
                  : "Create account"}
            </button>
          </form>

          {/* Trust line — signup mode only */}
          {mode === "signup" && (
            <p className="mt-3 text-center text-xs text-neutral-500">
              No subscription. Free round history.
            </p>
          )}

          {/* Mode toggle */}
          <p className="mt-4 text-center text-sm text-neutral-600">
            {mode === "signin" ? (
              <>
                Don&apos;t have an account?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setMode("signup");
                    setError(null);
                  }}
                  data-testid="auth-toggle-mode"
                  className="font-medium text-brand-800 transition-colors hover:text-brand-600"
                >
                  Sign up
                </button>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setMode("signin");
                    setError(null);
                  }}
                  data-testid="auth-toggle-mode"
                  className="font-medium text-brand-800 transition-colors hover:text-brand-600"
                >
                  Sign in
                </button>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
