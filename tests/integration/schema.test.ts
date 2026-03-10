/**
 * DB constraint integration tests.
 *
 * Requires Docker + local Supabase running (`npm run db:start`).
 * Run with: npm run test:db
 */
import { describe, it, expect, afterAll } from "vitest";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "http://127.0.0.1:54321";
// Default local dev service role key (not a secret — local only)
const SERVICE_ROLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";
// Default local dev anon key
const ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";

let uniqueRoundCounter = 0;

/** A valid round payload — all required fields with valid values. */
function validRound(overrides: Record<string, unknown> = {}) {
  uniqueRoundCounter += 1;

  return {
    played_at: "2025-06-15",
    course_name: `Test Course ${uniqueRoundCounter}`,
    score: 85,
    handicap_index: 14.0,
    course_rating: 72.1,
    slope_rating: 130,
    fairways_hit: 8,
    fairway_attempts: 14,
    greens_in_regulation: 8,
    total_putts: 32,
    penalty_strokes: 1,
    eagles: 0,
    birdies: 1,
    pars: 8,
    bogeys: 6,
    double_bogeys: 2,
    triple_plus: 1,
    ...overrides,
  };
}

describe("Schema constraints (local Supabase)", () => {
  // Service role client bypasses RLS — used for cleanup and constraint testing
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
  // Anon client respects RLS
  const anon = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false },
  });

  // Track IDs of rows created by this test run for scoped cleanup
  const insertedIds: string[] = [];

  afterAll(async () => {
    if (insertedIds.length > 0) {
      await admin.from("rounds").delete().in("id", insertedIds);
    }
  });

  describe("migration applies cleanly", () => {
    it("rounds table exists and accepts a valid insert", async () => {
      const { data, error } = await admin
        .from("rounds")
        .insert(validRound())
        .select("id")
        .single();

      expect(error).toBeNull();
      expect(data?.id).toBeDefined();
      if (data?.id) insertedIds.push(data.id);
    });
  });

  describe("RLS and grants: direct public writes are blocked", () => {
    it("rejects anonymous insert with user_id = NULL", async () => {
      const { error } = await anon
        .from("rounds")
        .insert(validRound({ user_id: null }));

      expect(error).not.toBeNull();
    });

    it("rejects anonymous insert with a fake user_id", async () => {
      const { error } = await anon
        .from("rounds")
        .insert(
          validRound({ user_id: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee" })
        );

      expect(error).not.toBeNull();
    });
  });

  describe("paired nullability constraints", () => {
    it("rejects up_and_down_converted without attempts", async () => {
      const { error } = await admin
        .from("rounds")
        .insert(
          validRound({
            up_and_down_converted: 3,
            up_and_down_attempts: null,
          })
        );

      expect(error).not.toBeNull();
      expect(error!.message).toContain("chk_up_and_down_paired");
    });

    it("rejects up_and_down_attempts without converted", async () => {
      const { error } = await admin
        .from("rounds")
        .insert(
          validRound({
            up_and_down_attempts: 5,
            up_and_down_converted: null,
          })
        );

      expect(error).not.toBeNull();
      expect(error!.message).toContain("chk_up_and_down_paired");
    });

    it("rejects sand_saves without attempts", async () => {
      const { error } = await admin
        .from("rounds")
        .insert(
          validRound({
            sand_saves: 2,
            sand_save_attempts: null,
          })
        );

      expect(error).not.toBeNull();
      expect(error!.message).toContain("chk_sand_saves_paired");
    });

    it("accepts both NULL for optional stat pairs", async () => {
      const { data, error } = await admin
        .from("rounds")
        .insert(
          validRound({
            up_and_down_attempts: null,
            up_and_down_converted: null,
            sand_saves: null,
            sand_save_attempts: null,
            three_putts: null,
          })
        )
        .select("id")
        .single();

      expect(error).toBeNull();
      if (data?.id) insertedIds.push(data.id);
    });

    it("accepts valid paired values", async () => {
      const { data, error } = await admin
        .from("rounds")
        .insert(
          validRound({
            up_and_down_attempts: 5,
            up_and_down_converted: 3,
            sand_saves: 1,
            sand_save_attempts: 2,
            three_putts: 2,
          })
        )
        .select("id")
        .single();

      expect(error).toBeNull();
      if (data?.id) insertedIds.push(data.id);
    });
  });

  describe("non-negative constraints", () => {
    it("rejects negative fairways_hit", async () => {
      const { error } = await admin
        .from("rounds")
        .insert(validRound({ fairways_hit: -1 }));

      expect(error).not.toBeNull();
      expect(error!.message).toContain("chk_fairways_hit_nonneg");
    });

    it("rejects negative penalty_strokes", async () => {
      const { error } = await admin
        .from("rounds")
        .insert(validRound({ penalty_strokes: -1 }));

      expect(error).not.toBeNull();
      expect(error!.message).toContain("chk_penalty_strokes_nonneg");
    });

    it("rejects negative total_putts", async () => {
      const { error } = await admin
        .from("rounds")
        .insert(validRound({ total_putts: -1 }));

      expect(error).not.toBeNull();
    });
  });

  describe("three_putts bounded by total_putts", () => {
    it("rejects three_putts exceeding total_putts", async () => {
      const { error } = await admin
        .from("rounds")
        .insert(validRound({ three_putts: 50, total_putts: 30 }));

      expect(error).not.toBeNull();
      expect(error!.message).toContain("chk_three_putts");
    });

    it("accepts three_putts equal to total_putts", async () => {
      const { data, error } = await admin
        .from("rounds")
        .insert(validRound({ three_putts: 32, total_putts: 32 }))
        .select("id")
        .single();

      expect(error).toBeNull();
      if (data?.id) insertedIds.push(data.id);
    });
  });

  describe("nullable fairways_hit and greens_in_regulation", () => {
    it("accepts fairways_hit = null", async () => {
      const { data, error } = await admin
        .from("rounds")
        .insert(validRound({ fairways_hit: null }))
        .select("id")
        .single();

      expect(error).toBeNull();
      if (data?.id) insertedIds.push(data.id);
    });

    it("accepts greens_in_regulation = null", async () => {
      const { data, error } = await admin
        .from("rounds")
        .insert(validRound({ greens_in_regulation: null }))
        .select("id")
        .single();

      expect(error).toBeNull();
      if (data?.id) insertedIds.push(data.id);
    });

    it("accepts both null simultaneously", async () => {
      const { data, error } = await admin
        .from("rounds")
        .insert(validRound({ fairways_hit: null, greens_in_regulation: null }))
        .select("id")
        .single();

      expect(error).toBeNull();
      if (data?.id) insertedIds.push(data.id);
    });

    it("still rejects negative fairways_hit when non-null", async () => {
      const { error } = await admin
        .from("rounds")
        .insert(validRound({ fairways_hit: -1 }));

      expect(error).not.toBeNull();
      expect(error!.message).toContain("chk_fairways_hit_nonneg");
    });

    it("still rejects negative greens_in_regulation when non-null", async () => {
      const { error } = await admin
        .from("rounds")
        .insert(validRound({ greens_in_regulation: -1 }));

      expect(error).not.toBeNull();
      expect(error!.message).toContain("chk_greens_in_regulation_nonneg");
    });
  });

  describe("comparison constraints", () => {
    it("rejects up_and_down_converted exceeding attempts", async () => {
      const { error } = await admin
        .from("rounds")
        .insert(
          validRound({
            up_and_down_attempts: 3,
            up_and_down_converted: 5,
          })
        );

      expect(error).not.toBeNull();
      expect(error!.message).toContain("chk_up_and_down");
    });

    it("rejects sand_saves exceeding attempts", async () => {
      const { error } = await admin
        .from("rounds")
        .insert(
          validRound({
            sand_save_attempts: 2,
            sand_saves: 4,
          })
        );

      expect(error).not.toBeNull();
      expect(error!.message).toContain("chk_sand_saves");
    });
  });

  describe("round trust defaults and constraints", () => {
    it("defaults trust_status to pending when omitted", async () => {
      const { data, error } = await admin
        .from("rounds")
        .insert(validRound())
        .select("id, trust_status")
        .single();

      expect(error).toBeNull();
      expect(data?.trust_status).toBe("pending");
      if (data?.id) insertedIds.push(data.id);
    });

    it("defaults trust_reasons to empty array when omitted", async () => {
      const { data, error } = await admin
        .from("rounds")
        .insert(validRound())
        .select("id, trust_reasons")
        .single();

      expect(error).toBeNull();
      expect(data?.trust_reasons).toEqual([]);
      if (data?.id) insertedIds.push(data.id);
    });

    it("defaults trust_scored_at to null when omitted", async () => {
      const { data, error } = await admin
        .from("rounds")
        .insert(validRound())
        .select("id, trust_scored_at")
        .single();

      expect(error).toBeNull();
      expect(data?.trust_scored_at).toBeNull();
      if (data?.id) insertedIds.push(data.id);
    });

    it("sets trust_scored_at from DB time for non-pending trust rows", async () => {
      const { data, error } = await admin
        .from("rounds")
        .insert(
          validRound({
            trust_status: "trusted",
            trust_reasons: ["seeded_in_test"],
          })
        )
        .select("id, trust_status, trust_scored_at")
        .single();

      expect(error).toBeNull();
      expect(data?.trust_status).toBe("trusted");
      expect(data?.trust_scored_at).not.toBeNull();
      if (data?.id) insertedIds.push(data.id);
    });

    it("rejects invalid trust_status values", async () => {
      const { error } = await admin
        .from("rounds")
        .insert(validRound({ trust_status: "invalid-status" }));

      expect(error).not.toBeNull();
    });
  });
});
