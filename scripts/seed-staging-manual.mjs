#!/usr/bin/env node

import process from "node:process";
import { createClient } from "@supabase/supabase-js";

const DEFAULT_STAGING_BASE_URL = "https://staging.golfdataviz.com";
const CURRENT_METHODOLOGY_VERSION = "3.1.0";
const LEGACY_METHODOLOGY_VERSION = "2.0.0";
const BENCHMARK_VERSION = "1.0.0";
const CALIBRATION_VERSION = "seed-1.0.0";
const ATTRIBUTION_VERSION = "ac-1.0.0";

const QA_USERS = [
  {
    key: "empty",
    email: "qa-empty@staging.golfdataviz.local",
    label: "QA Empty",
    premiumStatus: "free",
    premiumExpiresAt: null,
  },
  {
    key: "starter",
    email: "qa-starter@staging.golfdataviz.local",
    label: "QA Starter",
    premiumStatus: "free",
    premiumExpiresAt: null,
  },
  {
    key: "history",
    email: "qa-history@staging.golfdataviz.local",
    label: "QA History",
    premiumStatus: "free",
    premiumExpiresAt: null,
  },
  {
    key: "premium",
    email: "qa-premium@staging.golfdataviz.local",
    label: "QA Premium",
    premiumStatus: "premium",
    premiumExpiresAt: "2026-12-31T23:59:59.000Z",
  },
];

const FIXTURE_IDS = {
  starterRound1: "11111111-1111-4111-8111-111111111101",
  starterRound2: "11111111-1111-4111-8111-111111111102",
  historyRound1Legacy: "22222222-2222-4222-8222-222222222201",
  historyRound2: "22222222-2222-4222-8222-222222222202",
  historyRound3Trouble: "22222222-2222-4222-8222-222222222203",
  historyRound4: "22222222-2222-4222-8222-222222222204",
  historyRound5Shared: "22222222-2222-4222-8222-222222222205",
  premiumRound1: "33333333-3333-4333-8333-333333333301",
  premiumRound2: "33333333-3333-4333-8333-333333333302",
  premiumRound3: "33333333-3333-4333-8333-333333333303",
  premiumRound4: "33333333-3333-4333-8333-333333333304",
  premiumRound5: "33333333-3333-4333-8333-333333333305",
  premiumRound6: "33333333-3333-4333-8333-333333333306",
  premiumRound7: "33333333-3333-4333-8333-333333333307",
  premiumRound8: "33333333-3333-4333-8333-333333333308",
  historyShare: "44444444-4444-4444-8444-444444444401",
  troubleHole1: "55555555-5555-4555-8555-555555555501",
  troubleHole2: "55555555-5555-4555-8555-555555555502",
};

const HISTORY_SHARE_TOKEN = "qa-history-share-token";

function requireEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function createTimestamp(date, hour) {
  return `${date}T${hour.toString().padStart(2, "0")}:00:00.000Z`;
}

function makeRound({
  id,
  userId,
  playedAt,
  courseName,
  score,
  handicapIndex,
  courseRating,
  slopeRating,
  fairwaysHit,
  fairwayAttempts,
  greensInRegulation,
  totalPutts,
  penaltyStrokes,
  eagles,
  birdies,
  pars,
  bogeys,
  doubleBogeys,
  triplePlus,
  upAndDownAttempts = null,
  upAndDownConverted = null,
  sandSaveAttempts = null,
  sandSaves = null,
  threePutts = null,
  sgOffTheTee,
  sgApproach,
  sgAroundTheGreen,
  sgPutting,
  benchmarkBracket,
  methodologyVersion = CURRENT_METHODOLOGY_VERSION,
  benchmarkVersion = BENCHMARK_VERSION,
  benchmarkInterpolationMode = "standard",
  calibrationVersion = CALIBRATION_VERSION,
  totalAnchorMode = "course_adjusted",
  totalAnchorValue,
  confidenceOffTheTee = "medium",
  confidenceApproach = "high",
  confidenceAroundTheGreen = "medium",
  confidencePutting = "high",
  estimatedCategories = [],
  skippedCategories = [],
  attributionVersion = null,
  hasTroubleContext = false,
  troubleTeeCount = 0,
  troubleApproachCount = 0,
  troubleAroundGreenCount = 0,
  troublePuttingCount = 0,
  troublePenaltyCount = 0,
}) {
  const sgTotal = Number(
    (sgOffTheTee + sgApproach + sgAroundTheGreen + sgPutting).toFixed(2)
  );

  return {
    id,
    user_id: userId,
    created_at: createTimestamp(playedAt, 18),
    played_at: playedAt,
    course_name: courseName,
    score,
    handicap_index: handicapIndex,
    course_rating: courseRating,
    slope_rating: slopeRating,
    fairways_hit: fairwaysHit,
    fairway_attempts: fairwayAttempts,
    greens_in_regulation: greensInRegulation,
    total_putts: totalPutts,
    penalty_strokes: penaltyStrokes,
    eagles,
    birdies,
    pars,
    bogeys,
    double_bogeys: doubleBogeys,
    triple_plus: triplePlus,
    up_and_down_attempts: upAndDownAttempts,
    up_and_down_converted: upAndDownConverted,
    sand_save_attempts: sandSaveAttempts,
    sand_saves: sandSaves,
    three_putts: threePutts,
    sg_total: sgTotal,
    sg_off_the_tee: sgOffTheTee,
    sg_approach: sgApproach,
    sg_around_the_green: sgAroundTheGreen,
    sg_putting: sgPutting,
    benchmark_bracket: benchmarkBracket,
    benchmark_version: benchmarkVersion,
    benchmark_handicap: handicapIndex,
    benchmark_interpolation_mode: benchmarkInterpolationMode,
    methodology_version: methodologyVersion,
    calibration_version: calibrationVersion,
    total_anchor_mode: totalAnchorMode,
    total_anchor_value:
      totalAnchorValue === undefined ? sgTotal : totalAnchorValue,
    reconciliation_scale_factor: 1,
    reconciliation_flags: [],
    confidence_off_the_tee: confidenceOffTheTee,
    confidence_approach: confidenceApproach,
    confidence_around_the_green: confidenceAroundTheGreen,
    confidence_putting: confidencePutting,
    estimated_categories: estimatedCategories,
    skipped_categories: skippedCategories,
    has_trouble_context: hasTroubleContext,
    trouble_hole_count:
      troubleTeeCount +
      troubleApproachCount +
      troubleAroundGreenCount +
      troublePuttingCount +
      troublePenaltyCount,
    trouble_tee_count: troubleTeeCount,
    trouble_approach_count: troubleApproachCount,
    trouble_around_green_count: troubleAroundGreenCount,
    trouble_putting_count: troublePuttingCount,
    trouble_penalty_count: troublePenaltyCount,
    attribution_version: attributionVersion,
    trust_status: "trusted",
    trust_reasons: ["qa_seed_manual"],
    trust_scored_at: createTimestamp(playedAt, 19),
  };
}

function buildRounds(userIds) {
  return [
    makeRound({
      id: FIXTURE_IDS.starterRound1,
      userId: userIds.starter,
      playedAt: "2026-02-22",
      courseName: "[QA] Presidio Golf Course",
      score: 89,
      handicapIndex: 14.3,
      courseRating: 72.4,
      slopeRating: 129,
      fairwaysHit: 6,
      fairwayAttempts: 14,
      greensInRegulation: 5,
      totalPutts: 34,
      penaltyStrokes: 2,
      eagles: 0,
      birdies: 1,
      pars: 6,
      bogeys: 8,
      doubleBogeys: 2,
      triplePlus: 1,
      upAndDownAttempts: 5,
      upAndDownConverted: 2,
      sgOffTheTee: 0.2,
      sgApproach: -0.7,
      sgAroundTheGreen: -0.3,
      sgPutting: -0.2,
      benchmarkBracket: "10-15",
      confidenceAroundTheGreen: "high",
    }),
    makeRound({
      id: FIXTURE_IDS.starterRound2,
      userId: userIds.starter,
      playedAt: "2026-03-01",
      courseName: "[QA] Presidio Golf Course",
      score: 86,
      handicapIndex: 14.1,
      courseRating: 72.4,
      slopeRating: 129,
      fairwaysHit: 7,
      fairwayAttempts: 14,
      greensInRegulation: 6,
      totalPutts: 33,
      penaltyStrokes: 1,
      eagles: 0,
      birdies: 1,
      pars: 7,
      bogeys: 7,
      doubleBogeys: 2,
      triplePlus: 1,
      upAndDownAttempts: 4,
      upAndDownConverted: 2,
      sgOffTheTee: 0.3,
      sgApproach: -0.3,
      sgAroundTheGreen: 0,
      sgPutting: -0.1,
      benchmarkBracket: "10-15",
      confidenceAroundTheGreen: "high",
    }),
    makeRound({
      id: FIXTURE_IDS.historyRound1Legacy,
      userId: userIds.history,
      playedAt: "2026-01-25",
      courseName: "[QA] Torrey Pines North",
      score: 91,
      handicapIndex: 14.4,
      courseRating: 72.8,
      slopeRating: 131,
      fairwaysHit: 6,
      fairwayAttempts: 14,
      greensInRegulation: 5,
      totalPutts: 35,
      penaltyStrokes: 2,
      eagles: 0,
      birdies: 1,
      pars: 5,
      bogeys: 9,
      doubleBogeys: 2,
      triplePlus: 1,
      upAndDownAttempts: 5,
      upAndDownConverted: 2,
      sgOffTheTee: 0.1,
      sgApproach: -1.3,
      sgAroundTheGreen: -0.4,
      sgPutting: -0.2,
      benchmarkBracket: "10-15",
      methodologyVersion: LEGACY_METHODOLOGY_VERSION,
      calibrationVersion: null,
      totalAnchorMode: null,
      totalAnchorValue: null,
      confidenceOffTheTee: null,
      confidenceApproach: null,
      confidenceAroundTheGreen: null,
      confidencePutting: null,
    }),
    makeRound({
      id: FIXTURE_IDS.historyRound2,
      userId: userIds.history,
      playedAt: "2026-02-08",
      courseName: "[QA] Torrey Pines North",
      score: 88,
      handicapIndex: 14.2,
      courseRating: 72.8,
      slopeRating: 131,
      fairwaysHit: 7,
      fairwayAttempts: 14,
      greensInRegulation: 6,
      totalPutts: 33,
      penaltyStrokes: 1,
      eagles: 0,
      birdies: 1,
      pars: 7,
      bogeys: 7,
      doubleBogeys: 2,
      triplePlus: 1,
      upAndDownAttempts: 4,
      upAndDownConverted: 2,
      sgOffTheTee: 0,
      sgApproach: -0.9,
      sgAroundTheGreen: -0.3,
      sgPutting: 0.1,
      benchmarkBracket: "10-15",
      confidenceAroundTheGreen: "high",
    }),
    makeRound({
      id: FIXTURE_IDS.historyRound3Trouble,
      userId: userIds.history,
      playedAt: "2026-02-22",
      courseName: "[QA] Encinitas Ranch",
      score: 86,
      handicapIndex: 14.1,
      courseRating: 71.9,
      slopeRating: 128,
      fairwaysHit: 8,
      fairwayAttempts: 14,
      greensInRegulation: 7,
      totalPutts: 32,
      penaltyStrokes: 1,
      eagles: 0,
      birdies: 1,
      pars: 8,
      bogeys: 6,
      doubleBogeys: 2,
      triplePlus: 1,
      upAndDownAttempts: 4,
      upAndDownConverted: 2,
      sgOffTheTee: 0.2,
      sgApproach: -0.4,
      sgAroundTheGreen: -0.1,
      sgPutting: 0.1,
      benchmarkBracket: "10-15",
      confidenceAroundTheGreen: "high",
      hasTroubleContext: true,
      troubleTeeCount: 1,
      troublePenaltyCount: 1,
      attributionVersion: ATTRIBUTION_VERSION,
    }),
    makeRound({
      id: FIXTURE_IDS.historyRound4,
      userId: userIds.history,
      playedAt: "2026-03-01",
      courseName: "[QA] Aviara Golf Club",
      score: 84,
      handicapIndex: 14.0,
      courseRating: 73.2,
      slopeRating: 133,
      fairwaysHit: 8,
      fairwayAttempts: 14,
      greensInRegulation: 8,
      totalPutts: 31,
      penaltyStrokes: 1,
      eagles: 0,
      birdies: 2,
      pars: 8,
      bogeys: 6,
      doubleBogeys: 1,
      triplePlus: 1,
      upAndDownAttempts: 3,
      upAndDownConverted: 2,
      sgOffTheTee: 0.3,
      sgApproach: 0.2,
      sgAroundTheGreen: 0,
      sgPutting: 0.2,
      benchmarkBracket: "10-15",
      confidenceAroundTheGreen: "high",
    }),
    makeRound({
      id: FIXTURE_IDS.historyRound5Shared,
      userId: userIds.history,
      playedAt: "2026-03-08",
      courseName: "[QA] Coronado Golf Course",
      score: 82,
      handicapIndex: 13.9,
      courseRating: 71.2,
      slopeRating: 127,
      fairwaysHit: 9,
      fairwayAttempts: 14,
      greensInRegulation: 9,
      totalPutts: 30,
      penaltyStrokes: 0,
      eagles: 0,
      birdies: 3,
      pars: 8,
      bogeys: 5,
      doubleBogeys: 1,
      triplePlus: 1,
      upAndDownAttempts: 3,
      upAndDownConverted: 2,
      sgOffTheTee: 0.4,
      sgApproach: 0.6,
      sgAroundTheGreen: 0.1,
      sgPutting: 0.3,
      benchmarkBracket: "10-15",
      confidenceAroundTheGreen: "high",
    }),
    makeRound({
      id: FIXTURE_IDS.premiumRound1,
      userId: userIds.premium,
      playedAt: "2026-01-10",
      courseName: "[QA] Rustic Canyon",
      score: 82,
      handicapIndex: 8.6,
      courseRating: 73.1,
      slopeRating: 135,
      fairwaysHit: 8,
      fairwayAttempts: 14,
      greensInRegulation: 7,
      totalPutts: 32,
      penaltyStrokes: 2,
      eagles: 0,
      birdies: 2,
      pars: 7,
      bogeys: 7,
      doubleBogeys: 1,
      triplePlus: 1,
      upAndDownAttempts: 4,
      upAndDownConverted: 2,
      sgOffTheTee: -0.1,
      sgApproach: -0.4,
      sgAroundTheGreen: -0.1,
      sgPutting: -0.2,
      benchmarkBracket: "5-10",
      confidenceAroundTheGreen: "high",
    }),
    makeRound({
      id: FIXTURE_IDS.premiumRound2,
      userId: userIds.premium,
      playedAt: "2026-01-17",
      courseName: "[QA] Rustic Canyon",
      score: 81,
      handicapIndex: 8.5,
      courseRating: 73.1,
      slopeRating: 135,
      fairwaysHit: 8,
      fairwayAttempts: 14,
      greensInRegulation: 8,
      totalPutts: 31,
      penaltyStrokes: 1,
      eagles: 0,
      birdies: 2,
      pars: 8,
      bogeys: 6,
      doubleBogeys: 1,
      triplePlus: 1,
      upAndDownAttempts: 4,
      upAndDownConverted: 2,
      sgOffTheTee: 0,
      sgApproach: -0.2,
      sgAroundTheGreen: -0.1,
      sgPutting: -0.1,
      benchmarkBracket: "5-10",
      confidenceAroundTheGreen: "high",
    }),
    makeRound({
      id: FIXTURE_IDS.premiumRound3,
      userId: userIds.premium,
      playedAt: "2026-01-24",
      courseName: "[QA] Oak Quarry",
      score: 79,
      handicapIndex: 8.4,
      courseRating: 72.3,
      slopeRating: 132,
      fairwaysHit: 9,
      fairwayAttempts: 14,
      greensInRegulation: 8,
      totalPutts: 31,
      penaltyStrokes: 1,
      eagles: 0,
      birdies: 2,
      pars: 9,
      bogeys: 5,
      doubleBogeys: 1,
      triplePlus: 1,
      upAndDownAttempts: 3,
      upAndDownConverted: 2,
      sgOffTheTee: 0.1,
      sgApproach: 0,
      sgAroundTheGreen: 0,
      sgPutting: 0,
      benchmarkBracket: "5-10",
      confidenceAroundTheGreen: "high",
    }),
    makeRound({
      id: FIXTURE_IDS.premiumRound4,
      userId: userIds.premium,
      playedAt: "2026-02-07",
      courseName: "[QA] Oak Quarry",
      score: 78,
      handicapIndex: 8.3,
      courseRating: 72.3,
      slopeRating: 132,
      fairwaysHit: 9,
      fairwayAttempts: 14,
      greensInRegulation: 9,
      totalPutts: 30,
      penaltyStrokes: 1,
      eagles: 0,
      birdies: 3,
      pars: 8,
      bogeys: 5,
      doubleBogeys: 1,
      triplePlus: 1,
      upAndDownAttempts: 3,
      upAndDownConverted: 2,
      sgOffTheTee: 0.1,
      sgApproach: 0.1,
      sgAroundTheGreen: 0,
      sgPutting: 0.1,
      benchmarkBracket: "5-10",
      confidenceAroundTheGreen: "high",
    }),
    makeRound({
      id: FIXTURE_IDS.premiumRound5,
      userId: userIds.premium,
      playedAt: "2026-02-14",
      courseName: "[QA] Pelican Hill North",
      score: 79,
      handicapIndex: 8.2,
      courseRating: 73.5,
      slopeRating: 136,
      fairwaysHit: 8,
      fairwayAttempts: 14,
      greensInRegulation: 8,
      totalPutts: 31,
      penaltyStrokes: 1,
      eagles: 0,
      birdies: 2,
      pars: 9,
      bogeys: 5,
      doubleBogeys: 1,
      triplePlus: 1,
      upAndDownAttempts: 4,
      upAndDownConverted: 2,
      sgOffTheTee: 0,
      sgApproach: 0.1,
      sgAroundTheGreen: -0.1,
      sgPutting: 0,
      benchmarkBracket: "5-10",
      confidenceAroundTheGreen: "high",
    }),
    makeRound({
      id: FIXTURE_IDS.premiumRound6,
      userId: userIds.premium,
      playedAt: "2026-02-21",
      courseName: "[QA] Pelican Hill North",
      score: 77,
      handicapIndex: 8.1,
      courseRating: 73.5,
      slopeRating: 136,
      fairwaysHit: 9,
      fairwayAttempts: 14,
      greensInRegulation: 9,
      totalPutts: 29,
      penaltyStrokes: 1,
      eagles: 0,
      birdies: 3,
      pars: 8,
      bogeys: 5,
      doubleBogeys: 1,
      triplePlus: 1,
      upAndDownAttempts: 3,
      upAndDownConverted: 2,
      sgOffTheTee: 0.2,
      sgApproach: 0.2,
      sgAroundTheGreen: 0,
      sgPutting: 0.1,
      benchmarkBracket: "5-10",
      confidenceAroundTheGreen: "high",
    }),
    makeRound({
      id: FIXTURE_IDS.premiumRound7,
      userId: userIds.premium,
      playedAt: "2026-03-01",
      courseName: "[QA] Maderas Golf Club",
      score: 76,
      handicapIndex: 8.0,
      courseRating: 74.2,
      slopeRating: 139,
      fairwaysHit: 10,
      fairwayAttempts: 14,
      greensInRegulation: 10,
      totalPutts: 29,
      penaltyStrokes: 0,
      eagles: 0,
      birdies: 3,
      pars: 9,
      bogeys: 5,
      doubleBogeys: 1,
      triplePlus: 0,
      upAndDownAttempts: 2,
      upAndDownConverted: 1,
      sgOffTheTee: 0.2,
      sgApproach: 0.3,
      sgAroundTheGreen: 0,
      sgPutting: 0.2,
      benchmarkBracket: "5-10",
      confidenceAroundTheGreen: "high",
    }),
    makeRound({
      id: FIXTURE_IDS.premiumRound8,
      userId: userIds.premium,
      playedAt: "2026-03-08",
      courseName: "[QA] Maderas Golf Club",
      score: 77,
      handicapIndex: 7.9,
      courseRating: 74.2,
      slopeRating: 139,
      fairwaysHit: 9,
      fairwayAttempts: 14,
      greensInRegulation: 9,
      totalPutts: 30,
      penaltyStrokes: 1,
      eagles: 0,
      birdies: 2,
      pars: 10,
      bogeys: 4,
      doubleBogeys: 2,
      triplePlus: 0,
      upAndDownAttempts: 3,
      upAndDownConverted: 2,
      sgOffTheTee: 0.1,
      sgApproach: 0.2,
      sgAroundTheGreen: 0,
      sgPutting: 0.1,
      benchmarkBracket: "5-10",
      confidenceAroundTheGreen: "high",
    }),
  ];
}

function buildTroubleHoles() {
  return [
    {
      id: FIXTURE_IDS.troubleHole1,
      round_id: FIXTURE_IDS.historyRound3Trouble,
      created_at: createTimestamp("2026-02-22", 20),
      hole_number: 4,
      primary_cause: "tee",
    },
    {
      id: FIXTURE_IDS.troubleHole2,
      round_id: FIXTURE_IDS.historyRound3Trouble,
      created_at: createTimestamp("2026-02-22", 20),
      hole_number: 11,
      primary_cause: "penalty",
    },
  ];
}

async function expectNoError(step, promise) {
  const { error, data } = await promise;
  if (error) {
    throw new Error(`${step} failed: ${error.message}`);
  }
  return data;
}

async function findUserByEmail(supabase, email) {
  let page = 1;
  const perPage = 200;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage,
    });

    if (error) {
      throw new Error(`Failed to list auth users: ${error.message}`);
    }

    const match = data.users.find((user) => user.email === email);
    if (match) {
      return match;
    }

    if (data.users.length < perPage) {
      return null;
    }

    page += 1;
  }
}

async function ensureQaUser(supabase, fixture, password) {
  const existing = await findUserByEmail(supabase, fixture.email);
  const payload = {
    password,
    email_confirm: true,
    user_metadata: {
      qaSeed: true,
      qaLabel: fixture.label,
    },
  };

  if (existing) {
    const { data, error } = await supabase.auth.admin.updateUserById(
      existing.id,
      payload
    );

    if (error) {
      throw new Error(`Failed to update QA user ${fixture.email}: ${error.message}`);
    }

    return { ...fixture, id: data.user.id };
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email: fixture.email,
    ...payload,
  });

  if (error || !data.user) {
    throw new Error(
      `Failed to create QA user ${fixture.email}: ${error?.message ?? "missing user"}`
    );
  }

  return { ...fixture, id: data.user.id };
}

async function resetQaData(supabase, userIds) {
  await expectNoError(
    "delete lesson report shares",
    supabase.from("lesson_report_shares").delete().in("owner_id", userIds)
  );
  await expectNoError(
    "delete lesson reports",
    supabase.from("lesson_reports").delete().in("user_id", userIds)
  );
  await expectNoError(
    "delete rounds",
    supabase.from("rounds").delete().in("user_id", userIds)
  );
}

async function seedUserProfiles(supabase, fixtures) {
  const rows = fixtures.map((fixture) => ({
    user_id: fixture.id,
    premium_status: fixture.premiumStatus,
    premium_expires_at: fixture.premiumExpiresAt,
    updated_at: new Date().toISOString(),
  }));

  await expectNoError(
    "upsert user profiles",
    supabase.from("user_profiles").upsert(rows, { onConflict: "user_id" })
  );
}

async function seedRoundsAndArtifacts(supabase, userIds) {
  const rounds = buildRounds(userIds);
  await expectNoError("insert rounds", supabase.from("rounds").insert(rounds));

  await expectNoError(
    "insert trouble holes",
    supabase.from("round_trouble_holes").insert(buildTroubleHoles())
  );

  await expectNoError(
    "insert round share",
    supabase.from("round_shares").insert({
      id: FIXTURE_IDS.historyShare,
      round_id: FIXTURE_IDS.historyRound5Shared,
      owner_id: userIds.history,
      token: HISTORY_SHARE_TOKEN,
      created_at: createTimestamp("2026-03-08", 21),
    })
  );
}

async function getRoundCounts(supabase, userIds) {
  const counts = {};

  for (const [key, userId] of Object.entries(userIds)) {
    const { count, error } = await supabase
      .from("rounds")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId);

    if (error) {
      throw new Error(`fetch ${key} rounds failed: ${error.message}`);
    }

    counts[key] = count ?? 0;
  }

  return counts;
}

async function main() {
  const stagingUrl = requireEnv("STAGING_SUPABASE_URL");
  const serviceRoleKey = requireEnv("STAGING_SUPABASE_SERVICE_ROLE_KEY");
  const qaPassword = requireEnv("STAGING_QA_PASSWORD");
  const stagingBaseUrl =
    process.env.STAGING_BASE_URL?.trim() ?? DEFAULT_STAGING_BASE_URL;

  if (qaPassword.length < 12) {
    throw new Error("STAGING_QA_PASSWORD must be at least 12 characters long.");
  }

  if (!stagingBaseUrl.startsWith("https://staging.")) {
    throw new Error(
      `Refusing to run manual QA seed against a non-staging base URL: ${stagingBaseUrl}`
    );
  }

  const STAGING_SUPABASE_REF = "uxelgkeagzjnwmjspcda";
  if (!stagingUrl.includes(STAGING_SUPABASE_REF)) {
    throw new Error(
      `STAGING_SUPABASE_URL does not contain the staging project ref (${STAGING_SUPABASE_REF}). ` +
      `Got: ${stagingUrl}. Refusing to seed — this may be pointing at production.`
    );
  }

  const supabase = createClient(stagingUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  console.log("Ensuring dedicated QA users exist...");
  const qaUsers = [];
  for (const fixture of QA_USERS) {
    qaUsers.push(await ensureQaUser(supabase, fixture, qaPassword));
  }

  const userIds = Object.fromEntries(
    qaUsers.map((fixture) => [fixture.key, fixture.id])
  );

  console.log("Resetting QA-owned staging data...");
  await resetQaData(
    supabase,
    qaUsers.map((fixture) => fixture.id)
  );

  console.log("Upserting QA user profiles...");
  await seedUserProfiles(supabase, qaUsers);

  console.log("Inserting deterministic QA rounds and artifacts...");
  await seedRoundsAndArtifacts(supabase, userIds);

  const roundCounts = await getRoundCounts(supabase, userIds);

  console.log("");
  console.log("Staging QA seed complete.");
  console.log("");
  console.log("Accounts:");
  for (const fixture of qaUsers) {
    console.log(
      `- ${fixture.email} (${fixture.premiumStatus}) -> ${roundCounts[fixture.key] ?? 0} rounds`
    );
  }
  console.log("");
  console.log("Manual QA links:");
  console.log(`- History: ${stagingBaseUrl}/strokes-gained/history`);
  console.log(`- Lesson Prep: ${stagingBaseUrl}/strokes-gained/lesson-prep`);
  console.log(
    `- Shared Round: ${stagingBaseUrl}/strokes-gained/shared/round/${HISTORY_SHARE_TOKEN}`
  );
  console.log(
    `- Trouble Round Detail (qa-history): ${stagingBaseUrl}/strokes-gained/rounds/${FIXTURE_IDS.historyRound3Trouble}`
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
