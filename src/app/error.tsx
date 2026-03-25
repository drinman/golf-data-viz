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
    <main className="bg-cream-50">
      <div className="mx-auto max-w-3xl px-4 py-16 sm:py-24">
        <section className="rounded-md border border-amber-200 bg-amber-50 p-8 text-center shadow-sm">
          <h1 className="font-display text-2xl tracking-tight text-amber-700">Something went wrong</h1>
          <p className="mt-3 text-neutral-600">
            We hit an unexpected error while loading this page.
          </p>
          <button
            type="button"
            onClick={reset}
            className="mt-6 inline-flex min-h-11 rounded-lg bg-brand-800 px-5 py-2.5 text-sm font-medium text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-brand-700 hover:shadow-md active:translate-y-0"
          >
            Try again
          </button>
        </section>
      </div>
    </main>
  );
}
