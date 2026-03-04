"use client";

import { useEffect } from "react";
import { logError } from "@/lib/log-error";

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    logError(error);
  }, [error]);

  return (
    <html lang="en">
      <body className="antialiased">
        <main className="mx-auto max-w-2xl px-4 py-16 sm:py-24">
          <section className="rounded-xl border border-neutral-200 bg-white p-8 text-center shadow-sm">
            <h1 className="text-2xl font-bold text-neutral-950">
              Something went wrong
            </h1>
            <p className="mt-3 text-neutral-600">
              We hit an unexpected app error. Please try reloading.
            </p>
            <button
              type="button"
              onClick={reset}
              className="mt-6 inline-flex rounded-lg bg-brand-800 px-4 py-2 text-sm font-semibold text-white transition-all duration-200 hover:bg-brand-700"
            >
              Try again
            </button>
          </section>
        </main>
      </body>
    </html>
  );
}
