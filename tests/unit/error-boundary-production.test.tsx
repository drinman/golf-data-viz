// @vitest-environment jsdom

import { describe, it, expect, vi, afterEach } from "vitest";
import { render, waitFor } from "@testing-library/react";

// No vi.mock — uses the real logError so we can verify end-to-end
// from boundary render → logError → sanitized console.error output.
import ErrorPage from "@/app/error";
import GlobalError from "@/app/global-error";

describe("Error boundary production logging (integration)", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("ErrorPage logs only the digest in production, not the error message", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    const error = Object.assign(new Error("Secret internal details"), {
      digest: "abc123",
    });

    render(<ErrorPage error={error} reset={vi.fn()} />);

    await waitFor(() => {
      expect(spy).toHaveBeenCalledWith("Application error (digest: abc123)");
    });

    // Verify no call contains the raw error message
    for (const call of spy.mock.calls) {
      const logged = String(call[0]);
      expect(logged).not.toContain("Secret internal details");
    }
  });

  it("GlobalError logs only the digest in production, not the error message", async () => {
    vi.stubEnv("NODE_ENV", "production");
    // Suppress DOM nesting warning + capture production logError output
    const logged: unknown[][] = [];
    vi.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
      const msg = typeof args[0] === "string" ? args[0] : "";
      if (msg.includes("cannot be a child of") || msg.includes("validateDOMNesting")) {
        return;
      }
      logged.push(args);
    });

    const error = Object.assign(new Error("Secret internal details"), {
      digest: "xyz789",
    });

    render(<GlobalError error={error} reset={vi.fn()} />);

    await waitFor(() => {
      expect(logged.length).toBeGreaterThan(0);
    });

    // Verify sanitized output
    expect(logged[0][0]).toBe("Application error (digest: xyz789)");

    // Verify no call leaks the raw error message
    for (const call of logged) {
      expect(String(call[0])).not.toContain("Secret internal details");
    }
  });
});
