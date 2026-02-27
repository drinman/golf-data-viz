/**
 * Share codec for encoding/decoding RoundInput to/from URL-safe strings.
 *
 * Encodes: RoundInput → JSON → base64url string (for query params)
 * Decodes: base64url string → JSON → Zod-validated RoundInput
 */

import type { RoundInput } from "./types";
import { roundInputSchema } from "./schemas";

/**
 * Encode a RoundInput as a URL-safe base64 string.
 *
 * JSON.stringify → btoa → replace +/= with URL-safe chars.
 * Payload is ~500 chars, well under the 2048-char URL limit.
 */
export function encodeRound(input: RoundInput): string {
  const json = JSON.stringify(input);
  const b64 = btoa(json);
  // Make URL-safe: + → -, / → _, strip trailing =
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/**
 * Decode a URL-safe base64 string back to a validated RoundInput.
 *
 * Returns null if the payload is invalid (tampered, truncated, or fails validation).
 */
export function decodeRound(payload: string): RoundInput | null {
  if (!payload) return null;

  try {
    // Restore base64 padding and standard chars
    let b64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    // Restore padding
    const pad = b64.length % 4;
    if (pad === 2) b64 += "==";
    else if (pad === 3) b64 += "=";

    const json = atob(b64);
    const parsed = JSON.parse(json);
    const result = roundInputSchema.safeParse(parsed);

    if (!result.success) return null;
    return result.data;
  } catch {
    return null;
  }
}
