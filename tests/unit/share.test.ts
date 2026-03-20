import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockDownloadBlob } = vi.hoisted(() => ({
  mockDownloadBlob: vi.fn(),
}));

vi.mock("@/lib/capture", () => ({
  downloadBlob: mockDownloadBlob,
}));

import { shareImage } from "@/lib/share";

describe("shareImage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 'native' when navigator.share succeeds", async () => {
    const blob = new Blob(["fake-png"], { type: "image/png" });
    const mockShare = vi.fn().mockResolvedValue(undefined);
    const mockCanShare = vi.fn().mockReturnValue(true);

    vi.stubGlobal("navigator", {
      canShare: mockCanShare,
      share: mockShare,
    });

    const result = await shareImage(blob, "test.png", "Check this out");

    expect(result).toBe("native");
    expect(mockCanShare).toHaveBeenCalledWith({
      files: [expect.any(File)],
    });
    expect(mockShare).toHaveBeenCalledWith({
      files: [expect.any(File)],
      text: "Check this out",
    });
    expect(mockDownloadBlob).not.toHaveBeenCalled();

    // Verify the File was constructed correctly
    const sharedFile = mockShare.mock.calls[0][0].files[0];
    expect(sharedFile.name).toBe("test.png");
    expect(sharedFile.type).toBe("image/png");

    vi.unstubAllGlobals();
  });

  it("omits text from share payload when not provided", async () => {
    const blob = new Blob(["fake-png"], { type: "image/png" });
    const mockShare = vi.fn().mockResolvedValue(undefined);

    vi.stubGlobal("navigator", {
      canShare: vi.fn().mockReturnValue(true),
      share: mockShare,
    });

    await shareImage(blob, "test.png");

    expect(mockShare).toHaveBeenCalledWith({
      files: [expect.any(File)],
    });

    vi.unstubAllGlobals();
  });

  it("returns 'cancelled' when user dismisses share sheet (AbortError)", async () => {
    const blob = new Blob(["fake-png"], { type: "image/png" });
    const abortError = new DOMException("Share cancelled", "AbortError");

    vi.stubGlobal("navigator", {
      canShare: vi.fn().mockReturnValue(true),
      share: vi.fn().mockRejectedValue(abortError),
    });

    const result = await shareImage(blob, "test.png");

    expect(result).toBe("cancelled");
    expect(mockDownloadBlob).not.toHaveBeenCalled();

    vi.unstubAllGlobals();
  });

  it("re-throws non-AbortError from navigator.share", async () => {
    const blob = new Blob(["fake-png"], { type: "image/png" });
    const otherError = new Error("Some other failure");

    vi.stubGlobal("navigator", {
      canShare: vi.fn().mockReturnValue(true),
      share: vi.fn().mockRejectedValue(otherError),
    });

    await expect(shareImage(blob, "test.png")).rejects.toThrow("Some other failure");

    vi.unstubAllGlobals();
  });

  it("returns 'download' when canShare returns false", async () => {
    const blob = new Blob(["fake-png"], { type: "image/png" });

    vi.stubGlobal("navigator", {
      canShare: vi.fn().mockReturnValue(false),
    });

    const result = await shareImage(blob, "fallback.png");

    expect(result).toBe("download");
    expect(mockDownloadBlob).toHaveBeenCalledWith(blob, "fallback.png");

    vi.unstubAllGlobals();
  });

  it("returns 'download' when canShare is undefined (older browsers)", async () => {
    const blob = new Blob(["fake-png"], { type: "image/png" });

    vi.stubGlobal("navigator", {});

    const result = await shareImage(blob, "old-browser.png");

    expect(result).toBe("download");
    expect(mockDownloadBlob).toHaveBeenCalledWith(blob, "old-browser.png");

    vi.unstubAllGlobals();
  });
});
