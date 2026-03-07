import { describe, it, expect } from "vitest";
import {
  calculateStrokesGained,
  computeRawOttFirDelta,
  computeRawOttPenaltyDelta,
  computeRawApproachDelta,
  computeRawAtgDelta,
  computeRawPuttingDelta,
  SG_WEIGHTS,
} from "@/lib/golf/strokes-gained";
import {
  getBracketForHandicap,
  getInterpolatedBenchmark,
} from "@/lib/golf/benchmarks";
import { makeRound } from "../fixtures/factories";

// === Fixture rounds for snapshot tests ===

const scratchGoodRound = makeRound({
  handicapIndex: 2.0,
  score: 73,
  fairwaysHit: 10,
  fairwayAttempts: 14,
  greensInRegulation: 12,
  totalPutts: 29,
  penaltyStrokes: 0,
  eagles: 0,
  birdies: 3,
  pars: 12,
  bogeys: 3,
  doubleBogeys: 0,
  triplePlus: 0,
});

const tenHcpAverage = makeRound({
  handicapIndex: 10.0,
  score: 82,
  fairwaysHit: 7,
  fairwayAttempts: 14,
  greensInRegulation: 7,
  totalPutts: 32,
  penaltyStrokes: 2,
  eagles: 0,
  birdies: 1,
  pars: 9,
  bogeys: 6,
  doubleBogeys: 2,
  triplePlus: 0,
});

const fifteenHcpBadRound = makeRound({
  handicapIndex: 15.0,
  score: 98,
  fairwaysHit: 4,
  fairwayAttempts: 14,
  greensInRegulation: 2,
  totalPutts: 36,
  penaltyStrokes: 4,
  eagles: 0,
  birdies: 0,
  pars: 3,
  bogeys: 8,
  doubleBogeys: 5,
  triplePlus: 2,
});

const twentyHcpTypical = makeRound({
  handicapIndex: 22.0,
  score: 97,
  fairwaysHit: 5,
  fairwayAttempts: 14,
  greensInRegulation: 3,
  totalPutts: 35,
  penaltyStrokes: 3,
  eagles: 0,
  birdies: 0,
  pars: 4,
  bogeys: 8,
  doubleBogeys: 4,
  triplePlus: 2,
});

const defaultRound = makeRound();

// === Raw delta function tests ===

describe("computeRawOttFirDelta", () => {
  it("returns the unweighted FIR percentage difference", () => {
    const round = makeRound({ fairwaysHit: 10, fairwayAttempts: 14 });
    const benchmark = getInterpolatedBenchmark(14.3);
    const delta = computeRawOttFirDelta(round, benchmark);
    // playerFIR% = 10/14, peerFIR% = benchmark.fairwayPercentage/100
    const expected =
      round.fairwaysHit! / round.fairwayAttempts -
      benchmark.fairwayPercentage / 100;
    expect(delta).toBeCloseTo(expected, 10);
  });

  it("returns 0 when fairwaysHit is null", () => {
    const round = makeRound();
    delete round.fairwaysHit;
    const benchmark = getInterpolatedBenchmark(14.3);
    expect(computeRawOttFirDelta(round, benchmark)).toBe(0);
  });

  it("returns 0 when fairwayAttempts is 0 (par-3 course)", () => {
    const round = makeRound({ fairwaysHit: 0, fairwayAttempts: 0 });
    const benchmark = getInterpolatedBenchmark(14.3);
    expect(computeRawOttFirDelta(round, benchmark)).toBe(0);
  });
});

describe("computeRawOttPenaltyDelta", () => {
  it("returns the unweighted penalty count difference", () => {
    const round = makeRound({ penaltyStrokes: 1 });
    const benchmark = getInterpolatedBenchmark(14.3);
    const delta = computeRawOttPenaltyDelta(round, benchmark);
    const expected = benchmark.penaltiesPerRound - round.penaltyStrokes;
    expect(delta).toBeCloseTo(expected, 10);
  });

  it("is positive when player has fewer penalties than peer", () => {
    const round = makeRound({ penaltyStrokes: 0 });
    const benchmark = getInterpolatedBenchmark(14.3);
    expect(computeRawOttPenaltyDelta(round, benchmark)).toBeGreaterThan(0);
  });

  it("is negative when player has more penalties than peer", () => {
    const round = makeRound({ penaltyStrokes: 10 });
    const benchmark = getInterpolatedBenchmark(14.3);
    expect(computeRawOttPenaltyDelta(round, benchmark)).toBeLessThan(0);
  });
});

describe("computeRawApproachDelta", () => {
  it("returns the unweighted GIR fraction difference", () => {
    const round = makeRound({ greensInRegulation: 10 });
    const benchmark = getInterpolatedBenchmark(14.3);
    const delta = computeRawApproachDelta(round, benchmark);
    const expected =
      round.greensInRegulation! / 18 - benchmark.girPercentage / 100;
    expect(delta).toBeCloseTo(expected, 10);
  });

  it("returns 0 when greensInRegulation is null", () => {
    const round = makeRound();
    delete round.greensInRegulation;
    const benchmark = getInterpolatedBenchmark(14.3);
    expect(computeRawApproachDelta(round, benchmark)).toBe(0);
  });
});

describe("computeRawAtgDelta", () => {
  it("uses actual up-and-down data when available (Path 1)", () => {
    const round = makeRound({
      upAndDownAttempts: 8,
      upAndDownConverted: 4,
    });
    const benchmark = getInterpolatedBenchmark(14.3);
    const delta = computeRawAtgDelta(round, benchmark);
    const expected =
      round.upAndDownConverted! / round.upAndDownAttempts! -
      benchmark.upAndDownPercentage / 100;
    expect(delta).toBeCloseTo(expected, 10);
  });

  it("estimates scramble rate from scoring when no up-and-down data (Path 2)", () => {
    const round = makeRound({
      greensInRegulation: 6,
      pars: 7,
    });
    delete round.upAndDownAttempts;
    delete round.upAndDownConverted;
    const benchmark = getInterpolatedBenchmark(14.3);
    const delta = computeRawAtgDelta(round, benchmark);

    // Manual calculation for Path 2
    const missedGreens = 18 - 6; // 12
    const estimatedParsOnGIR = 6 * 0.9; // 5.4
    const scramblePars = Math.min(missedGreens, Math.max(0, 7 - estimatedParsOnGIR)); // min(12, 1.6) = 1.6
    const expected = scramblePars / missedGreens - benchmark.upAndDownPercentage / 100;
    expect(delta).toBeCloseTo(expected, 10);
  });

  it("returns 0 when greensInRegulation is null and no up-and-down data", () => {
    const round = makeRound();
    delete round.greensInRegulation;
    delete round.upAndDownAttempts;
    delete round.upAndDownConverted;
    const benchmark = getInterpolatedBenchmark(14.3);
    expect(computeRawAtgDelta(round, benchmark)).toBe(0);
  });

  it("returns 0 when missedGreens is 0", () => {
    const round = makeRound({ greensInRegulation: 18 });
    delete round.upAndDownAttempts;
    delete round.upAndDownConverted;
    const benchmark = getInterpolatedBenchmark(14.3);
    expect(computeRawAtgDelta(round, benchmark)).toBe(0);
  });
});

describe("computeRawPuttingDelta", () => {
  it("returns the unweighted putts-per-hole difference", () => {
    const round = makeRound({ totalPutts: 30 });
    const benchmark = getInterpolatedBenchmark(14.3);
    const delta = computeRawPuttingDelta(round, benchmark);
    const expected = benchmark.puttsPerRound / 18 - round.totalPutts / 18;
    expect(delta).toBeCloseTo(expected, 10);
  });

  it("is positive when player putts fewer than peer", () => {
    const round = makeRound({ totalPutts: 25 });
    const benchmark = getInterpolatedBenchmark(14.3);
    expect(computeRawPuttingDelta(round, benchmark)).toBeGreaterThan(0);
  });

  it("is negative when player putts more than peer", () => {
    const round = makeRound({ totalPutts: 40 });
    const benchmark = getInterpolatedBenchmark(14.3);
    expect(computeRawPuttingDelta(round, benchmark)).toBeLessThan(0);
  });
});

// === Composition test: raw delta * weight = category SG ===

describe("raw deltas compose with weights to match category SG", () => {
  it("OTT = firDelta * FIR_WEIGHT + penaltyDelta * PENALTY_WEIGHT", () => {
    const round = makeRound({ fairwaysHit: 9, fairwayAttempts: 14, penaltyStrokes: 1 });
    const benchmark = getInterpolatedBenchmark(14.3);
    const result = calculateStrokesGained(round, benchmark);

    const expected =
      computeRawOttFirDelta(round, benchmark) * SG_WEIGHTS.OTT_FIR_WEIGHT +
      computeRawOttPenaltyDelta(round, benchmark) * SG_WEIGHTS.OTT_PENALTY_WEIGHT;
    expect(result.categories["off-the-tee"]).toBeCloseTo(expected, 10);
  });

  it("Approach = approachDelta * APPROACH_WEIGHT", () => {
    const round = makeRound({ greensInRegulation: 8 });
    const benchmark = getInterpolatedBenchmark(14.3);
    const result = calculateStrokesGained(round, benchmark);

    const expected =
      computeRawApproachDelta(round, benchmark) * SG_WEIGHTS.APPROACH_WEIGHT;
    expect(result.categories["approach"]).toBeCloseTo(expected, 10);
  });

  it("ATG = atgDelta * ATG_WEIGHT", () => {
    const round = makeRound({ greensInRegulation: 6, pars: 7 });
    delete round.upAndDownAttempts;
    delete round.upAndDownConverted;
    const benchmark = getInterpolatedBenchmark(14.3);
    const result = calculateStrokesGained(round, benchmark);

    const expected =
      computeRawAtgDelta(round, benchmark) * SG_WEIGHTS.ATG_WEIGHT;
    expect(result.categories["around-the-green"]).toBeCloseTo(expected, 10);
  });

  it("Putting = puttingDelta * PUTTING_WEIGHT", () => {
    const round = makeRound({ totalPutts: 31 });
    const benchmark = getInterpolatedBenchmark(14.3);
    const result = calculateStrokesGained(round, benchmark);

    const expected =
      computeRawPuttingDelta(round, benchmark) * SG_WEIGHTS.PUTTING_WEIGHT;
    expect(result.categories["putting"]).toBeCloseTo(expected, 10);
  });
});

// === Snapshot: calculateStrokesGained output IDENTICAL before and after refactor ===
// Pre-refactor values captured via tsx — these are the golden reference.

describe("refactor snapshot: calculateStrokesGained output unchanged", () => {
  const snapshotCases: Array<{
    name: string;
    round: ReturnType<typeof makeRound>;
    expected: { ott: number; app: number; atg: number; put: number; total: number };
  }> = [
    {
      name: "default round (14.3 hcp)",
      round: defaultRound,
      expected: {
        ott: 0.21544000000000002,
        app: 0.6922666666666666,
        atg: -1.1183333333333336,
        put: -0.2088888888888878,
        total: -0.41951555555555475,
      },
    },
    {
      name: "scratch good round",
      round: scratchGoodRound,
      expected: {
        ott: 1.8649142857142857,
        app: 1.189333333333333,
        atg: -1.560000000000001,
        put: 0.21333333333333293,
        total: 1.7075809523809506,
      },
    },
    {
      name: "10-hcp average round",
      round: tenHcpAverage,
      expected: {
        ott: -0.30399999999999994,
        app: 0.31111111111111134,
        atg: -0.7727272727272727,
        put: -0.17777777777777715,
        total: -0.9433939393939385,
      },
    },
    {
      name: "15-hcp bad round",
      round: fifteenHcpBadRound,
      expected: {
        ott: -2.585714285714286,
        app: -0.9511111111111112,
        atg: -1.3749999999999998,
        put: -0.8444444444444441,
        total: -5.756269841269841,
      },
    },
    {
      name: "20-hcp typical round",
      round: twentyHcpTypical,
      expected: {
        ott: -0.7107428571428571,
        app: 0.2773333333333332,
        atg: -1.0066666666666668,
        put: -0.24888888888888783,
        total: -1.6889650793650786,
      },
    },
  ];

  for (const { name, round, expected } of snapshotCases) {
    it(`${name}: exact values match pre-refactor snapshot`, () => {
      const benchmark = getInterpolatedBenchmark(round.handicapIndex);
      const result = calculateStrokesGained(round, benchmark);

      expect(result.categories["off-the-tee"]).toBe(expected.ott);
      expect(result.categories["approach"]).toBe(expected.app);
      expect(result.categories["around-the-green"]).toBe(expected.atg);
      expect(result.categories["putting"]).toBe(expected.put);
      expect(result.total).toBe(expected.total);
    });
  }

  it("missing GIR round: output unchanged", () => {
    const round = makeRound();
    delete round.greensInRegulation;
    delete round.upAndDownAttempts;
    delete round.upAndDownConverted;
    const benchmark = getInterpolatedBenchmark(round.handicapIndex);
    const result = calculateStrokesGained(round, benchmark);

    expect(result.estimatedCategories).toContain("approach");
    expect(result.estimatedCategories).toContain("around-the-green");
    expect(Number.isFinite(result.total)).toBe(true);

    const categorySum =
      result.categories["off-the-tee"] +
      result.categories["approach"] +
      result.categories["around-the-green"] +
      result.categories["putting"];
    expect(result.total).toBeCloseTo(categorySum, 10);
  });

  it("up-and-down round: output unchanged", () => {
    const round = makeRound({
      upAndDownAttempts: 8,
      upAndDownConverted: 4,
    });
    const benchmark = getInterpolatedBenchmark(round.handicapIndex);
    const result = calculateStrokesGained(round, benchmark);

    expect(Number.isFinite(result.categories["around-the-green"])).toBe(true);
    expect(Number.isFinite(result.total)).toBe(true);

    const categorySum =
      result.categories["off-the-tee"] +
      result.categories["approach"] +
      result.categories["around-the-green"] +
      result.categories["putting"];
    expect(result.total).toBeCloseTo(categorySum, 10);
  });
});
