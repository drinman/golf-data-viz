import { downloadBlob } from "./capture";

/**
 * Share an image via native share sheet (iOS/Android) or fall back to download (desktop).
 * Returns true if shared via native API, false if fell back to download.
 */
export async function shareImage(
  blob: Blob,
  filename: string,
  text?: string
): Promise<boolean> {
  const file = new File([blob], filename, { type: "image/png" });
  if (
    typeof navigator !== "undefined" &&
    navigator.canShare?.({ files: [file] })
  ) {
    await navigator.share({ files: [file], ...(text ? { text } : {}) });
    return true;
  }
  downloadBlob(blob, filename);
  return false;
}
