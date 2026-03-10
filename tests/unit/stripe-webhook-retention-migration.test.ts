import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";

const RETENTION_MIGRATION = path.resolve(
  __dirname,
  "../../supabase/migrations/20260314120000_add_stripe_webhook_event_retention.sql"
);

describe("stripe webhook retention migration", () => {
  const sql = readFileSync(RETENTION_MIGRATION, "utf8");

  it("installs pg_cron and defines a cleanup function", () => {
    expect(sql).toMatch(/create extension if not exists pg_cron/i);
    expect(sql).toMatch(/create or replace function public\.cleanup_stripe_webhook_events/i);
    expect(sql).toMatch(/interval '90 days'/i);
  });

  it("schedules a daily cleanup job", () => {
    expect(sql).toMatch(/cron\.schedule/i);
    expect(sql).toMatch(/cleanup-stripe-webhook-events/i);
  });
});
