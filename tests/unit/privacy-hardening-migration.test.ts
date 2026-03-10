import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";

const PRIVACY_MIGRATION = path.resolve(
  __dirname,
  "../../supabase/migrations/20260314110000_harden_round_privacy.sql"
);

describe("round privacy hardening migration", () => {
  const sql = readFileSync(PRIVACY_MIGRATION, "utf8");

  it("drops the anon read policy on rounds", () => {
    expect(sql).toMatch(/drop policy if exists "Anyone can read rounds" on public\.rounds/i);
  });

  it("revokes anon select access on rounds", () => {
    expect(sql).toMatch(/revoke select on public\.rounds from anon/i);
  });
});
