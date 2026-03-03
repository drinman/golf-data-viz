"use client";

/**
 * Test-only page that throws during render to exercise the error boundary.
 * Used by E2E tests — not linked from any UI.
 *
 * Server render returns null (safe for build); client hydration throws
 * immediately, triggering the nearest error boundary.
 */
export default function TestErrorPage() {
  if (typeof window !== "undefined") {
    throw new Error("Test error for E2E");
  }
  return null;
}
