import { vi } from "vitest";
import "@testing-library/jest-dom/vitest";

vi.mock("next/font/google", () => {
  const createMockFont = (prop: string) => (options?: { variable?: string }) => ({
    className: `mock-font-${prop.toLowerCase().replace(/_/g, "-")}`,
    variable:
      options?.variable ??
      `--${prop.toLowerCase().replace(/_/g, "-")}`,
  });

  const mockedModule = {
    __esModule: true as const,
    DM_Serif_Display: createMockFont("DM_Serif_Display"),
    DM_Sans: createMockFont("DM_Sans"),
    JetBrains_Mono: createMockFont("JetBrains_Mono"),
  };

  return new Proxy(mockedModule, {
    get(target, prop) {
      if (prop in target) {
        return target[prop as keyof typeof target];
      }

      if (typeof prop !== "string") {
        return undefined;
      }

      if (prop === "then" || prop === "catch" || prop === "finally") {
        return undefined;
      }

      return createMockFont(prop);
    },
  });
});

if (
  typeof HTMLElement !== "undefined" &&
  !HTMLElement.prototype.scrollIntoView
) {
  HTMLElement.prototype.scrollIntoView = () => {};
}
