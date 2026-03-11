import { test, expect, devices } from "@playwright/test";

test.use({ ...devices["iPhone 13"] });

test("mobile homepage nav opens and closes", async ({ page }) => {
  await page.goto("/");

  const toggle = page.getByTestId("mobile-nav-toggle");
  const panel = page.getByTestId("mobile-nav-panel");

  await expect(toggle).toBeVisible();
  await expect(panel).toHaveAttribute("data-state", "closed");

  await toggle.click();
  await expect(panel).toHaveAttribute("data-state", "open");

  await page.getByRole("link", { name: "History" }).click();
  await expect(panel).toHaveAttribute("data-state", "closed");
});

test("mobile homepage has no horizontal overflow at 320px", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto("/");

  const htmlWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  const viewportWidth = await page.evaluate(() => window.innerWidth);

  expect(htmlWidth).toBeLessThanOrEqual(viewportWidth);
  await expect(page.getByText("Golf Data Viz")).toBeVisible();
});

test("mobile panel surface reflects scroll state", async ({ page }) => {
  await page.goto("/");

  const toggle = page.getByTestId("mobile-nav-toggle");
  const header = page.getByTestId("site-header");

  await toggle.click();
  await expect(header).toHaveAttribute("data-scrolled", "false");

  await toggle.click();
  await page.evaluate(() => window.scrollTo(0, 32));
  await toggle.click();

  await expect(header).toHaveAttribute("data-scrolled", "true");
});

test("mobile user can submit a round and reach share actions", async ({
  page,
}) => {
  await page.goto("/strokes-gained");

  await page.fill('[name="handicapIndex"]', "14.3");
  await page.fill('[name="course"]', "Mobile Test Course");
  await page.fill('[name="courseRating"]', "72.0");
  await page.fill('[name="slopeRating"]', "130");
  await page.fill('[name="score"]', "87");
  await page.fill('[name="fairwaysHit"]', "7");
  await page.fill('[name="fairwayAttempts"]', "14");
  await page.fill('[name="greensInRegulation"]', "6");
  await page.fill('[name="totalPutts"]', "33");
  await page.fill('[name="penaltyStrokes"]', "2");
  await page.fill('[name="eagles"]', "0");
  await page.fill('[name="birdies"]', "1");
  await page.fill('[name="pars"]', "7");
  await page.fill('[name="bogeys"]', "7");
  await page.fill('[name="doubleBogeys"]', "2");
  await page.fill('[name="triplePlus"]', "1");

  await page.click('button[type="submit"]');

  await expect(page.getByText("Your Proxy SG Breakdown")).toBeVisible({
    timeout: 5000,
  });
  await expect(page.getByTestId("download-png")).toBeVisible();
  await expect(page.getByTestId("copy-link")).toBeVisible();
});
