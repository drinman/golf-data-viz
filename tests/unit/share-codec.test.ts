import { describe, it, expect } from "vitest";
import { encodeRound, decodeRound } from "@/lib/golf/share-codec";
import { makeRound } from "../fixtures/factories";

describe("share-codec", () => {
  describe("round-trip", () => {
    it("encode then decode returns identical input", () => {
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
    });

    it("preserves round when all optional fields are absent", () => {
      const input = makeRound();
      delete input.upAndDownAttempts;
      delete input.upAndDownConverted;
      delete input.sandSaveAttempts;
      delete input.sandSaves;
      delete input.threePutts;

      const encoded = encodeRound(input);
      const decoded = decodeRound(encoded);
      // Optional fields should be undefined (absent) after round-trip
      expect(decoded).toBeDefined();
      expect(decoded!.course).toBe(input.course);
      expect(decoded!.score).toBe(input.score);
      expect(decoded!.upAndDownAttempts).toBeUndefined();
      expect(decoded!.threePutts).toBeUndefined();
    });
  });

  describe("encodeRound", () => {
    it("returns a URL-safe string (no +, /, or =)", () => {
      const encoded = encodeRound(makeRound());
      expect(encoded).not.toMatch(/[+/=]/);
    });

    it("returns a non-empty string", () => {
      const encoded = encodeRound(makeRound());
      expect(encoded.length).toBeGreaterThan(0);
    });
  });

  describe("non-ASCII course names", () => {
    it("round-trips en-dash in course name", () => {
      const input = makeRound({ course: "TPC Sawgrass – Stadium" });
      const encoded = encodeRound(input);
      const decoded = decodeRound(encoded);
      expect(decoded).toEqual(input);
    });

    it("round-trips emoji in course name", () => {
      const input = makeRound({ course: "Pebble Beach ⛳🏌️" });
      const encoded = encodeRound(input);
      const decoded = decodeRound(encoded);
      expect(decoded).toEqual(input);
    });

    it("round-trips international characters", () => {
      const input = makeRound({ course: "Münchhausen Golfplatz" });
      const encoded = encodeRound(input);
      const decoded = decodeRound(encoded);
      expect(decoded).toEqual(input);
    });

    it("round-trips smart quotes", () => {
      const input = makeRound({ course: "The \u201COld\u201D Course" });
      const encoded = encodeRound(input);
      const decoded = decodeRound(encoded);
      expect(decoded).toEqual(input);
    });
  });

  describe("decodeRound – invalid payloads", () => {
    it("returns null for tampered payload", () => {
      const encoded = encodeRound(makeRound());
      // Flip some characters in the middle
      const tampered =
        encoded.slice(0, 10) + "XXXXXXXXXX" + encoded.slice(20);
      expect(decodeRound(tampered)).toBeNull();
    });

    it("returns null for truncated payload", () => {
      const encoded = encodeRound(makeRound());
      const truncated = encoded.slice(0, Math.floor(encoded.length / 2));
      expect(decodeRound(truncated)).toBeNull();
    });

    it("returns null for non-base64 string", () => {
      expect(decodeRound("not-valid-base64!!!@@@")).toBeNull();
    });

    it("returns null for empty string", () => {
      expect(decodeRound("")).toBeNull();
    });

    it("returns null for valid JSON that fails schema validation", () => {
      // Valid base64url of JSON with score out of range
      const invalidRound = { ...makeRound(), score: 999 };
      const json = JSON.stringify(invalidRound);
      const b64 = btoa(json).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
      expect(decodeRound(b64)).toBeNull();
    });

    it("returns null for valid base64url of non-JSON content", () => {
      const b64 = btoa("this is not json")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");
      expect(decodeRound(b64)).toBeNull();
    });
  });
});
