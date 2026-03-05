// @vitest-environment jsdom

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

const { mockToPng, mockCaptureMonitoringException } = vi.hoisted(() => ({
  mockToPng: vi.fn(),
  mockCaptureMonitoringException: vi.fn(),
}));

vi.mock("html-to-image", () => ({
  toPng: mockToPng,
}));

vi.mock("@/lib/monitoring/sentry", () => ({
  captureMonitoringException: mockCaptureMonitoringException,
}));

import { captureElementAsPng } from "@/lib/capture";

const VALID_PNG_DATA_URL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO5X1b8AAAAASUVORK5CYII=";

describe("captureElementAsPng", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("returns a PNG blob when html-to-image succeeds", async () => {
    mockToPng.mockResolvedValue(VALID_PNG_DATA_URL);

    const blob = await captureElementAsPng(document.createElement("div"));

    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe("image/png");
    expect(blob.size).toBeGreaterThan(0);
    expect(mockCaptureMonitoringException).not.toHaveBeenCalled();
  });

  it("falls back and reports monitoring when data URL is malformed", async () => {
    mockToPng.mockResolvedValue("not-a-valid-data-url");

    const blob = await captureElementAsPng(document.createElement("div"));

    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe("image/png");
    expect(blob.size).toBeGreaterThan(0);
    expect(mockCaptureMonitoringException).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        source: "capture",
        code: "PNG_CAPTURE_FALLBACK",
      })
    );
  });

  it("falls back and reports monitoring when toPng rejects", async () => {
    mockToPng.mockRejectedValue(new Error("capture failed"));

    const blob = await captureElementAsPng(document.createElement("div"));

    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe("image/png");
    expect(blob.size).toBeGreaterThan(0);
    expect(mockCaptureMonitoringException).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        source: "capture",
        code: "PNG_CAPTURE_FALLBACK",
      })
    );
  });

  it("falls back and reports monitoring on timeout", async () => {
    vi.useFakeTimers();
    mockToPng.mockImplementation(() => new Promise<string>(() => {}));

    const pendingBlob = captureElementAsPng(document.createElement("div"));
    vi.advanceTimersByTime(5000);

    const blob = await pendingBlob;

    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe("image/png");
    expect(blob.size).toBeGreaterThan(0);
    expect(mockCaptureMonitoringException).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        source: "capture",
        code: "PNG_CAPTURE_FALLBACK",
      })
    );
  });
});
