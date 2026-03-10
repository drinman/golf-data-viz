import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";

const PREMIUM_MIGRATION = path.resolve(
  __dirname,
  "../../supabase/migrations/20260314100000_add_premium_and_lesson_reports.sql"
);

describe("premium/report migration", () => {
  const sql = readFileSync(PREMIUM_MIGRATION, "utf8");

  it("backfills user_profiles for existing auth users", () => {
    expect(sql).toMatch(/insert into public\.user_profiles/i);
    expect(sql).toMatch(/select\s+id\s+from\s+auth\.users/i);
    expect(sql).toMatch(/on conflict\s*\(user_id\)\s*do nothing/i);
  });

  it("creates an auth trigger to create user_profiles for new users", () => {
    expect(sql).toMatch(/create or replace function public\.handle_new_user_profile/i);
    expect(sql).toMatch(/create trigger trg_handle_new_user_profile/i);
    expect(sql).toMatch(/after insert on auth\.users/i);
  });

  it("documents webhook retention cleanup", () => {
    expect(sql).toMatch(/90 days/i);
    expect(sql).toMatch(/stripe_webhook_events/i);
  });
});
