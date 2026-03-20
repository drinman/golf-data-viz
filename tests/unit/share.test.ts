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

  it("calls navigator.share with File when canShare returns true", async () => {
    const blob = new Blob(["fake-png"], { type: "image/png" });
    const mockShare = vi.fn().mockResolvedValue(undefined);
    const mockCanShare = vi.fn().mockReturnValue(true);

    vi.stubGlobal("navigator", {
      canShare: mockCanShare,
      share: mockShare,
    });

    const result = await shareImage(blob, "test.png", "Check this out");

    expect(result).toBe(true);
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

  it("falls back to downloadBlob when canShare returns false", async () => {
    const blob = new Blob(["fake-png"], { type: "image/png" });

    vi.stubGlobal("navigator", {
      canShare: vi.fn().mockReturnValue(false),
    });

    const result = await shareImage(blob, "fallback.png");

    expect(result).toBe(false);
    expect(mockDownloadBlob).toHaveBeenCalledWith(blob, "fallback.png");

    vi.unstubAllGlobals();
  });

  it("falls back to downloadBlob when canShare is undefined (older browsers)", async () => {
    const blob = new Blob(["fake-png"], { type: "image/png" });

    vi.stubGlobal("navigator", {});

    const result = await shareImage(blob, "old-browser.png");

    expect(result).toBe(false);
    expect(mockDownloadBlob).toHaveBeenCalledWith(blob, "old-browser.png");

    vi.unstubAllGlobals();
  });
});
