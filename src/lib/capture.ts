/**
 * DOM-to-image capture utilities for shareable PNG downloads.
 */

import { toPng } from "html-to-image";

/**
 * Capture a DOM element as a PNG blob.
 *
 * Uses html-to-image under the hood, which clones the element,
 * inlines styles, and renders to a canvas.
 */
export async function captureElementAsPng(
  element: HTMLElement
): Promise<Blob> {
  const dataUrl = await toPng(element, { pixelRatio: 2 });
  const res = await fetch(dataUrl);
  return res.blob();
}

/**
 * Trigger a file download from a Blob.
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  // Cleanup
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
}
