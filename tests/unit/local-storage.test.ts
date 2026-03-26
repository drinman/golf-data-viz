import { describe, it, expect, vi, afterEach } from "vitest";
import type { StoredRound, StoredAnonClaim } from "@/lib/golf/local-storage";

describe("local-storage", () => {
  const validRound: StoredRound = {
    input: {
      handicapIndex: 14,
      score: 86,
      courseRating: 72,
      slopeRating: 130,
      putts: 32,
      fairwaysHit: 7,
      fairwaysPossible: 14,
      greensInRegulation: 8,
      penalties: 1,
      eagles: 0,
      birdies: 1,
      pars: 8,
      bogeys: 6,
      doubles: 2,
      triplePlus: 1,
    } as StoredRound["input"],
    result: {} as StoredRound["result"],
    chartData: [],
    timestamp: new Date().toISOString(),
  };

  const validClaim: StoredAnonClaim = {
    roundId: "abc-123",
    claimToken: "tok-456",
    input: validRound.input,
    timestamp: new Date().toISOString(),
  };

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("readStoredRound", () => {
    it("returns parsed data when localStorage has valid stored round", async () => {
      const store: Record<string, string> = {
        "gdv:last-round": JSON.stringify(validRound),
      };
      vi.stubGlobal("localStorage", {
        getItem: (key: string) => store[key] ?? null,
        removeItem: (key: string) => { delete store[key]; },
        setItem: (key: string, val: string) => { store[key] = val; },
        clear: () => {},
        key: () => null,
        length: 0,
      });
      const { readStoredRound } = await import("@/lib/golf/local-storage");
      expect(readStoredRound()).not.toBeNull();
    });

    it("returns null without throwing when localStorage is completely unavailable", async () => {
      const throwStorage = {
        getItem: () => { throw new DOMException("Access denied", "SecurityError"); },
        removeItem: () => { throw new DOMException("Access denied", "SecurityError"); },
        setItem: () => { throw new DOMException("Access denied", "SecurityError"); },
        clear: () => {},
        key: () => null,
        length: 0,
      };
      vi.stubGlobal("localStorage", throwStorage);
      const { readStoredRound } = await import("@/lib/golf/local-storage");
      expect(() => readStoredRound()).not.toThrow();
      expect(readStoredRound()).toBeNull();
    });
  });

  describe("readStoredAnonClaim", () => {
    it("returns parsed data when localStorage has valid claim", async () => {
      const store: Record<string, string> = {
        "gdv:last-anon-claim": JSON.stringify(validClaim),
      };
      vi.stubGlobal("localStorage", {
        getItem: (key: string) => store[key] ?? null,
        removeItem: (key: string) => { delete store[key]; },
        setItem: (key: string, val: string) => { store[key] = val; },
        clear: () => {},
        key: () => null,
        length: 0,
      });
      const { readStoredAnonClaim } = await import("@/lib/golf/local-storage");
      expect(readStoredAnonClaim()).not.toBeNull();
    });

    it("returns null without throwing when localStorage is completely unavailable", async () => {
      const throwStorage = {
        getItem: () => { throw new DOMException("Access denied", "SecurityError"); },
        removeItem: () => { throw new DOMException("Access denied", "SecurityError"); },
        setItem: () => { throw new DOMException("Access denied", "SecurityError"); },
        clear: () => {},
        key: () => null,
        length: 0,
      };
      vi.stubGlobal("localStorage", throwStorage);
      const { readStoredAnonClaim } = await import("@/lib/golf/local-storage");
      expect(() => readStoredAnonClaim()).not.toThrow();
      expect(readStoredAnonClaim()).toBeNull();
    });
  });

  describe("writeStoredAnonClaim", () => {
    it("writes claim to localStorage", async () => {
      const store: Record<string, string> = {};
      vi.stubGlobal("localStorage", {
        getItem: (key: string) => store[key] ?? null,
        removeItem: (key: string) => { delete store[key]; },
        setItem: (key: string, val: string) => { store[key] = val; },
        clear: () => {},
        key: () => null,
        length: 0,
      });
      const { writeStoredAnonClaim } = await import("@/lib/golf/local-storage");
      writeStoredAnonClaim(validClaim);
      expect(store["gdv:last-anon-claim"]).toBeDefined();
      expect(JSON.parse(store["gdv:last-anon-claim"]).roundId).toBe("abc-123");
    });

    it("does not throw when localStorage is unavailable", async () => {
      vi.stubGlobal("localStorage", {
        getItem: () => { throw new DOMException("Access denied", "SecurityError"); },
        removeItem: () => { throw new DOMException("Access denied", "SecurityError"); },
        setItem: () => { throw new DOMException("Access denied", "SecurityError"); },
        clear: () => {},
        key: () => null,
        length: 0,
      });
      const { writeStoredAnonClaim } = await import("@/lib/golf/local-storage");
      expect(() => writeStoredAnonClaim(validClaim)).not.toThrow();
    });
  });

  describe("clearStoredAnonClaim", () => {
    it("removes claim from localStorage", async () => {
      const store: Record<string, string> = {
        "gdv:last-anon-claim": JSON.stringify(validClaim),
      };
      vi.stubGlobal("localStorage", {
        getItem: (key: string) => store[key] ?? null,
        removeItem: (key: string) => { delete store[key]; },
        setItem: (key: string, val: string) => { store[key] = val; },
        clear: () => {},
        key: () => null,
        length: 0,
      });
      const { clearStoredAnonClaim } = await import("@/lib/golf/local-storage");
      clearStoredAnonClaim();
      expect(store["gdv:last-anon-claim"]).toBeUndefined();
    });

    it("does not throw when localStorage is unavailable", async () => {
      vi.stubGlobal("localStorage", {
        getItem: () => { throw new DOMException("Access denied", "SecurityError"); },
        removeItem: () => { throw new DOMException("Access denied", "SecurityError"); },
        setItem: () => { throw new DOMException("Access denied", "SecurityError"); },
        clear: () => {},
        key: () => null,
        length: 0,
      });
      const { clearStoredAnonClaim } = await import("@/lib/golf/local-storage");
      expect(() => clearStoredAnonClaim()).not.toThrow();
    });
  });
});
