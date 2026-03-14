export type SgPhase2Mode = "off" | "shadow" | "full";

export function getSgPhase2Mode(): SgPhase2Mode {
  const mode = process.env.SG_PHASE2_MODE;
  if (mode === "off" || mode === "shadow") return mode;
  return "full";
}
