/**
 * Share codec for encoding/decoding RoundInput to/from URL-safe strings.
 *
 * Encodes: RoundInput → JSON → UTF-8 bytes → base64url string (for query params)
 * Decodes: base64url string → UTF-8 bytes → JSON → Zod-validated RoundInput
 *
 * Uses TextEncoder/TextDecoder so non-ASCII course names (en-dashes,
 * emoji, international characters) encode safely — btoa alone would throw.
 */

import type { RoundInput } from "./types";
import { roundInputSchema } from "./schemas";

const B64_CHARS =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

/** Encode a Uint8Array to a base64url string (no padding). */
function bytesToBase64url(bytes: Uint8Array): string {
  let result = "";
  const len = bytes.length;
  for (let i = 0; i < len; i += 3) {
    const b0 = bytes[i];
    const b1 = i + 1 < len ? bytes[i + 1] : 0;
    const b2 = i + 2 < len ? bytes[i + 2] : 0;
    result += B64_CHARS[(b0 >> 2) & 0x3f];
    result += B64_CHARS[((b0 << 4) | (b1 >> 4)) & 0x3f];
    if (i + 1 < len) result += B64_CHARS[((b1 << 2) | (b2 >> 6)) & 0x3f];
    if (i + 2 < len) result += B64_CHARS[b2 & 0x3f];
  }
  return result;
}

/** Decode a base64url string (no padding) to a Uint8Array. */
function base64urlToBytes(str: string): Uint8Array {
  const lookup = new Uint8Array(128);
  for (let i = 0; i < B64_CHARS.length; i++) lookup[B64_CHARS.charCodeAt(i)] = i;

  // Compute output length accounting for missing padding
  const rawLen = Math.floor((str.length * 3) / 4);
  const bytes = new Uint8Array(rawLen);
  let j = 0;
  for (let i = 0; i < str.length; i += 4) {
    const c0 = lookup[str.charCodeAt(i)];
    const c1 = i + 1 < str.length ? lookup[str.charCodeAt(i + 1)] : 0;
    const c2 = i + 2 < str.length ? lookup[str.charCodeAt(i + 2)] : 0;
    const c3 = i + 3 < str.length ? lookup[str.charCodeAt(i + 3)] : 0;
    bytes[j++] = ((c0 << 2) | (c1 >> 4)) & 0xff;
    if (i + 2 < str.length) bytes[j++] = ((c1 << 4) | (c2 >> 2)) & 0xff;
    if (i + 3 < str.length) bytes[j++] = ((c2 << 6) | c3) & 0xff;
  }
  return bytes.subarray(0, j);
}

/**
 * Encode a RoundInput as a URL-safe base64 string.
 *
 * JSON → UTF-8 bytes → base64url (no padding).
 * Payload is ~500 chars, well under the 2048-char URL limit.
 */
export function encodeRound(input: RoundInput): string {
  const json = JSON.stringify(input);
  const bytes = new TextEncoder().encode(json);
  return bytesToBase64url(bytes);
}

/**
 * Decode a URL-safe base64 string back to a validated RoundInput.
 *
 * Returns null if the payload is invalid (tampered, truncated, or fails validation).
 */
export function decodeRound(payload: string): RoundInput | null {
  if (!payload) return null;

  try {
    const bytes = base64urlToBytes(payload);
    const json = new TextDecoder().decode(bytes);
    const parsed = JSON.parse(json);
    const result = roundInputSchema.safeParse(parsed);

    if (!result.success) return null;
    return result.data;
  } catch {
    return null;
  }
}
