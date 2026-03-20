import { downloadBlob } from "./capture";

/**
 * Share an image via native share sheet (iOS/Android) or fall back to download (desktop).
 * Returns "native" if shared via Web Share API, "download" if fell back to file download,
 * or "cancelled" if the user dismissed the native share sheet.
 */
export type ShareOutcome = "native" | "download" | "cancelled";

export async function shareImage(
  blob: Blob,
  filename: string,
  text?: string
): Promise<ShareOutcome> {
  const file = new File([blob], filename, { type: "image/png" });
  if (
    typeof navigator !== "undefined" &&
    navigator.canShare?.({ files: [file] })
  ) {
    try {
      await navigator.share({ files: [file], ...(text ? { text } : {}) });
      return "native";
    } catch (err) {
      // User dismissed the share sheet — not an error
      if (err instanceof DOMException && err.name === "AbortError") {
        return "cancelled";
      }
      throw err;
    }
  }
  downloadBlob(blob, filename);
  return "download";
}
