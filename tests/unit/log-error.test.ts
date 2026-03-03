import { describe, it, expect, vi, afterEach } from "vitest";
import { logError } from "@/lib/log-error";

describe("logError", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("logs the full error object in development", () => {
    vi.stubEnv("NODE_ENV", "development");
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const error = new Error("Something broke");

    logError(error);

    expect(spy).toHaveBeenCalledWith(error);
  });

  it("logs only the digest in production when digest is present", () => {
    vi.stubEnv("NODE_ENV", "production");
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const error = Object.assign(new Error("Secret internal details"), {
      digest: "abc123",
    });

    logError(error);

    expect(spy).toHaveBeenCalledWith("Application error (digest: abc123)");
  });

  it("logs a generic message in production when digest is absent", () => {
    vi.stubEnv("NODE_ENV", "production");
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const error = new Error("Secret internal details");

    logError(error);

    expect(spy).toHaveBeenCalledWith("Application error");
  });

  it("does not leak error message or stack in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const error = Object.assign(
      new Error("Secret DB connection string leaked"),
      { digest: "xyz789" },
    );

    logError(error);

    const loggedValue = spy.mock.calls[0][0];
    expect(loggedValue).not.toContain("Secret DB connection string leaked");
    expect(typeof loggedValue).toBe("string");
  });

  it("logs the full error in test environment", () => {
    vi.stubEnv("NODE_ENV", "test");
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const error = new Error("Test error");

    logError(error);

    expect(spy).toHaveBeenCalledWith(error);
  });
});
