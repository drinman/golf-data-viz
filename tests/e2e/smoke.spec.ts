import { expect, test } from "@playwright/test";

test("home page renders landing headline and CTA", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("hero-headline")).toBeVisible();
  await expect(page.getByText("Free post-round benchmark")).toBeVisible();
  await expect(page.getByTestId("hero-cta")).toBeVisible();
});

test("CTA navigates to /strokes-gained", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("hero-cta").click();
  await expect(page).toHaveURL(/\/strokes-gained/);
});

test("how-it-works section is visible", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("how-it-works")).toBeVisible();
  // 3 steps
  const steps = page.getByTestId("how-it-works").locator("[data-testid^='step-']");
  await expect(steps).toHaveCount(3);
});

test("no Next.js starter content remains", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("text=To get started")).not.toBeVisible();
  await expect(page.locator("text=Deploy Now")).not.toBeVisible();
});

test("strokes-gained page loads", async ({ page }) => {
  await page.goto("/strokes-gained");
  await expect(page.locator("h1")).toContainText("Strokes Gained");
  await expect(
    page.getByText("This is a peer-compared SG proxy built from round-level inputs, not shot-level tracking.")
  ).toBeVisible();
  await expect(page.locator('button[type="submit"]')).toBeVisible();
});

test("dark-mode OS preference still renders light theme", async ({
  browser,
}) => {
  const context = await browser.newContext({
    colorScheme: "dark",
  });
  const page = await context.newPage();
  await page.goto("/");

  // Body background should remain white (not dark)
  const bgColor = await page.evaluate(() =>
    getComputedStyle(document.body).backgroundColor
  );
  // rgb(254, 252, 243) = brand cream-50 (#fefcf3)
  expect(bgColor).toBe("rgb(254, 252, 243)");

  // Hero headline should be readable (dark text on light bg)
  const headline = page.getByTestId("hero-headline");
  await expect(headline).toBeVisible();

  await context.close();
});

test("site header with logo and nav links visible on all pages", async ({
  page,
}) => {
  for (const path of ["/", "/strokes-gained", "/methodology"]) {
    await page.goto(path);
    await expect(page.getByTestId("site-header")).toBeVisible();
    await expect(
      page.getByRole("link", { name: /Golf Data Viz/i })
    ).toBeVisible();
  }
});

test("404 page shows branded not-found message", async ({ page }) => {
  await page.goto("/this-page-does-not-exist");
  await expect(page.getByText("Page not found")).toBeVisible();
  await expect(page.getByRole("link", { name: /Go Home/i })).toBeVisible();
  await expect(
    page.getByRole("link", { name: /Benchmark a Round/i })
  ).toBeVisible();
});

test("homepage metadata: OG defaults from layout", async ({ page }) => {
  await page.goto("/");
  const ogTitle = await page
    .locator('meta[property="og:title"]')
    .getAttribute("content");
  expect(ogTitle).toBe("Golf Data Viz");
  const twitterCard = await page
    .locator('meta[name="twitter:card"]')
    .getAttribute("content");
  expect(twitterCard).toBe("summary_large_image");
});

test("/strokes-gained (no params) metadata: page-specific OG", async ({
  page,
}) => {
  await page.goto("/strokes-gained");
  const ogTitle = await page
    .locator('meta[property="og:title"]')
    .getAttribute("content");
  expect(ogTitle).toBe("Strokes Gained Benchmarker");
  const ogUrl = await page
    .locator('meta[property="og:url"]')
    .getAttribute("content");
  expect(ogUrl).toContain("/strokes-gained");
  const twitterCard = await page
    .locator('meta[name="twitter:card"]')
    .getAttribute("content");
  expect(twitterCard).toBe("summary_large_image");
  const canonical = await page
    .locator('link[rel="canonical"]')
    .getAttribute("href");
  expect(canonical).toContain("/strokes-gained");
});

test("/methodology metadata: canonical points to /methodology", async ({
  page,
}) => {
  await page.goto("/methodology");
  const canonical = await page
    .locator('link[rel="canonical"]')
    .getAttribute("href");
  expect(canonical).toContain("/methodology");
});

test("robots.txt is publicly available", async ({ request }) => {
  const res = await request.get("/robots.txt");
  expect(res.status()).toBe(200);
  const body = await res.text();
  expect(body).toContain("User-Agent: *");
  expect(body).toContain("Sitemap: ");
});

test("sitemap.xml is publicly available", async ({ request }) => {
  const res = await request.get("/sitemap.xml");
  expect(res.status()).toBe(200);
  const body = await res.text();
  expect(body).toContain("<urlset");
  expect(body).toContain("<loc>");
  expect(body).toContain("/strokes-gained");
});
