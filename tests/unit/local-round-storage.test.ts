import { describe, it, expect, afterEach, vi, beforeEach } from "vitest";

interface StoredRound {
  input: Record<string, unknown>;
  result: Record<string, unknown>;
  chartData: Record<string, unknown>[];
  timestamp: string;
}

const STORAGE_KEY = "gdv:last-round";
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

// Minimal localStorage mock for node environment
let store: Record<string, string> = {};
const mockStorage = {
  getItem: vi.fn((key: string) => store[key] ?? null),
  setItem: vi.fn((key: string, val: string) => { store[key] = val; }),
  removeItem: vi.fn((key: string) => { delete store[key]; }),
  clear: vi.fn(() => { store = {}; }),
};

function readStoredRound(): StoredRound | null {
  try {
    const raw = mockStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredRound;
    if (!parsed.timestamp || !parsed.input || !parsed.result || !parsed.chartData) {
      mockStorage.removeItem(STORAGE_KEY);
      return null;
    }
    const age = Date.now() - new Date(parsed.timestamp).getTime();
    if (age > MAX_AGE_MS) {
      mockStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    mockStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

beforeEach(() => {
  store = {};
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("StoredRound localStorage", () => {
  const sampleRound: StoredRound = {
    input: { course: "Pebble Beach", score: 87, handicapIndex: 14.3 },
    result: { totalSG: -1.2 },
    chartData: [{ category: "Putting", sg: -0.5 }],
    timestamp: new Date().toISOString(),
  };

  it("roundtrips serialization and deserialization", () => {
    mockStorage.setItem(STORAGE_KEY, JSON.stringify(sampleRound));
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
    mockStorage.setItem(STORAGE_KEY, JSON.stringify(expired));
    expect(readStoredRound()).toBeNull();
    expect(mockStorage.removeItem).toHaveBeenCalledWith(STORAGE_KEY);
  });

  it("clears invalid JSON gracefully", () => {
    mockStorage.setItem(STORAGE_KEY, "not-json{{{");
    expect(readStoredRound()).toBeNull();
    expect(mockStorage.removeItem).toHaveBeenCalledWith(STORAGE_KEY);
  });

  it("clears malformed objects (missing required fields)", () => {
    mockStorage.setItem(STORAGE_KEY, JSON.stringify({ foo: "bar" }));
    expect(readStoredRound()).toBeNull();
    expect(mockStorage.removeItem).toHaveBeenCalledWith(STORAGE_KEY);
  });
});
