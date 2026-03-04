import { expect, test } from "@playwright/test";

test("error boundary renders and logs to console on route error", async ({
  page,
}) => {
  const useProdServer = process.env.PLAYWRIGHT_USE_PROD_SERVER === "true";
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      errors.push(msg.text());
    }
  });

  await page.goto("/test-error");

  if (useProdServer) {
    // In production this route is intentionally disabled and returns 404.
    await expect(page.locator("text=Page not found")).toBeVisible({
      timeout: 5000,
    });
    return;
  }

  // Wait for error boundary UI to render (useEffect triggers throw → boundary catches)
  await expect(page.locator("text=Something went wrong")).toBeVisible({
    timeout: 5000,
  });
  await expect(page.locator("text=Try again")).toBeVisible();

  // Dev mode: logError passes the full error through to console.error.
  // This proves the boundary fires and wires to logError in a real browser.
  // Production sanitization (digest-only output) is covered by integration
  // tests in tests/unit/error-boundary-production.test.tsx.
  expect(errors.some((e) => e.includes("Test error for E2E"))).toBe(true);
});
