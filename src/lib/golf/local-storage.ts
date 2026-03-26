import type { RoundInput, StrokesGainedResult, RadarChartDatum } from "./types";

export const LAST_ROUND_KEY = "gdv:last-round";
export const LAST_ANON_CLAIM_KEY = "gdv:last-anon-claim";
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export interface StoredRound {
  input: RoundInput;
  result: StrokesGainedResult;
  chartData: RadarChartDatum[];
  timestamp: string;
}

export interface StoredAnonClaim {
  roundId: string;
  claimToken: string;
  input: RoundInput;
  timestamp: string;
}

export function readStoredRound(): StoredRound | null {
  try {
    const raw = localStorage.getItem(LAST_ROUND_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredRound;
    if (!parsed.timestamp || !parsed.input || !parsed.result || !parsed.chartData) {
      localStorage.removeItem(LAST_ROUND_KEY);
      return null;
    }
    const age = Date.now() - new Date(parsed.timestamp).getTime();
    if (age > MAX_AGE_MS) {
      localStorage.removeItem(LAST_ROUND_KEY);
      return null;
    }
    return parsed;
  } catch {
    try { localStorage.removeItem(LAST_ROUND_KEY); } catch { /* storage unavailable */ }
    return null;
  }
}

export function readStoredAnonClaim(): StoredAnonClaim | null {
  try {
    const raw = localStorage.getItem(LAST_ANON_CLAIM_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredAnonClaim;
    if (
      !parsed.timestamp ||
      !parsed.roundId ||
      !parsed.claimToken ||
      !parsed.input
    ) {
      localStorage.removeItem(LAST_ANON_CLAIM_KEY);
      return null;
    }
    const age = Date.now() - new Date(parsed.timestamp).getTime();
    if (age > MAX_AGE_MS) {
      localStorage.removeItem(LAST_ANON_CLAIM_KEY);
      return null;
    }
    return parsed;
  } catch {
    try { localStorage.removeItem(LAST_ANON_CLAIM_KEY); } catch { /* storage unavailable */ }
    return null;
  }
}

export function writeStoredAnonClaim(claim: StoredAnonClaim): void {
  try {
    localStorage.setItem(LAST_ANON_CLAIM_KEY, JSON.stringify(claim));
  } catch {
    // localStorage may be unavailable in some browsing contexts
  }
}

export function clearStoredAnonClaim(): void {
  try {
    localStorage.removeItem(LAST_ANON_CLAIM_KEY);
  } catch {
    // localStorage may be unavailable in some browsing contexts
  }
}
