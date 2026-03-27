import { describe, expect, it } from "vitest";
import { derivePresentationTrust } from "@/lib/golf/presentation-trust";
import { roundInputSchema } from "@/lib/golf/schemas";
import { makeRound, makeSGResult } from "../fixtures/factories";
import {
  motivating_friend_round,
  normal_atg_fallback_control,
} from "../fixtures/sg-trust-hardening";

describe("derivePresentationTrust", () => {
  it("keeps trust-hardening fixtures schema-valid", () => {
    expect(roundInputSchema.safeParse(motivating_friend_round.input).success).toBe(true);
    expect(roundInputSchema.safeParse(normal_atg_fallback_control.input).success).toBe(true);
  });

  it("marks the motivating ATG-fallback round as caveated", () => {
    const trust = derivePresentationTrust({
      input: motivating_friend_round.input,
      result: motivating_friend_round.result,
    });

    expect(trust.mode).toBe("caveated");
    expect(trust.promotableCategories).toEqual(["off-the-tee"]);
    expect(trust.roundReasons).toContain("atg_fallback_additional_suppression");
    expect(trust.categoryReasons["around-the-green"]).toContain("atg_fallback");
    expect(trust.categoryReasons.approach).toContain(
      "atg_fallback_scoring_divergence"
    );
    expect(trust.categoryReasons.putting).toContain(
      "atg_fallback_approach_instability"
    );
  });

  it("keeps a healthy ATG-fallback round assertive", () => {
    const trust = derivePresentationTrust({
      input: normal_atg_fallback_control.input,
      result: normal_atg_fallback_control.result,
    });

    expect(trust.mode).toBe("assertive");
    expect(trust.promotableCategories).toEqual([
      "off-the-tee",
      "approach",
      "putting",
    ]);
    expect(trust.categoryReasons["around-the-green"]).toContain("atg_fallback");
  });

  it("quarantines rounds flagged by existing round trust", () => {
    const trust = derivePresentationTrust({
      input: makeRound(),
      result: makeSGResult(),
      roundTrustStatus: "quarantined",
    });

    expect(trust.mode).toBe("quarantined");
    expect(trust.promotableCategories).toEqual([]);
    expect(trust.roundReasons).toContain("round_trust_quarantined");
  });

  it("caveates low-GIR putting rounds", () => {
    const trust = derivePresentationTrust({
      input: makeRound({
        greensInRegulation: 2,
        totalPutts: 31,
      }),
      result: makeSGResult({
        benchmarkHandicap: 14.3,
        diagnostics: {
          threePuttImpact: null,
          lowGirPuttingCaveat: true,
        },
      }),
    });

    expect(trust.mode).toBe("caveated");
    expect(trust.promotableCategories).not.toContain("putting");
    expect(trust.roundReasons).toContain("low_gir_putting_caveat");
    expect(trust.categoryReasons.putting).toContain("low_gir_putting_caveat");
  });

  it("caveates plus-handicap benchmark rounds", () => {
    const trust = derivePresentationTrust({
      input: makeRound({ handicapIndex: -2.3 }),
      result: makeSGResult({
        benchmarkBracket: "plus",
        benchmarkHandicap: -2.3,
      }),
    });

    expect(trust.mode).toBe("caveated");
    expect(trust.roundReasons).toContain("plus_benchmark_caveat");
  });
});
