import type { RoundInput, StrokesGainedResult, RadarChartDatum } from "./types";

export const LAST_ROUND_KEY = "gdv:last-round";
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export interface StoredRound {
  input: RoundInput;
  result: StrokesGainedResult;
  chartData: RadarChartDatum[];
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
    localStorage.removeItem(LAST_ROUND_KEY);
    return null;
  }
}
