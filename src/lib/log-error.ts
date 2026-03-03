/**
 * Environment-aware error logger for Next.js error boundaries.
 *
 * Development/test: logs the full error object (message + stack trace).
 * Production: logs only the error digest (a safe, opaque identifier)
 * to avoid exposing internal details in the browser console.
 */
export function logError(error: Error & { digest?: string }): void {
  if (process.env.NODE_ENV === "production") {
    console.error(
      error.digest
        ? `Application error (digest: ${error.digest})`
        : "Application error",
    );
  } else {
    console.error(error);
  }
}
