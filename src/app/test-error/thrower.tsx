"use client";

/**
 * Client component that throws on hydration to trigger the error boundary.
 * Only rendered in dev/test — the parent server component gates production.
 */
export function TestErrorThrower() {
  if (typeof window !== "undefined") {
    throw new Error("Test error for E2E");
  }
  return null;
}
