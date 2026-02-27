/**
 * Round persistence integration tests.
 *
 * Verifies that toRoundInsert output satisfies all DB constraints
 * and that SG values survive the round-trip to Postgres.
 *
 * Requires Docker + local Supabase running (`npm run db:start`).
 * Run with: npm run test:db
 */
import { describe, it, expect, afterAll } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { toRoundInsert } from "@/lib/golf/round-mapper";
import { calculateStrokesGained } from "@/lib/golf/strokes-gained";
import { getBracketForHandicap } from "@/lib/golf/benchmarks";
import { makeRound } from "../fixtures/factories";

const SUPABASE_URL = "http://127.0.0.1:54321";
// Default local dev service role key (not a secret — local only)
const SERVICE_ROLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";

describe("Round mapper → DB integration", () => {
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
  const insertedIds: string[] = [];

  afterAll(async () => {
    if (insertedIds.length > 0) {
      await admin.from("rounds").delete().in("id", insertedIds);
    }
  });

  it("mapped row with required fields inserts successfully", async () => {
    const round = makeRound();
    const benchmark = getBracketForHandicap(round.handicapIndex);
    const sg = calculateStrokesGained(round, benchmark);
    const row = toRoundInsert(round, sg);

    const { data, error } = await admin
      .from("rounds")
      .insert(row)
      .select("id")
      .single();

    expect(error).toBeNull();
    expect(data?.id).toBeDefined();
    if (data?.id) insertedIds.push(data.id);
  });

  it("mapped row with all optional fields inserts successfully", async () => {
    const round = makeRound({
      upAndDownAttempts: 8,
      upAndDownConverted: 4,
      sandSaveAttempts: 3,
      sandSaves: 1,
      threePutts: 2,
    });
    const benchmark = getBracketForHandicap(round.handicapIndex);
    const sg = calculateStrokesGained(round, benchmark);
    const row = toRoundInsert(round, sg);

    const { data, error } = await admin
      .from("rounds")
      .insert(row)
      .select("id")
      .single();

    expect(error).toBeNull();
    expect(data?.id).toBeDefined();
    if (data?.id) insertedIds.push(data.id);
  });

  it("mapped row with no optional fields (all null) inserts successfully", async () => {
    const round = makeRound();
    delete round.upAndDownAttempts;
    delete round.upAndDownConverted;
    delete round.sandSaves;
    delete round.sandSaveAttempts;
    delete round.threePutts;

    const benchmark = getBracketForHandicap(round.handicapIndex);
    const sg = calculateStrokesGained(round, benchmark);
    const row = toRoundInsert(round, sg);

    const { data, error } = await admin
      .from("rounds")
      .insert(row)
      .select("id")
      .single();

    expect(error).toBeNull();
    expect(data?.id).toBeDefined();
    if (data?.id) insertedIds.push(data.id);
  });

  it("stored SG values match calculated values", async () => {
    const round = makeRound();
    const benchmark = getBracketForHandicap(round.handicapIndex);
    const sg = calculateStrokesGained(round, benchmark);
    const row = toRoundInsert(round, sg);

    const { data, error } = await admin
      .from("rounds")
      .insert(row)
      .select("*")
      .single();

    expect(error).toBeNull();
    if (data?.id) insertedIds.push(data.id);

    // Use toBeCloseTo(value, 2) because sg_* columns are numeric(4,2)
    expect(data!.sg_total).toBeCloseTo(sg.total, 2);
    expect(data!.sg_off_the_tee).toBeCloseTo(sg.categories["off-the-tee"], 2);
    expect(data!.sg_approach).toBeCloseTo(sg.categories["approach"], 2);
    expect(data!.sg_around_the_green).toBeCloseTo(
      sg.categories["around-the-green"],
      2
    );
    expect(data!.sg_putting).toBeCloseTo(sg.categories["putting"], 2);
    expect(data!.benchmark_bracket).toBe(sg.benchmarkBracket);
  });
});
