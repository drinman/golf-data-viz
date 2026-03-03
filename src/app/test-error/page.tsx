"use client";

/**
 * Test-only page that throws during render to exercise the error boundary.
 * Used by E2E tests — not linked from any UI.
 *
 * Production: renders an inert message (no throw, no monitoring noise).
 * Dev/test: throws on client hydration, triggering the nearest error boundary.
 */
export default function TestErrorPage() {
  if (process.env.NODE_ENV === "production") {
    return <p>Test route — no error in production.</p>;
  }
  if (typeof window !== "undefined") {
    throw new Error("Test error for E2E");
  }
  return null;
}
