// @vitest-environment jsdom

import { describe, it, expect, afterEach, vi, beforeEach } from "vitest";
import {
  readStoredRound,
  readStoredAnonClaim,
  writeStoredAnonClaim,
  clearStoredAnonClaim,
  LAST_ROUND_KEY,
  LAST_ANON_CLAIM_KEY,
} from "@/lib/golf/local-storage";

// jsdom localStorage stub
const store: Record<string, string> = {};
const mockStorage = {
  getItem: vi.fn((key: string) => store[key] ?? null),
  setItem: vi.fn((key: string, val: string) => { store[key] = val; }),
  removeItem: vi.fn((key: string) => { delete store[key]; }),
  clear: vi.fn(() => { Object.keys(store).forEach(k => delete store[k]); }),
  get length() { return Object.keys(store).length; },
  key: vi.fn(() => null),
};

beforeEach(() => {
  Object.keys(store).forEach(k => delete store[k]);
  vi.clearAllMocks();
  vi.stubGlobal("localStorage", mockStorage);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("readStoredRound", () => {
  const sampleRound = {
    input: { course: "Pebble Beach", score: 87, handicapIndex: 14.3 },
    result: { totalSG: -1.2 },
    chartData: [{ category: "Putting", sg: -0.5 }],
    timestamp: new Date().toISOString(),
  };

  it("roundtrips serialization and deserialization", () => {
    store[LAST_ROUND_KEY] = JSON.stringify(sampleRound);
    const restored = readStoredRound();
    expect(restored).toEqual(sampleRound);
  });

  it("returns null when no stored round exists", () => {
    expect(readStoredRound()).toBeNull();
  });

  it("clears expired rounds (>30 days)", () => {
    const expired = {
      ...sampleRound,
      timestamp: new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString(),
    };
    store[LAST_ROUND_KEY] = JSON.stringify(expired);
    expect(readStoredRound()).toBeNull();
    expect(mockStorage.removeItem).toHaveBeenCalledWith(LAST_ROUND_KEY);
  });

  it("clears invalid JSON gracefully", () => {
    store[LAST_ROUND_KEY] = "not-json{{{";
    expect(readStoredRound()).toBeNull();
    expect(mockStorage.removeItem).toHaveBeenCalledWith(LAST_ROUND_KEY);
  });

  it("clears malformed objects (missing required fields)", () => {
    store[LAST_ROUND_KEY] = JSON.stringify({ foo: "bar" });
    expect(readStoredRound()).toBeNull();
    expect(mockStorage.removeItem).toHaveBeenCalledWith(LAST_ROUND_KEY);
  });
});

describe("stored anonymous claim helpers", () => {
  const sampleClaim = {
    roundId: "round-123",
    claimToken: "claim-abc",
    input: {
      course: "Pebble Beach",
      date: "2026-03-15",
      score: 87,
      handicapIndex: 14.3,
      courseRating: 72.1,
      slopeRating: 132,
      fairwayAttempts: 14,
      totalPutts: 33,
      penaltyStrokes: 2,
      eagles: 0,
      birdies: 1,
      pars: 7,
      bogeys: 7,
      doubleBogeys: 2,
      triplePlus: 1,
    },
    timestamp: new Date().toISOString(),
  };

  it("roundtrips anonymous claim storage", () => {
    writeStoredAnonClaim(sampleClaim);
    expect(readStoredAnonClaim()).toEqual(sampleClaim);
  });

  it("clears malformed anonymous claims", () => {
    store[LAST_ANON_CLAIM_KEY] = JSON.stringify({ roundId: "bad" });
    expect(readStoredAnonClaim()).toBeNull();
    expect(mockStorage.removeItem).toHaveBeenCalledWith(LAST_ANON_CLAIM_KEY);
  });

  it("clears expired anonymous claims", () => {
    store[LAST_ANON_CLAIM_KEY] = JSON.stringify({
      ...sampleClaim,
      timestamp: new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString(),
    });
    expect(readStoredAnonClaim()).toBeNull();
    expect(mockStorage.removeItem).toHaveBeenCalledWith(LAST_ANON_CLAIM_KEY);
  });

  it("removes the stored anonymous claim", () => {
    store[LAST_ANON_CLAIM_KEY] = JSON.stringify(sampleClaim);
    clearStoredAnonClaim();
    expect(store[LAST_ANON_CLAIM_KEY]).toBeUndefined();
  });
});
