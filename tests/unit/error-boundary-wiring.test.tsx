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
    // Suppress DOM nesting warning (<html> inside RTL's <div> container)
    vi.spyOn(console, "error").mockImplementation(() => {});

    const error = Object.assign(new Error("app error"), { digest: "g1" });
    const reset = vi.fn();

    render(<GlobalError error={error} reset={reset} />);

    await waitFor(() => {
      expect(logError).toHaveBeenCalledWith(error);
    });
  });
});
