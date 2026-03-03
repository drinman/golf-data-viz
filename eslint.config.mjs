import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Playwright / Vitest output dirs
    "test-results/**",
    "playwright-report/**",
  ]),
  // Error boundaries must use logError() instead of raw console calls.
  // Covers all standard Next.js error boundary paths; update globs if
  // non-standard boundary filenames are introduced.
  {
    files: ["src/app/**/error.tsx", "src/app/**/global-error.tsx"],
    rules: {
      "no-console": "error",
    },
  },
]);

export default eslintConfig;
