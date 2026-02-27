import { describe, it, expect } from "vitest";
import { encodeRound, decodeRound } from "@/lib/golf/share-codec";
import { makeRound } from "../fixtures/factories";
import type { RoundInput } from "@/lib/golf/types";

/**
 * URL rehydration tests — verify the decode-on-load logic that powers
 * shareable URLs. When page.tsx reads `?d=<payload>`, it calls
 * `decodeRound(payload)` and passes the result as `initialInput` to
 * the client component.
 */

describe("URL rehydration via decodeRound", () => {
  it("decodes a valid encoded round back to the original input", () => {
    const input = makeRound();
    const encoded = encodeRound(input);
    const decoded = decodeRound(encoded);

    expect(decoded).toEqual(input);
  });

  it("preserves all optional fields when present", () => {
    const input = makeRound({
      upAndDownAttempts: 8,
      upAndDownConverted: 4,
      sandSaveAttempts: 3,
      sandSaves: 1,
      threePutts: 2,
    });
    const encoded = encodeRound(input);
    const decoded = decodeRound(encoded);

    expect(decoded).toEqual(input);
    expect(decoded!.upAndDownAttempts).toBe(8);
    expect(decoded!.sandSaves).toBe(1);
    expect(decoded!.threePutts).toBe(2);
  });

  it("preserves round when optional fields are absent", () => {
    const input = makeRound();
    delete (input as Partial<RoundInput>).upAndDownAttempts;
    delete (input as Partial<RoundInput>).upAndDownConverted;
    delete (input as Partial<RoundInput>).sandSaves;
    delete (input as Partial<RoundInput>).sandSaveAttempts;
    delete (input as Partial<RoundInput>).threePutts;

    const encoded = encodeRound(input);
    const decoded = decodeRound(encoded);

    expect(decoded).not.toBeNull();
    expect(decoded!.course).toBe(input.course);
    expect(decoded!.score).toBe(input.score);
  });

  it("returns null for empty string", () => {
    expect(decodeRound("")).toBeNull();
  });

  it("returns null for tampered payload", () => {
    const encoded = encodeRound(makeRound());
    // Flip a character in the middle
    const tampered =
      encoded.slice(0, 10) + "XXXXXX" + encoded.slice(16);
    const decoded = decodeRound(tampered);

    // Either null (JSON parse fails) or null (Zod validation fails)
    expect(decoded).toBeNull();
  });

  it("returns null for truncated payload", () => {
    const encoded = encodeRound(makeRound());
    const truncated = encoded.slice(0, 20);

    expect(decodeRound(truncated)).toBeNull();
  });

  it("returns null for non-base64 string", () => {
    expect(decodeRound("not-a-valid-payload!!!")).toBeNull();
  });

  it("returns null for valid JSON but invalid RoundInput", () => {
    // Encode an object that is valid JSON but fails Zod validation
    const invalidData = { score: 999, course: "X" };
    const json = JSON.stringify(invalidData);
    const b64 = btoa(json)
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

    expect(decodeRound(b64)).toBeNull();
  });

  it("server page wrapper pattern: null searchParam yields null input", () => {
    // Simulates what page.tsx does when there's no ?d= param
    const payload = undefined;
    const initialInput = payload ? decodeRound(payload) : null;

    expect(initialInput).toBeNull();
  });

  it("server page wrapper pattern: valid searchParam yields RoundInput", () => {
    // Simulates what page.tsx does when ?d= has a valid encoded round
    const original = makeRound({ course: "Pebble Beach", score: 79 });
    const payload = encodeRound(original);
    const initialInput = payload ? decodeRound(payload) : null;

    expect(initialInput).not.toBeNull();
    expect(initialInput!.course).toBe("Pebble Beach");
    expect(initialInput!.score).toBe(79);
  });
});
