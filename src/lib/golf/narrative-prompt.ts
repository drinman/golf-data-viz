import type { RoundInput, StrokesGainedResult } from "./types";
import type { RoundTroubleContext } from "./trouble-context";
import { generateTroubleNarrative } from "./trouble-context";
import { BRACKET_LABELS, CATEGORY_LABELS, CATEGORY_ORDER, SG_NEAR_ZERO_THRESHOLD } from "./constants";
import { formatSG } from "./format";

export const NARRATIVE_SYSTEM_PROMPT = `You are a golf performance analyst writing for mid-handicap recreational golfers.
Your job is to translate strokes gained statistics into a clear, compelling 3-5 sentence narrative about a golfer's round.

Rules:
- Write in second person ("you", "your")
- Use plain English a 14-handicap golfer understands. No jargon without explanation.
- Never suggest drills, practice routines, or swing changes
- Never compare to Tour/PGA players
- Reference specific stats from the round (putts, fairways, GIR, score)
- The benchmark comparison group is other golfers at their handicap level
- Be honest: if a category is weak, say so directly. Don't sugarcoat.
- Be encouraging when warranted: if something is genuinely strong, acknowledge it
- Keep it tight: 3-5 sentences, under 120 words
- Format as a single paragraph — no bullet points, no headers
- If trouble context is provided, incorporate it into the narrative
- Include confidence caveats when a category has "low" confidence
- If a category is marked [PEER AVERAGE], describe it as neutral — matching the peer group. Do not praise or criticize peer-average categories.
- If all categories are peer-average, describe the round as broadly matching the peer group rather than implying a benchmark copy. Do not invent a weakness.
- If at least one category is clearly negative (not peer-average), end with one sentence about the single most impactful area for improvement, framed as observation not advice ("your biggest opportunity is..." not "you should..."). If all categories are peer-average, skip this sentence.`;

export function buildNarrativeUserPrompt(
  input: RoundInput,
  result: StrokesGainedResult,
  troubleContext?: RoundTroubleContext
): string {
  const bracketLabel = BRACKET_LABELS[result.benchmarkBracket];

  const fairwaysLine =
    input.fairwaysHit != null
      ? `- Fairways: ${input.fairwaysHit}/${input.fairwayAttempts}`
      : "- Fairways: not tracked";

  const girEstimated = result.estimatedCategories.includes("approach");
  const girLine = `- Greens in Regulation: ${input.greensInRegulation ?? "N/A"}/18${girEstimated ? " (estimated)" : ""}`;

  const scoringLine = `- Scoring: ${input.eagles}E, ${input.birdies}B, ${input.pars}P, ${input.bogeys}Bo, ${input.doubleBogeys}D, ${input.triplePlus}T+`;

  const sgLines = CATEGORY_ORDER.map((cat) => {
    const label = CATEGORY_LABELS[cat];
    const rawValue = result.categories[cat];
    const value = formatSG(rawValue);
    const confidence = result.confidence[cat];
    const peerAvgTag = Math.abs(rawValue) <= SG_NEAR_ZERO_THRESHOLD
      ? " [PEER AVERAGE — do not praise or criticize]"
      : "";
    return `- ${label}: ${value} (confidence: ${confidence})${peerAvgTag}`;
  });

  const estimatedNote =
    result.estimatedCategories.length > 0
      ? `\nNote: ${result.estimatedCategories.map((c) => CATEGORY_LABELS[c]).join(", ")} ${result.estimatedCategories.length === 1 ? "was" : "were"} estimated, not directly measured.`
      : "";

  let troubleText = "";
  if (troubleContext && troubleContext.troubleHoles.length > 0) {
    const narrative = generateTroubleNarrative(troubleContext);
    troubleText = `\nTrouble context: ${narrative.body}`;
  }

  return `Round data:
- Course: ${input.course}, Score: ${input.score}, Handicap Index: ${input.handicapIndex}
- Course Rating: ${input.courseRating}, Slope: ${input.slopeRating}
${fairwaysLine}
${girLine}
- Total Putts: ${input.totalPutts}
- Penalty Strokes: ${input.penaltyStrokes}
${scoringLine}

Strokes Gained vs ${bracketLabel} peers:
- Total: ${formatSG(result.total)}
${sgLines.join("\n")}
${troubleText}${estimatedNote}

Write a 3-5 sentence narrative about this round.`;
}
