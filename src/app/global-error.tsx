"use client";

import { DM_Sans, DM_Serif_Display } from "next/font/google";
import { useEffect } from "react";
import { logError } from "@/lib/log-error";
import "./globals.css";

const dmSerifDisplay = DM_Serif_Display({
  variable: "--font-dm-serif-display",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    logError(error);
  }, [error]);

  return (
    <html lang="en" className={`${dmSerifDisplay.variable} ${dmSans.variable}`}>
      <body className="bg-cream-50 font-sans antialiased">
        <main className="mx-auto max-w-3xl px-4 py-16 sm:py-24">
          <section className="rounded-md border border-amber-200 bg-amber-50 p-8 text-center shadow-sm">
            <h1 className="font-display text-2xl tracking-tight text-amber-700">
              Something went wrong
            </h1>
            <p className="mt-3 text-neutral-600">
              We hit an unexpected app error. Please try reloading.
            </p>
            <button
              type="button"
              onClick={reset}
              className="mt-6 inline-flex min-h-11 rounded-lg bg-brand-800 px-5 py-2.5 text-sm font-medium text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-brand-700 hover:shadow-md active:translate-y-0"
            >
              Try again
            </button>
          </section>
        </main>
      </body>
    </html>
  );
}
