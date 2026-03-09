"use client";

import { useState } from "react";
import { AuthModal } from "@/components/auth/auth-modal";

export function HistoryAuthPrompt() {
  const [authOpen, setAuthOpen] = useState(false);

  return (
    <main className="mx-auto max-w-2xl px-4 py-16">
      <div className="rounded-xl border border-card-border bg-card p-8 text-center shadow-sm">
        <h1 className="font-display text-3xl tracking-tight text-neutral-950">
          Track Your Progress Over Time
        </h1>
        <p className="mx-auto mt-4 max-w-md text-neutral-600">
          Sign in to save rounds and see how your strokes gained changes over
          time. Spot trends, find your biggest mover, and know where practice is
          paying off.
        </p>
        <button
          type="button"
          data-testid="auth-prompt-sign-in"
          onClick={() => setAuthOpen(true)}
          className="mt-6 rounded-lg bg-brand-800 px-6 py-2.5 text-sm font-medium text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-brand-700 hover:shadow-md active:translate-y-0"
        >
          Sign in to get started
        </button>
        <p className="mt-3 text-xs text-neutral-500">
          Free account. No credit card required.
        </p>
      </div>
      {authOpen && (
        <AuthModal
          open={authOpen}
          onClose={() => setAuthOpen(false)}
          onSuccess={() => {
            setAuthOpen(false);
            // Page will re-render server-side with user data
            window.location.reload();
          }}
        />
      )}
    </main>
  );
}
