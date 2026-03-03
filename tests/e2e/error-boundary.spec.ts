import { expect, test } from "@playwright/test";

test("error boundary renders and logs to console on route error", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      errors.push(msg.text());
    }
  });

  await page.goto("/test-error");

  // Wait for error boundary UI to render (useEffect triggers throw → boundary catches)
  await expect(page.locator("text=Something went wrong")).toBeVisible({
    timeout: 5000,
  });
  await expect(page.locator("text=Try again")).toBeVisible();

  // Dev mode: logError passes the full error through to console.error.
  // This proves the boundary fires and wires to logError in a real browser.
  // Production sanitization (digest-only output) is covered by unit tests
  // in tests/unit/log-error.test.ts.
  expect(errors.some((e) => e.includes("Test error for E2E"))).toBe(true);
});
