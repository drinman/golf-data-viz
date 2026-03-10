import { createHash } from "crypto";
import {
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  getMajorVersion,
} from "@/lib/golf/constants";
import { deriveConfidence } from "@/lib/golf/round-detail-adapter";
import {
  calculateBiggestMover,
  hasMethodologyMix,
  toTrendSeries,
  type BiggestMover,
  type RoundSgSnapshot,
  type TrendSeries,
} from "@/lib/golf/trends";
import type {
  ConfidenceLevel,
  RadarChartDatum,
  RoundDetailSnapshot,
  StrokesGainedCategory,
} from "@/lib/golf/types";

export const LESSON_REPORT_VERSION = "1.0.0" as const;

export interface LessonReportSummary {
  roundCount: number;
  startDate: string;
  endDate: string;
  averageScore: number;
  averageHandicapIndex: number;
  averageSgTotal: number;
  averageCategories: Record<StrokesGainedCategory, number>;
  averageRadar: RadarChartDatum[];
}

export interface LessonReportArea {
  category: StrokesGainedCategory;
  label: string;
  averageSg: number;
  confidence: ConfidenceLevel;
}

export interface LessonReportTrendSignal {
  category: StrokesGainedCategory | null;
  label: string;
  direction: BiggestMover["direction"] | "stable";
  delta: number;
  confidence: BiggestMover["confidence"];
  copyText: string;
}

export interface LessonReportRoundSummary {
  roundId: string;
  playedAt: string;
  courseName: string;
  score: number;
  handicapIndex: number;
  sgTotal: number;
  sgOffTheTee: number;
  sgApproach: number;
  sgAroundTheGreen: number;
  sgPutting: number;
  methodologyVersion: string | null;
}

export interface LessonReportData {
  reportVersion: string;
  generatedAt: string;
  summary: LessonReportSummary;
  selectedRounds: LessonReportRoundSummary[];
  trendSeries: TrendSeries[];
  trendSignal: LessonReportTrendSignal;
  focusArea: LessonReportArea;
  strongestArea: LessonReportArea;
  confidenceSummary: {
    overall: ConfidenceLevel;
    byCategory: Record<StrokesGainedCategory, ConfidenceLevel>;
  };
  methodologyMix: boolean;
  methodologyVersions: string[];
  caveats: string[];
}

function roundToTrendSnapshot(round: RoundDetailSnapshot): RoundSgSnapshot {
  return {
    roundId: round.roundId,
    playedAt: round.playedAt,
    courseName: round.courseName,
    score: round.score,
    handicapIndex: round.handicapIndex,
    sgTotal: round.sgTotal,
    sgOffTheTee: round.sgOffTheTee,
    sgApproach: round.sgApproach,
    sgAroundTheGreen: round.sgAroundTheGreen,
    sgPutting: round.sgPutting,
    methodologyVersion: round.methodologyVersion,
    benchmarkBracket: round.benchmarkBracket,
  };
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function getSnapshotConfidence(
  snapshot: RoundDetailSnapshot,
  category: StrokesGainedCategory
): ConfidenceLevel {
  const derived = deriveConfidence({
    fairwaysHit: snapshot.fairwaysHit,
    fairwayAttempts: snapshot.fairwayAttempts,
    greensInRegulation: snapshot.greensInRegulation,
    upAndDownAttempts: snapshot.upAndDownAttempts,
    upAndDownConverted: snapshot.upAndDownConverted,
  });

  switch (category) {
    case "off-the-tee":
      return snapshot.confidenceOffTheTee ?? derived["off-the-tee"];
    case "approach":
      return snapshot.confidenceApproach ?? derived.approach;
    case "around-the-green":
      return snapshot.confidenceAroundTheGreen ?? derived["around-the-green"];
    case "putting":
      return snapshot.confidencePutting ?? derived.putting;
  }
}

function getCategoryValue(
  snapshot: RoundDetailSnapshot,
  category: StrokesGainedCategory
): number {
  switch (category) {
    case "off-the-tee":
      return snapshot.sgOffTheTee;
    case "approach":
      return snapshot.sgApproach;
    case "around-the-green":
      return snapshot.sgAroundTheGreen;
    case "putting":
      return snapshot.sgPutting;
  }
}

export function buildSelectionHash(roundIds: string[]): string {
  return createHash("sha256")
    .update([...roundIds].sort().join(":"))
    .digest("hex");
}

export function aggregateCategoryConfidence(
  snapshots: RoundDetailSnapshot[]
): Record<StrokesGainedCategory, ConfidenceLevel> {
  return Object.fromEntries(
    CATEGORY_ORDER.map((category) => {
      const levels = snapshots.map((snapshot) => getSnapshotConfidence(snapshot, category));
      if (levels.every((level) => level === "high")) {
        return [category, "high"] as const;
      }
      if (levels.some((level) => level === "low")) {
        return [category, "low"] as const;
      }
      return [category, "medium"] as const;
    })
  ) as Record<StrokesGainedCategory, ConfidenceLevel>;
}

export function aggregateOverallConfidence(
  byCategory: Record<StrokesGainedCategory, ConfidenceLevel>
): ConfidenceLevel {
  const levels = CATEGORY_ORDER.map((category) => byCategory[category]);
  if (levels.includes("low")) return "low";
  if (levels.includes("medium")) return "medium";
  return "high";
}

function buildAverageRadar(
  averageCategories: Record<StrokesGainedCategory, number>
): RadarChartDatum[] {
  return CATEGORY_ORDER.map((category) => ({
    category: CATEGORY_LABELS[category],
    player: clamp(50 + averageCategories[category] * 10, 0, 100),
  }));
}

function buildTrendSignal(rounds: RoundSgSnapshot[]): LessonReportTrendSignal {
  const mover = calculateBiggestMover(rounds);
  if (mover) {
    return mover;
  }

  const confidence = rounds.length >= 5 ? "emerging_pattern" : "recent_movement";
  return {
    category: null,
    label: "No clear movement yet",
    direction: "stable",
    delta: 0,
    confidence,
    copyText:
      "Selected rounds do not show a single category moving enough yet to call it a strong trend signal.",
  };
}

function buildRankedAreas(
  snapshots: RoundDetailSnapshot[],
  confidenceByCategory: Record<StrokesGainedCategory, ConfidenceLevel>
): { focusArea: LessonReportArea; strongestArea: LessonReportArea } {
  const trendSnapshots = snapshots.map(roundToTrendSnapshot);

  const ranked = CATEGORY_ORDER.map((category) => {
    const values = snapshots.map((snapshot) => getCategoryValue(snapshot, category));
    const averageSg = average(values);
    const negativeCount = values.filter((value) => value < 0).length;
    const positiveCount = values.filter((value) => value > 0).length;
    const recentDelta = (() => {
      const mover = calculateBiggestMover(
        trendSnapshots.map((snapshot) => ({
          ...snapshot,
        }))
      );
      return mover?.category === category ? mover.delta : 0;
    })();

    return {
      category,
      label: CATEGORY_LABELS[category],
      averageSg,
      confidence: confidenceByCategory[category],
      negativeCount,
      positiveCount,
      recentDelta,
    };
  });

  const focusPool = ranked.filter((entry) => entry.confidence !== "low");
  const focusCandidate = [...focusPool].sort((a, b) => {
    if (a.averageSg !== b.averageSg) return a.averageSg - b.averageSg;
    if (a.negativeCount !== b.negativeCount) return b.negativeCount - a.negativeCount;
    return a.recentDelta - b.recentDelta;
  })[0] ?? ranked[0];

  const strongestCandidate = [...focusPool].sort((a, b) => {
    if (a.averageSg !== b.averageSg) return b.averageSg - a.averageSg;
    if (a.positiveCount !== b.positiveCount) return b.positiveCount - a.positiveCount;
    return b.recentDelta - a.recentDelta;
  })[0] ?? ranked[0];

  return {
    focusArea: {
      category: focusCandidate.category,
      label: focusCandidate.label,
      averageSg: focusCandidate.averageSg,
      confidence: focusCandidate.confidence,
    },
    strongestArea: {
      category: strongestCandidate.category,
      label: strongestCandidate.label,
      averageSg: strongestCandidate.averageSg,
      confidence: strongestCandidate.confidence,
    },
  };
}

function collectMethodologyVersions(rounds: RoundDetailSnapshot[]): string[] {
  return Array.from(
    new Set(
      rounds
        .map((round) => getMajorVersion(round.methodologyVersion))
        .filter((value): value is string => value !== null)
    )
  ).sort();
}

export function buildLessonReportData(
  snapshots: RoundDetailSnapshot[],
  options: { generatedAt?: string } = {}
): LessonReportData {
  if (snapshots.length < 3) {
    throw new Error("Lesson reports require at least 3 rounds.");
  }

  const sorted = [...snapshots].sort(
    (a, b) => new Date(a.playedAt).getTime() - new Date(b.playedAt).getTime()
  );
  const trendRounds = sorted.map(roundToTrendSnapshot);
  const confidenceByCategory = aggregateCategoryConfidence(sorted);
  const overallConfidence = aggregateOverallConfidence(confidenceByCategory);

  const averageCategories = {
    "off-the-tee": average(sorted.map((round) => round.sgOffTheTee)),
    approach: average(sorted.map((round) => round.sgApproach)),
    "around-the-green": average(sorted.map((round) => round.sgAroundTheGreen)),
    putting: average(sorted.map((round) => round.sgPutting)),
  } satisfies Record<StrokesGainedCategory, number>;

  const methodologyMix = hasMethodologyMix(trendRounds);
  const caveats: string[] = [];
  if (sorted.length <= 4) {
    caveats.push("Trend signals are still early with only 3-4 rounds selected.");
  }
  if (methodologyMix) {
    caveats.push(
      "Selected rounds span multiple methodology versions. Treat trend comparisons as directional."
    );
  }
  if (overallConfidence === "low") {
    caveats.push(
      "At least one category carries low aggregate confidence. Use the report as directional prep, not a final verdict."
    );
  }

  const { focusArea, strongestArea } = buildRankedAreas(sorted, confidenceByCategory);

  return {
    reportVersion: LESSON_REPORT_VERSION,
    generatedAt: options.generatedAt ?? new Date().toISOString(),
    summary: {
      roundCount: sorted.length,
      startDate: sorted[0].playedAt,
      endDate: sorted[sorted.length - 1].playedAt,
      averageScore: average(sorted.map((round) => round.score)),
      averageHandicapIndex: average(sorted.map((round) => round.handicapIndex)),
      averageSgTotal: average(sorted.map((round) => round.sgTotal)),
      averageCategories,
      averageRadar: buildAverageRadar(averageCategories),
    },
    selectedRounds: sorted.map((round) => ({
      roundId: round.roundId,
      playedAt: round.playedAt,
      courseName: round.courseName,
      score: round.score,
      handicapIndex: round.handicapIndex,
      sgTotal: round.sgTotal,
      sgOffTheTee: round.sgOffTheTee,
      sgApproach: round.sgApproach,
      sgAroundTheGreen: round.sgAroundTheGreen,
      sgPutting: round.sgPutting,
      methodologyVersion: round.methodologyVersion,
    })),
    trendSeries: toTrendSeries(trendRounds),
    trendSignal: buildTrendSignal(trendRounds),
    focusArea,
    strongestArea,
    confidenceSummary: {
      overall: overallConfidence,
      byCategory: confidenceByCategory,
    },
    methodologyMix,
    methodologyVersions: collectMethodologyVersions(sorted),
    caveats,
  };
}
