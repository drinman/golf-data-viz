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

  it("trusts a baseline round with 18 pars and score 72", () => {
    const result = assessRoundTrust(
      makeRound({
        score: 72,
        eagles: 0,
        birdies: 0,
        pars: 18,
        bogeys: 0,
        doubleBogeys: 0,
        triplePlus: 0,
      })
    );

    expect(result.status).toBe("trusted");
    expect(result.reasons).toEqual([]);
  });

  it("trusts a par-3/executive-style low score when breakdown is consistent", () => {
    const result = assessRoundTrust(
      makeRound({
        score: 58,
        handicapIndex: 2,
        courseRating: 60,
        slopeRating: 155,
        eagles: 0,
        birdies: 0,
        pars: 18,
        bogeys: 0,
        doubleBogeys: 0,
        triplePlus: 0,
      })
    );

    expect(result.status).toBe("trusted");
    expect(result.reasons).toEqual([]);
  });

  it("trusts a scratch-like round (hcp 0, score 68) when plausible", () => {
    const result = assessRoundTrust(
      makeRound({
        score: 68,
        handicapIndex: 0,
        eagles: 0,
        birdies: 4,
        pars: 14,
        bogeys: 0,
        doubleBogeys: 0,
        triplePlus: 0,
      })
    );

    expect(result.status).toBe("trusted");
    expect(result.reasons).toEqual([]);
  });

  it("quarantines when scoring distribution does not cover 18 holes", () => {
    const result = assessRoundTrust(
      makeRound({
        score: 87,
        eagles: 0,
        birdies: 1,
        pars: 7,
        bogeys: 7,
        doubleBogeys: 1,
        triplePlus: 1, // totals 17
      })
    );

    expect(result.status).toBe("quarantined");
    expect(result.reasons).toContain("scoring_hole_count_mismatch");
  });

  it("quarantines when rating/slope inputs are invalid for differential checks", () => {
    const result = assessRoundTrust(makeRound({ courseRating: 0 }));

    expect(result.status).toBe("quarantined");
    expect(result.reasons).toContain("invalid_rating_or_slope");
  });

  it("quarantines when slopeRating is zero", () => {
    const result = assessRoundTrust(makeRound({ slopeRating: 0 }));

    expect(result.status).toBe("quarantined");
    expect(result.reasons).toContain("invalid_rating_or_slope");
  });
});
