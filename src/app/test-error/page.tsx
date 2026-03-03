import { notFound } from "next/navigation";
import { TestErrorThrower } from "./thrower";

/**
 * Test-only page that exercises the error boundary.
 * Used by E2E tests — not linked from any UI.
 *
 * Production: returns 404 (zero public surface).
 * Dev/test: renders a client component that throws, triggering the error boundary.
 */
export default function TestErrorPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }
  return <TestErrorThrower />;
}
