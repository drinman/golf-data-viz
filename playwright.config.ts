import { defineConfig } from "@playwright/test";
import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

const useProdServer = process.env.PLAYWRIGHT_USE_PROD_SERVER === "true";
const skipWebServer = process.env.PLAYWRIGHT_SKIP_WEBSERVER === "true";
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000";
const vercelAutomationBypassSecret =
  process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
const extraHTTPHeaders = vercelAutomationBypassSecret
  ? {
      "x-vercel-protection-bypass": vercelAutomationBypassSecret,
      "x-vercel-set-bypass-cookie": "true",
    }
  : undefined;

export default defineConfig({
  testDir: "./tests/e2e",
  use: {
    baseURL,
    trace: "on-first-retry",
    extraHTTPHeaders,
  },
  projects: [
    {
      name: "functional",
      testIgnore: [/visual-regression\.spec\.ts/, /production-smoke\.spec\.ts/],
    },
    {
      name: "visual",
      testMatch: /visual-regression\.spec\.ts/,
      // Platform-agnostic snapshot names — locked Chromium args normalize rendering
      snapshotPathTemplate: "{snapshotDir}/{testFileDir}/{testFileName}-snapshots/{arg}{ext}",
      use: {
        browserName: "chromium",
        viewport: { width: 1280, height: 800 },
        deviceScaleFactor: 1,
        launchOptions: {
          args: ["--font-render-hinting=none", "--disable-skia-runtime-opts"],
        },
      },
    },
    {
      name: "production-chromium",
      testMatch: /production-smoke\.spec\.ts/,
      use: {
        browserName: "chromium",
      },
    },
    {
      name: "production-webkit",
      testMatch: /production-smoke\.spec\.ts/,
      use: {
        browserName: "webkit",
      },
    },
  ],
  webServer: skipWebServer
    ? undefined
    : {
        command: useProdServer
          ? "npm run start -- --hostname 127.0.0.1 --port 3000"
          : "npm run dev -- --hostname 127.0.0.1 --port 3000",
        url: "http://127.0.0.1:3000",
        reuseExistingServer: !useProdServer,
      },
});
