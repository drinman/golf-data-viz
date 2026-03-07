import { describe, it, expect } from "vitest";
import {
  getBenchmarkMeta,
  getCitationStatus,
  loadBrackets,
} from "@/lib/golf/benchmarks";
import rawData from "@/data/benchmarks/handicap-brackets.json";

/**
 * CI gate: every metric consumed by the SG engine must have non-pending
 * citation status. This prevents unsourced values from leaking into the
 * calculation path.
 */
const SG_CONSUMED_METRICS = [
  "averageScore",
  "fairwayPercentage",
  "girPercentage",
  "puttsPerRound",
  "upAndDownPercentage",
  "penaltiesPerRound",
] as const;

describe("benchmark source lock", () => {
  const meta = getBenchmarkMeta();

  for (const metric of SG_CONSUMED_METRICS) {
    it(`${metric} is not pending (has citation coverage)`, () => {
      const status = getCitationStatus(meta.citations[metric]);
      expect(status).not.toBe("pending");
    });
  }
});

/**
 * CI gate: anchor values and their corresponding bracket values must stay
 * in sync for the 6 shared metrics. Catches silent drift if one data
 * structure is updated without the other.
 */
const ANCHOR_TO_BRACKET: Record<number, string> = {
  0: "0-5",
  5: "5-10",
  10: "10-15",
  15: "15-20",
  20: "20-25",
  25: "25-30",
  30: "30+",
};

describe("anchor ↔ bracket sync", () => {
  const anchors = (rawData as { anchors: Array<Record<string, number>> }).anchors;
  const brackets = loadBrackets();

  for (const anchor of anchors) {
    const bracketLabel = ANCHOR_TO_BRACKET[anchor.handicapIndex];
    if (!bracketLabel) continue;

    const bracket = brackets.find((b) => b.bracket === bracketLabel);
    if (!bracket) continue;

    for (const metric of SG_CONSUMED_METRICS) {
      it(`anchor ${anchor.handicapIndex} ↔ bracket "${bracketLabel}": ${metric} matches`, () => {
        expect(anchor[metric]).toBeCloseTo(
          bracket[metric as keyof typeof bracket] as number,
          5
        );
      });
    }
  }
});
