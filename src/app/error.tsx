"use client";

import { useEffect } from "react";
import { logError } from "@/lib/log-error";

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    logError(error);
  }, [error]);

  return (
    <main className="mx-auto max-w-2xl px-4 py-16 sm:py-24">
      <section className="rounded-xl border border-card-border bg-card p-8 text-center shadow-sm">
        <h1 className="font-display text-2xl tracking-tight text-neutral-950">Something went wrong</h1>
        <p className="mt-3 text-neutral-600">
          We hit an unexpected error while loading this page.
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-6 inline-flex rounded-lg bg-brand-800 px-4 py-2 text-sm font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-brand-700 hover:shadow-md active:translate-y-0"
        >
          Try again
        </button>
      </section>
    </main>
  );
}
