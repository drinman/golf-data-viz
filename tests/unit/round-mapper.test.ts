import { describe, it, expect, expectTypeOf } from "vitest";
import { toRoundInsert } from "@/lib/golf/round-mapper";
import type { TablesInsert } from "@/lib/supabase/database.types";
import { makeRound, makeSGResult } from "../fixtures/factories";

// --- Tests ---

describe("toRoundInsert", () => {
  it("maps course to course_name and date to played_at", () => {
    const row = toRoundInsert(
      makeRound({ course: "Pebble Beach", date: "2026-06-15" }),
      makeSGResult()
    );
    expect(row.course_name).toBe("Pebble Beach");
    expect(row.played_at).toBe("2026-06-15");
  });

  it("maps all camelCase stat fields to snake_case", () => {
    const round = makeRound({
      handicapIndex: 14.3,
      courseRating: 72.0,
      slopeRating: 130,
      fairwaysHit: 7,
      fairwayAttempts: 14,
      greensInRegulation: 6,
      totalPutts: 33,
      penaltyStrokes: 2,
      doubleBogeys: 2,
      triplePlus: 1,
    });
    const row = toRoundInsert(round, makeSGResult());
    expect(row.handicap_index).toBe(14.3);
    expect(row.course_rating).toBe(72.0);
    expect(row.slope_rating).toBe(130);
    expect(row.fairways_hit).toBe(7);
    expect(row.fairway_attempts).toBe(14);
    expect(row.greens_in_regulation).toBe(6);
    expect(row.total_putts).toBe(33);
    expect(row.penalty_strokes).toBe(2);
    expect(row.double_bogeys).toBe(2);
    expect(row.triple_plus).toBe(1);
  });

  it("includes all SG calculated values and benchmark_bracket", () => {
    const sg = makeSGResult({
      total: 2.5,
      categories: {
        "off-the-tee": 1.0,
        approach: 0.5,
        "around-the-green": 0.8,
        putting: 0.2,
      },
      benchmarkBracket: "15-20",
    });
    const row = toRoundInsert(makeRound(), sg);
    expect(row.sg_total).toBe(2.5);
    expect(row.sg_off_the_tee).toBe(1.0);
    expect(row.sg_approach).toBe(0.5);
    expect(row.sg_around_the_green).toBe(0.8);
    expect(row.sg_putting).toBe(0.2);
    expect(row.benchmark_bracket).toBe("15-20");
  });

  it("maps undefined optional fields to null", () => {
    const round = makeRound();
    delete round.upAndDownAttempts;
    delete round.upAndDownConverted;
    delete round.sandSaves;
    delete round.sandSaveAttempts;
    delete round.threePutts;
    const row = toRoundInsert(round, makeSGResult());
    expect(row.up_and_down_attempts).toBeNull();
    expect(row.up_and_down_converted).toBeNull();
    expect(row.sand_saves).toBeNull();
    expect(row.sand_save_attempts).toBeNull();
    expect(row.three_putts).toBeNull();
  });

  it("maps present optional fields to their values", () => {
    const round = makeRound({
      upAndDownAttempts: 8,
      upAndDownConverted: 4,
      sandSaveAttempts: 3,
      sandSaves: 1,
      threePutts: 2,
    });
    const row = toRoundInsert(round, makeSGResult());
    expect(row.up_and_down_attempts).toBe(8);
    expect(row.up_and_down_converted).toBe(4);
    expect(row.sand_save_attempts).toBe(3);
    expect(row.sand_saves).toBe(1);
    expect(row.three_putts).toBe(2);
  });

  it("does not include id, user_id, or created_at", () => {
    const row = toRoundInsert(makeRound(), makeSGResult());
    expect(row).not.toHaveProperty("id");
    expect(row).not.toHaveProperty("user_id");
    expect(row).not.toHaveProperty("created_at");
  });

  it("returns a value assignable to TablesInsert<'rounds'>", () => {
    const row = toRoundInsert(makeRound(), makeSGResult());
    expectTypeOf(row).toMatchTypeOf<TablesInsert<"rounds">>();
  });

  it("passes through fields with identical names", () => {
    const round = makeRound({
      score: 92,
      eagles: 1,
      birdies: 3,
      pars: 8,
      bogeys: 5,
    });
    const row = toRoundInsert(round, makeSGResult());
    expect(row.score).toBe(92);
    expect(row.eagles).toBe(1);
    expect(row.birdies).toBe(3);
    expect(row.pars).toBe(8);
    expect(row.bogeys).toBe(5);
  });
});
