export type SgPhase2Mode = "off" | "shadow" | "full";

export function getSgPhase2Mode(): SgPhase2Mode {
  const mode = process.env.SG_PHASE2_MODE;
  if (mode === "shadow" || mode === "full") return mode;
  return "off";
}
