import { describe, it, expect, afterAll } from "vitest";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "http://127.0.0.1:54321";
const SERVICE_ROLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";
const ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";

describe("premium/report schema (local Supabase)", () => {
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
  const anon = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false },
  });

  const createdUserIds: string[] = [];
  const createdRoundIds: string[] = [];
  const createdReportIds: string[] = [];

  afterAll(async () => {
    if (createdReportIds.length > 0) {
      await admin.from("lesson_reports").delete().in("id", createdReportIds);
    }
    if (createdRoundIds.length > 0) {
      await admin.from("rounds").delete().in("id", createdRoundIds);
    }
    for (const userId of createdUserIds) {
      await admin.auth.admin.deleteUser(userId);
    }
  });

  it("creates a user_profiles row automatically for new auth users", async () => {
    const email = `premium-${Date.now()}@example.com`;
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password: "password123",
      email_confirm: true,
    });

    expect(error).toBeNull();
    expect(data.user?.id).toBeTruthy();
    createdUserIds.push(data.user!.id);

    const { data: profile, error: profileError } = await admin
      .from("user_profiles")
      .select("user_id, premium_status")
      .eq("user_id", data.user!.id)
      .single();

    expect(profileError).toBeNull();
    expect(profile).toEqual({
      user_id: data.user!.id,
      premium_status: "free",
    });
  });

  it("blocks anonymous reads from rounds after privacy hardening", async () => {
    const { data, error } = await admin
      .from("rounds")
      .insert({
        played_at: "2026-03-10",
        course_name: "Private Test Course",
        score: 87,
        handicap_index: 14.2,
        course_rating: 72,
        slope_rating: 130,
        fairways_hit: 7,
        fairway_attempts: 14,
        greens_in_regulation: 6,
        total_putts: 33,
        penalty_strokes: 1,
        eagles: 0,
        birdies: 1,
        pars: 7,
        bogeys: 7,
        double_bogeys: 2,
        triple_plus: 1,
      })
      .select("id")
      .single();

    expect(error).toBeNull();
    createdRoundIds.push(data!.id);

    const { data: anonData, error: anonError } = await anon
      .from("rounds")
      .select("id")
      .eq("id", data!.id);

    expect(anonData).toBeNull();
    expect(anonError).not.toBeNull();
  });

  it("persists lesson reports and explicit report shares", async () => {
    const email = `report-${Date.now()}@example.com`;
    const { data: userData, error: userError } = await admin.auth.admin.createUser({
      email,
      password: "password123",
      email_confirm: true,
    });

    expect(userError).toBeNull();
    createdUserIds.push(userData.user!.id);

    const { data: report, error: reportError } = await admin
      .from("lesson_reports")
      .insert({
        user_id: userData.user!.id,
        selected_round_ids: [
          "11111111-1111-1111-1111-111111111111",
          "22222222-2222-2222-2222-222222222222",
          "33333333-3333-3333-3333-333333333333",
        ],
        selection_hash: "hash-abc",
        round_count: 3,
        report_version: "1.0.0",
        report_data: {
          summary: { roundCount: 3 },
        },
      })
      .select("id")
      .single();

    expect(reportError).toBeNull();
    createdReportIds.push(report!.id);

    const { data: share, error: shareError } = await admin
      .from("lesson_report_shares")
      .insert({
        report_id: report!.id,
        owner_id: userData.user!.id,
        token: `token-${Date.now()}`,
      })
      .select("report_id")
      .single();

    expect(shareError).toBeNull();
    expect(share?.report_id).toBe(report!.id);
  });
});
