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

  // In dev mode, logError logs the full error object.
  // Verify our test error message appears in console output.
  expect(errors.some((e) => e.includes("Test error for E2E"))).toBe(true);
});
