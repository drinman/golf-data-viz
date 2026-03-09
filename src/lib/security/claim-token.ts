/**
 * Claim token generation and hashing for anonymous round claiming.
 *
 * Uses Web Crypto API (crypto.subtle) for Edge-compatibility.
 * The raw token is returned to the client; only the SHA-256 hash is stored.
 */

const CLAIM_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Hash a claim token string with SHA-256.
 * Returns a 64-character lowercase hex string.
 */
export async function hashClaimToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(token));
  return toHex(new Uint8Array(hashBuffer));
}

/**
 * Generate a cryptographically random claim token with its SHA-256 hash and
 * an ISO-8601 expiry timestamp (30 days from now).
 */
export async function generateClaimToken(): Promise<{
  rawToken: string;
  hash: string;
  expiresAt: string;
}> {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  const rawToken = toHex(bytes);

  const hash = await hashClaimToken(rawToken);
  const expiresAt = new Date(Date.now() + CLAIM_TOKEN_TTL_MS).toISOString();

  return { rawToken, hash, expiresAt };
}
