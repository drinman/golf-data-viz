// @vitest-environment jsdom

import { describe, it, expect, vi, afterEach } from "vitest";
import { render, waitFor } from "@testing-library/react";

vi.mock("@/lib/log-error", () => ({
  logError: vi.fn(),
}));

import { logError } from "@/lib/log-error";
import ErrorPage from "@/app/error";
import GlobalError from "@/app/global-error";

describe("Error boundary wiring", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("ErrorPage calls logError with the error", async () => {
    const error = Object.assign(new Error("route error"), { digest: "r1" });
    const reset = vi.fn();

    render(<ErrorPage error={error} reset={reset} />);

    await waitFor(() => {
      expect(logError).toHaveBeenCalledWith(error);
    });
  });

  it("GlobalError calls logError with the error", async () => {
    // Only suppress the DOM nesting warning (<html> inside RTL's <div> container).
    // Other console.error calls pass through so real errors are not hidden.
    const original = console.error.bind(console);
    vi.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
      const msg = typeof args[0] === "string" ? args[0] : "";
      if (msg.includes("cannot be a child of")) return;
      if (msg.includes("validateDOMNesting")) return;
      original(...args);
    });

    const error = Object.assign(new Error("app error"), { digest: "g1" });
    const reset = vi.fn();

    render(<GlobalError error={error} reset={reset} />);

    await waitFor(() => {
      expect(logError).toHaveBeenCalledWith(error);
    });
  });
});
