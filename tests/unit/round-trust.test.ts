import { describe, expect, it } from "vitest";
import { makeRound } from "../fixtures/factories";
import { assessRoundTrust } from "@/lib/golf/round-trust";

describe("assessRoundTrust", () => {
  it("returns trusted for a typical valid round", () => {
    const result = assessRoundTrust(makeRound());
    expect(result.status).toBe("trusted");
    expect(result.reasons).toEqual([]);
  });

  it("quarantines when score does not match scoring breakdown implied range", () => {
    const result = assessRoundTrust(makeRound({ score: 120 }));
    expect(result.status).toBe("quarantined");
    expect(result.reasons).toContain("score_breakdown_mismatch");
  });

  it("quarantines when putts exceed score", () => {
    const result = assessRoundTrust(
      makeRound({
        score: 78,
        totalPutts: 79,
        birdies: 0,
        pars: 14,
        bogeys: 4,
        doubleBogeys: 0,
        triplePlus: 0,
      })
    );
    expect(result.status).toBe("quarantined");
    expect(result.reasons).toContain("putts_exceed_score");
  });

  it("quarantines when putts are extremely low", () => {
    const result = assessRoundTrust(makeRound({ totalPutts: 13 }));
    expect(result.status).toBe("quarantined");
    expect(result.reasons).toContain("putts_extremely_low");
  });

  it("stays trusted with a single soft anomaly", () => {
    const result = assessRoundTrust(makeRound({ handicapIndex: 54 }));
    expect(result.status).toBe("trusted");
    expect(result.reasons).toContain("differential_handicap_gap");
  });

  it("quarantines when two soft anomalies are present", () => {
    const result = assessRoundTrust(
      makeRound({
        handicapIndex: 54,
        score: 80,
        eagles: 0,
        birdies: 4,
        pars: 4,
        bogeys: 7,
        doubleBogeys: 2,
        triplePlus: 1,
      })
    );
    expect(result.status).toBe("quarantined");
    expect(result.reasons).toContain("differential_handicap_gap");
    expect(result.reasons).toContain("high_hcp_scoring_spike");
  });

  it("flags mid-high handicap scoring spikes", () => {
    const result = assessRoundTrust(
      makeRound({
        handicapIndex: 20,
        score: 82,
        eagles: 0,
        birdies: 5,
        pars: 3,
        bogeys: 7,
        doubleBogeys: 2,
        triplePlus: 1,
      })
    );

    expect(result.status).toBe("trusted");
    expect(result.reasons).toContain("mid_high_hcp_scoring_spike");
  });

  it("flags low-score high-putt inversion pattern", () => {
    const result = assessRoundTrust(
      makeRound({
        score: 78,
        totalPutts: 40,
        eagles: 0,
        birdies: 0,
        pars: 14,
        bogeys: 4,
        doubleBogeys: 0,
        triplePlus: 0,
      })
    );

    expect(result.status).toBe("trusted");
    expect(result.reasons).toContain("low_score_high_putts");
  });

  it("flags high-score low-putt inversion pattern", () => {
    const result = assessRoundTrust(
      makeRound({
        score: 111,
        totalPutts: 20,
        eagles: 0,
        birdies: 0,
        pars: 0,
        bogeys: 0,
        doubleBogeys: 10,
        triplePlus: 8,
      })
    );

    expect(result.status).toBe("trusted");
    expect(result.reasons).toContain("high_score_low_putts");
  });
});
