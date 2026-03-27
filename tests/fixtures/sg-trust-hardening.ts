import { buildLessonReportData } from "@/lib/golf/lesson-report";
import { derivePresentationTrust } from "@/lib/golf/presentation-trust";
import { makeDetailSnapshot, makeRound, makeSGResult } from "./factories";

export const motivating_friend_round = (() => {
  const input = makeRound({
    handicapIndex: 14.3,
    score: 87,
    greensInRegulation: 7,
    totalPutts: 31,
    birdies: 1,
    pars: 6,
    bogeys: 5,
    doubleBogeys: 4,
    triplePlus: 2,
  });
  delete input.upAndDownAttempts;
  delete input.upAndDownConverted;

  const result = makeSGResult({
    benchmarkHandicap: 14.3,
    categories: {
      "off-the-tee": 0.2,
      approach: 1.35,
      "around-the-green": -0.7,
      putting: 0.55,
    },
    confidence: {
      "off-the-tee": "medium",
      approach: "high",
      "around-the-green": "medium",
      putting: "high",
    },
    inputPath: "atg-fallback",
    diagnostics: {
      threePuttImpact: null,
      lowGirPuttingCaveat: false,
    },
  });

  return {
    name: "motivating_friend_round",
    shotPatternCommentary:
      "ATG-fallback round with strong-looking approach and putting splits, but enough scoring divergence to suppress category-led storytelling.",
    input,
    result,
    trust: derivePresentationTrust({ input, result }),
  };
})();

export const normal_atg_fallback_control = (() => {
  const input = makeRound({
    handicapIndex: 14.3,
    score: 87,
    greensInRegulation: 7,
    totalPutts: 31,
    birdies: 0,
    pars: 8,
    bogeys: 8,
    doubleBogeys: 1,
    triplePlus: 1,
  });
  delete input.upAndDownAttempts;
  delete input.upAndDownConverted;

  const result = makeSGResult({
    benchmarkHandicap: 14.3,
    categories: {
      "off-the-tee": 0.35,
      approach: 1.05,
      "around-the-green": -0.25,
      putting: 0.4,
    },
    confidence: {
      "off-the-tee": "medium",
      approach: "high",
      "around-the-green": "medium",
      putting: "high",
    },
    inputPath: "atg-fallback",
    diagnostics: {
      threePuttImpact: null,
      lowGirPuttingCaveat: false,
    },
  });

  return {
    name: "normal_atg_fallback_control",
    input,
    result,
    trust: derivePresentationTrust({ input, result }),
  };
})();

export const all_caveated_lesson_report = (() => {
  const rounds = [
    makeDetailSnapshot({
      roundId: "caveated-1",
      playedAt: "2026-03-01",
      sgApproach: 1.4,
      sgPutting: 0.5,
      greensInRegulation: 7,
      upAndDownAttempts: null,
      upAndDownConverted: null,
      doubleBogeys: 4,
      triplePlus: 2,
    }),
    makeDetailSnapshot({
      roundId: "caveated-2",
      playedAt: "2026-03-04",
      sgApproach: 1.3,
      sgPutting: 0.4,
      greensInRegulation: 7,
      upAndDownAttempts: null,
      upAndDownConverted: null,
      doubleBogeys: 4,
      triplePlus: 2,
    }),
    makeDetailSnapshot({
      roundId: "quarantined-3",
      playedAt: "2026-03-08",
      sgApproach: -0.3,
      sgPutting: 0.1,
      trustStatus: "quarantined",
      trustReasons: ["score_breakdown_mismatch"],
    }),
  ];

  return {
    name: "all_caveated_lesson_report",
    rounds,
    report: buildLessonReportData(rounds),
  };
})();

export const mixed_trusted_lesson_report = (() => {
  const rounds = [
    makeDetailSnapshot({
      roundId: "assertive-1",
      playedAt: "2026-03-01",
      sgTotal: -0.4,
      sgApproach: -0.5,
      upAndDownAttempts: 4,
      upAndDownConverted: 2,
    }),
    makeDetailSnapshot({
      roundId: "assertive-2",
      playedAt: "2026-03-04",
      sgTotal: -0.8,
      sgApproach: -0.7,
      upAndDownAttempts: 4,
      upAndDownConverted: 2,
    }),
    makeDetailSnapshot({
      roundId: "caveated-3",
      playedAt: "2026-03-08",
      sgApproach: 1.3,
      sgPutting: 0.4,
      greensInRegulation: 7,
      upAndDownAttempts: null,
      upAndDownConverted: null,
      doubleBogeys: 4,
      triplePlus: 2,
    }),
  ];

  return {
    name: "mixed_trusted_lesson_report",
    rounds,
    report: buildLessonReportData(rounds),
  };
})();
