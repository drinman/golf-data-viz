"use client";

import { useState } from "react";
import { TrendingUp, LineChart, List } from "lucide-react";
import { AuthModal } from "@/components/auth/auth-modal";

const features = [
  {
    icon: TrendingUp,
    title: "Biggest Mover",
    description:
      "After 3+ rounds, see which part of your game is changing fastest — improving or declining.",
  },
  {
    icon: LineChart,
    title: "SG Trends Over Time",
    description:
      "Track Off the Tee, Approach, Around the Green, and Putting strokes gained across every round.",
  },
  {
    icon: List,
    title: "Round-by-Round Breakdown",
    description:
      "Review every round with course, score, date, and per-category SG bars at a glance.",
  },
] as const;

export function HistoryAuthPrompt() {
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signup");

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <div className="text-center">
        <h1 className="font-display text-3xl tracking-tight text-neutral-950">
          Round History
        </h1>
        <p className="mt-2 text-neutral-600">
          Your strokes gained performance over time.
        </p>
      </div>

      <div className="mt-10 grid gap-6 sm:grid-cols-3">
        {features.map((feature, i) => (
          <div
            key={feature.title}
            className="animate-fade-up rounded-xl border border-card-border bg-card p-5 shadow-sm"
            style={{ animationDelay: `${(i + 1) * 100}ms` }}
          >
            <div className="inline-flex rounded-lg bg-cream-100 p-2 text-accent-500">
              <feature.icon className="h-5 w-5" />
            </div>
            <h2 className="mt-3 font-display text-base font-semibold text-neutral-950">
              {feature.title}
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-neutral-600">
              {feature.description}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-10 text-center">
        <p className="mb-4 text-sm text-neutral-600">
          Benchmark a round for free, save it, then track what changes over time.
        </p>
        <button
          type="button"
          data-testid="auth-prompt-sign-in"
          onClick={() => { setAuthMode("signup"); setAuthOpen(true); }}
          className="rounded-lg bg-brand-800 px-6 py-2.5 text-sm font-medium text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-brand-700 hover:shadow-md active:translate-y-0"
        >
          Create free account to start tracking
        </button>
        <p className="mt-3 text-xs text-neutral-500">
          Already have an account?{" "}
          <button
            type="button"
            data-testid="auth-prompt-sign-in-link"
            onClick={() => { setAuthMode("signin"); setAuthOpen(true); }}
            className="underline hover:text-neutral-700"
          >
            Sign in
          </button>
        </p>
      </div>

      {authOpen && (
        <AuthModal
          open={authOpen}
          initialMode={authMode}
          onClose={() => setAuthOpen(false)}
          onSuccess={() => {
            setAuthOpen(false);
            window.location.reload();
          }}
        />
      )}
    </main>
  );
}
