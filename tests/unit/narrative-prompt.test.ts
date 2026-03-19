import { describe, it, expect } from "vitest";
import {
  NARRATIVE_SYSTEM_PROMPT,
  buildNarrativeUserPrompt,
} from "@/lib/golf/narrative-prompt";
import type { RoundInput, StrokesGainedResult } from "@/lib/golf/types";
import type { RoundTroubleContext } from "@/lib/golf/trouble-context";

function makeInput(overrides: Partial<RoundInput> = {}): RoundInput {
  return {
    course: "Pine Valley",
    date: "2026-03-14",
    score: 86,
    handicapIndex: 14,
    courseRating: 72.5,
    slopeRating: 131,
    fairwaysHit: 7,
    fairwayAttempts: 14,
    greensInRegulation: 6,
    totalPutts: 34,
    penaltyStrokes: 2,
    eagles: 0,
    birdies: 1,
    pars: 6,
    bogeys: 7,
    doubleBogeys: 3,
    triplePlus: 1,
    ...overrides,
  };
}

function makeResult(overrides: Partial<StrokesGainedResult> = {}): StrokesGainedResult {
  return {
    total: -0.5,
    categories: {
      "off-the-tee": 0.42,
      approach: -1.15,
      "around-the-green": 0.08,
      putting: 0.15,
    },
    benchmarkBracket: "10-15",
    skippedCategories: [],
    estimatedCategories: [],
    confidence: {
      "off-the-tee": "high",
      approach: "high",
      "around-the-green": "medium",
      putting: "high",
    },
    methodologyVersion: "3.2.0",
    benchmarkVersion: "1.0.0",
    benchmarkHandicap: 14,
    diagnostics: { threePuttImpact: null },
    ...overrides,
  };
}

// --- System prompt constraints ---

describe("NARRATIVE_SYSTEM_PROMPT", () => {
  it("uses second person", () => {
    expect(NARRATIVE_SYSTEM_PROMPT).toContain("second person");
    expect(NARRATIVE_SYSTEM_PROMPT).toContain('"you"');
  });

  it("prohibits drill suggestions", () => {
    expect(NARRATIVE_SYSTEM_PROMPT).toMatch(/never suggest drills/i);
  });

  it("prohibits Tour comparisons", () => {
    expect(NARRATIVE_SYSTEM_PROMPT).toMatch(/never compare to tour/i);
  });

  it("enforces word limit", () => {
    expect(NARRATIVE_SYSTEM_PROMPT).toContain("under 120 words");
  });

  it("requires single paragraph format", () => {
    expect(NARRATIVE_SYSTEM_PROMPT).toContain("single paragraph");
  });

  it("requires ending with biggest opportunity", () => {
    expect(NARRATIVE_SYSTEM_PROMPT).toContain("biggest opportunity");
  });
});

// --- User prompt construction ---

describe("buildNarrativeUserPrompt", () => {
  it("includes course name and score", () => {
    const prompt = buildNarrativeUserPrompt(makeInput(), makeResult());
    expect(prompt).toContain("Pine Valley");
    expect(prompt).toContain("Score: 86");
  });

  it("includes fairways hit", () => {
    const prompt = buildNarrativeUserPrompt(makeInput(), makeResult());
    expect(prompt).toContain("Fairways: 7/14");
  });

  it("includes GIR", () => {
    const prompt = buildNarrativeUserPrompt(makeInput(), makeResult());
    expect(prompt).toContain("Greens in Regulation: 6/18");
  });

  it("includes SG values with signs", () => {
    const prompt = buildNarrativeUserPrompt(makeInput(), makeResult());
    expect(prompt).toContain("+0.42");
    expect(prompt).toContain("-1.15");
    expect(prompt).toContain("+0.08");
    expect(prompt).toContain("+0.15");
  });

  it("includes confidence levels", () => {
    const prompt = buildNarrativeUserPrompt(makeInput(), makeResult());
    expect(prompt).toContain("confidence: high");
    expect(prompt).toContain("confidence: medium");
  });

  it("includes bracket label", () => {
    const prompt = buildNarrativeUserPrompt(makeInput(), makeResult());
    expect(prompt).toContain("10\u201315 HCP peers");
  });

  it("includes scoring distribution", () => {
    const prompt = buildNarrativeUserPrompt(makeInput(), makeResult());
    expect(prompt).toContain("0E, 1B, 6P, 7Bo, 3D, 1T+");
  });

  it("includes penalty strokes", () => {
    const prompt = buildNarrativeUserPrompt(makeInput(), makeResult());
    expect(prompt).toContain("Penalty Strokes: 2");
  });

  // --- Edge cases ---

  it("handles missing fairwaysHit", () => {
    const input = makeInput({ fairwaysHit: undefined });
    const prompt = buildNarrativeUserPrompt(input, makeResult());
    expect(prompt).toContain("Fairways: not tracked");
  });

  it("marks estimated categories", () => {
    const result = makeResult({
      estimatedCategories: ["approach"],
    });
    const prompt = buildNarrativeUserPrompt(makeInput(), result);
    expect(prompt).toContain("(estimated)");
    expect(prompt).toContain("Approach was estimated");
  });

  it("marks multiple estimated categories", () => {
    const result = makeResult({
      estimatedCategories: ["approach", "around-the-green"],
    });
    const prompt = buildNarrativeUserPrompt(makeInput(), result);
    expect(prompt).toContain("Approach, Around the Green were estimated");
  });

  it("handles plus handicap", () => {
    const input = makeInput({ handicapIndex: -2.5 });
    const result = makeResult({ benchmarkBracket: "plus" });
    const prompt = buildNarrativeUserPrompt(input, result);
    expect(prompt).toContain("Handicap Index: -2.5");
    expect(prompt).toContain("Plus HCP peers");
  });

  it("includes trouble context when provided", () => {
    const troubleContext: RoundTroubleContext = {
      troubleHoles: [
        { holeNumber: 4, primaryCause: "tee" },
        { holeNumber: 12, primaryCause: "tee" },
      ],
      summary: { tee: 2, approach: 0, around_green: 0, putting: 0, penalty: 0 },
    };
    const prompt = buildNarrativeUserPrompt(makeInput(), makeResult(), troubleContext);
    expect(prompt).toContain("Trouble context:");
    expect(prompt).toContain("tee shot");
  });

  it("omits trouble context when not provided", () => {
    const prompt = buildNarrativeUserPrompt(makeInput(), makeResult());
    expect(prompt).not.toContain("Trouble context:");
  });

  it("annotates peer-average categories with [PEER AVERAGE]", () => {
    const result = makeResult({
      categories: {
        "off-the-tee": 0.03,
        approach: -1.15,
        "around-the-green": -0.03,
        putting: 0.15,
      },
    });
    const prompt = buildNarrativeUserPrompt(makeInput(), result);
    // OTT and ATG are within threshold
    expect(prompt).toContain("Off the Tee: 0.00 (confidence: high) [PEER AVERAGE");
    expect(prompt).toContain("Around the Green: 0.00 (confidence: medium) [PEER AVERAGE");
    // Approach and Putting are outside threshold — no tag
    expect(prompt).toContain("Approach: -1.15 (confidence: high)\n");
    expect(prompt).toContain("Putting: +0.15 (confidence: high)\n");
  });

  it("system prompt includes peer-average guidance", () => {
    expect(NARRATIVE_SYSTEM_PROMPT).toContain("PEER AVERAGE");
    expect(NARRATIVE_SYSTEM_PROMPT).toContain("Do not praise or criticize peer-average categories");
    expect(NARRATIVE_SYSTEM_PROMPT).toContain("Do not invent a weakness");
    expect(NARRATIVE_SYSTEM_PROMPT).toContain("If all categories are peer-average, skip this sentence");
  });

  it("omits trouble context when empty", () => {
    const troubleContext: RoundTroubleContext = {
      troubleHoles: [],
      summary: { tee: 0, approach: 0, around_green: 0, putting: 0, penalty: 0 },
    };
    const prompt = buildNarrativeUserPrompt(makeInput(), makeResult(), troubleContext);
    expect(prompt).not.toContain("Trouble context:");
  });
});
