import { describe, it, expect } from "vitest";
import { loadCalibrationConfig, getCalibrationVersion, detectInputPath, calibrateRawSignals } from "@/lib/golf/calibration";
import { makeRound } from "../fixtures/factories";

describe("loadCalibrationConfig", () => {
  it("loads config with correct version", () => {
    const config = loadCalibrationConfig();
    expect(config.version).toBe("seed-1.0.0");
  });

  it("has all three profiles", () => {
    const config = loadCalibrationConfig();
    expect(config.profiles).toHaveProperty("full");
    expect(config.profiles).toHaveProperty("gir-estimated");
    expect(config.profiles).toHaveProperty("atg-fallback");
  });

  it("has valid bounds", () => {
    const config = loadCalibrationConfig();
    expect(config.bounds.min).toBe(0.1);
    expect(config.bounds.max).toBe(15.0);
  });

  it("all coefficients are within bounds", () => {
    const config = loadCalibrationConfig();
    for (const [, profile] of Object.entries(config.profiles)) {
      for (const [, value] of Object.entries(profile)) {
        expect(value).toBeGreaterThanOrEqual(config.bounds.min);
        expect(value).toBeLessThanOrEqual(config.bounds.max);
      }
    }
  });
});

describe("getCalibrationVersion", () => {
  it("returns the version string from JSON", () => {
    expect(getCalibrationVersion()).toBe("seed-1.0.0");
  });
});

describe("detectInputPath", () => {
  it("returns 'full' when GIR provided and up-and-down data provided", () => {
    const input = makeRound({ greensInRegulation: 6, upAndDownAttempts: 8, upAndDownConverted: 4 });
    expect(detectInputPath(input)).toBe("full");
  });

  it("returns 'full' when GIR provided and missedGreens is 0", () => {
    const input = makeRound({ greensInRegulation: 18 });
    // No up-and-down needed when missedGreens=0
    delete input.upAndDownAttempts;
    delete input.upAndDownConverted;
    expect(detectInputPath(input)).toBe("full");
  });

  it("returns 'gir-estimated' when GIR not provided", () => {
    const input = makeRound();
    delete input.greensInRegulation;
    expect(detectInputPath(input)).toBe("gir-estimated");
  });

  it("returns 'atg-fallback' when GIR provided but no up-and-down data and missedGreens > 0", () => {
    const input = makeRound({ greensInRegulation: 6 });
    delete input.upAndDownAttempts;
    delete input.upAndDownConverted;
    expect(detectInputPath(input)).toBe("atg-fallback");
  });

  it("returns 'atg-fallback' when upAndDownAttempts is 0", () => {
    const input = makeRound({ greensInRegulation: 6, upAndDownAttempts: 0, upAndDownConverted: 0 });
    expect(detectInputPath(input)).toBe("atg-fallback");
  });
});

describe("calibrateRawSignals", () => {
  it("applies full-path coefficients correctly", () => {
    const rawSignals = {
      firDelta: 0.1,
      penaltyDelta: 1.0,
      approachDelta: 0.05,
      atgDelta: 0.1,
      puttingDelta: 0.05,
    };
    const result = calibrateRawSignals(rawSignals, "full");
    expect(result["off-the-tee"]).toBeCloseTo(0.1 * 6.0 + 1.0 * 0.8, 5);
    expect(result["approach"]).toBeCloseTo(0.05 * 8.0, 5);
    expect(result["around-the-green"]).toBeCloseTo(0.1 * 5.0, 5);
    expect(result["putting"]).toBeCloseTo(0.05 * 4.0, 5);
  });

  it("applies gir-estimated coefficients with reduced approach weight", () => {
    const rawSignals = {
      firDelta: 0.1,
      penaltyDelta: 1.0,
      approachDelta: 0.05,
      atgDelta: 0.1,
      puttingDelta: 0.05,
    };
    const result = calibrateRawSignals(rawSignals, "gir-estimated");
    expect(result["approach"]).toBeCloseTo(0.05 * 6.5, 5); // reduced from 8.0
    expect(result["around-the-green"]).toBeCloseTo(0.1 * 4.0, 5); // reduced from 5.0
  });

  it("applies atg-fallback coefficients with reduced ATG weight", () => {
    const rawSignals = {
      firDelta: 0.1,
      penaltyDelta: 1.0,
      approachDelta: 0.05,
      atgDelta: 0.1,
      puttingDelta: 0.05,
    };
    const result = calibrateRawSignals(rawSignals, "atg-fallback");
    expect(result["around-the-green"]).toBeCloseTo(0.1 * 3.5, 5); // reduced from 5.0
    expect(result["approach"]).toBeCloseTo(0.05 * 8.0, 5); // same as full
  });

  it("zero deltas produce zero SG values", () => {
    const rawSignals = {
      firDelta: 0,
      penaltyDelta: 0,
      approachDelta: 0,
      atgDelta: 0,
      puttingDelta: 0,
    };
    const result = calibrateRawSignals(rawSignals, "full");
    expect(result["off-the-tee"]).toBe(0);
    expect(result["approach"]).toBe(0);
    expect(result["around-the-green"]).toBe(0);
    expect(result["putting"]).toBe(0);
  });
});
