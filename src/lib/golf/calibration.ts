import type {
  CalibrationConfig,
  CalibrationInputPath,
  RoundInput,
  StrokesGainedCategory,
} from "./types";
import rawConfig from "@/data/calibration/coefficients-seed-v1.json";

export interface RawSignals {
  firDelta: number;
  penaltyDelta: number;
  approachDelta: number;
  atgDelta: number;
  puttingDelta: number;
}

const config: CalibrationConfig = {
  version: rawConfig.version,
  updatedAt: rawConfig.updatedAt,
  profiles: rawConfig.profiles as CalibrationConfig["profiles"],
  bounds: rawConfig.bounds,
};

// Validate bounds on module load
for (const [profileName, profile] of Object.entries(config.profiles)) {
  for (const [key, value] of Object.entries(profile)) {
    if (value < config.bounds.min || value > config.bounds.max) {
      throw new Error(
        `Calibration coefficient ${profileName}.${key} = ${value} is outside bounds [${config.bounds.min}, ${config.bounds.max}]`
      );
    }
  }
}

export function loadCalibrationConfig(): CalibrationConfig {
  return config;
}

export function getCalibrationVersion(): string {
  return config.version;
}

export function detectInputPath(input: RoundInput): CalibrationInputPath {
  if (input.greensInRegulation == null) {
    return "gir-estimated";
  }

  const missedGreens = 18 - input.greensInRegulation;
  const hasUpAndDown =
    input.upAndDownAttempts != null &&
    input.upAndDownConverted != null &&
    input.upAndDownAttempts > 0;

  if (hasUpAndDown || missedGreens === 0) {
    return "full";
  }

  return "atg-fallback";
}

export function calibrateRawSignals(
  rawSignals: RawSignals,
  path: CalibrationInputPath
): Record<StrokesGainedCategory, number> {
  const coeff = config.profiles[path];
  return {
    "off-the-tee":
      rawSignals.firDelta * coeff.ottFir +
      rawSignals.penaltyDelta * coeff.ottPenalty,
    approach: rawSignals.approachDelta * coeff.approach,
    "around-the-green": rawSignals.atgDelta * coeff.aroundTheGreen,
    putting: rawSignals.puttingDelta * coeff.putting,
  };
}
