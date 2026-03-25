/**
 * Zod validation schema for round input form data.
 *
 * Required numeric fields use union+transform+pipe helpers so "" is rejected
 * instead of being coerced to 0. Optional numeric fields use a separate helper
 * to preserve the semantic difference between "not tracked" and "zero".
 */

import { z } from "zod";

/**
 * Optional integer field that handles form input edge cases:
 * - "" → undefined (blank field means "not tracked")
 * - null/undefined → undefined
 * - non-numeric strings ("abc") → NaN → rejected by pipe
 * - valid string numbers → coerced to number
 *
 * Uses z.pipe to keep proper TypeScript inference for react-hook-form.
 */
const optionalInt = (max: number) =>
  z
    .union([z.number(), z.string(), z.null(), z.undefined()])
    .optional()
    .transform((val): number | undefined => {
      if (val === "" || val === undefined || val === null) return undefined;
      const n = Number(val);
      // Non-finite values (NaN from "abc", Infinity) pass through as NaN
      // so the downstream z.number() pipe rejects them
      if (!Number.isFinite(n)) return NaN;
      return n;
    })
    .pipe(z.number().int().min(0).max(max).optional());

type RequiredFieldMessages = {
  required?: string;
  min?: string;
  max?: string;
};

const requiredNumber = (
  min: number,
  max: number,
  label: string,
  messages: RequiredFieldMessages = {}
) =>
  z
    .union([z.number(), z.string()])
    .refine((val) => val !== "", messages.required ?? `${label} is required`)
    .transform((val) => Number(val))
    .pipe(
      z
        .number()
        .min(min, messages.min ?? `${label} must be at least ${min}`)
        .max(max, messages.max ?? `${label} must be at most ${max}`)
    );

/**
 * Integer field where "" (empty) defaults to 0. Used for scoring breakdown
 * and penalty strokes — fields where empty semantically means zero.
 */
const intDefaultZero = (max: number, label: string) =>
  z
    .union([z.number(), z.string(), z.undefined()])
    .transform((val): number => {
      if (val === "" || val === undefined || val === null) return 0;
      const n = Number(val);
      if (!Number.isFinite(n)) return NaN;
      return n;
    })
    .pipe(
      z
        .number()
        .int(`${label} must be a whole number`)
        .min(0, `${label} must be at least 0`)
        .max(max, `${label} must be at most ${max}`)
    );

/**
 * Required integer field that rejects "" (unlike z.coerce which treats "" as 0).
 * Uses the same union+transform+pipe pattern as optionalInt above.
 */
const requiredInt = (
  min: number,
  max: number,
  label: string,
  messages: RequiredFieldMessages = {}
) =>
  z
    .union([z.number(), z.string()])
    .refine((val) => val !== "", messages.required ?? `${label} is required`)
    .transform((val) => Number(val))
    .pipe(
      z
        .number()
        .int()
        .min(min, messages.min ?? `${label} must be at least ${min}`)
        .max(max, messages.max ?? `${label} must be at most ${max}`)
    );

export const roundInputSchema = z
  .object({
    course: z
      .string()
      .trim()
      .min(1, "Course name is required")
      .max(100)
      .refine((val) => /\p{L}/u.test(val), {
        message: "Course name must include letters",
      }),
    date: z.string().refine(
      (val) => {
        const match = val.match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (!match) return false;
        const [, yearStr, monthStr, dayStr] = match;
        const year = Number(yearStr);
        const month = Number(monthStr);
        const day = Number(dayStr);
        // Round-trip: construct date and verify components match input
        // (catches invalid dates like Feb 31 which JS normalizes to Mar 3)
        const d = new Date(year, month - 1, day);
        if (
          d.getFullYear() !== year ||
          d.getMonth() !== month - 1 ||
          d.getDate() !== day
        ) {
          return false;
        }
        return d <= new Date();
      },
      { message: "Enter a valid date that is not in the future" }
    ),
    score: requiredInt(50, 150, "Score"),
    // Negative range (-9.9) is exercised by share-codec decode and direct callers.
    // The form UI stores the absolute value and negates on submit.
    // Inline (not requiredNum helper) to preserve asymmetric error messages.
    handicapIndex: z
      .union([z.number(), z.string()])
      .refine((val) => val !== "", "Handicap index is required")
      .transform((val) => Number(val))
      .pipe(
        z
          .number()
          .min(-9.9, "Plus handicap is capped at +9.9")
          .max(54, "Handicap must be between +9.9 and 54")
      ),
    courseRating: requiredNumber(60, 80, "Course rating"),
    slopeRating: requiredInt(55, 155, "Slope"),
    fairwaysHit: optionalInt(14),
    fairwayAttempts: requiredInt(0, 14, "Fairway attempts", {
      required: "Fairway attempts are required",
    }),
    greensInRegulation: optionalInt(18),
    totalPutts: requiredInt(1, 60, "Putts"),
    penaltyStrokes: intDefaultZero(20, "Penalty strokes"),
    eagles: intDefaultZero(18, "Eagles"),
    birdies: intDefaultZero(18, "Birdies"),
    pars: intDefaultZero(18, "Pars"),
    bogeys: intDefaultZero(18, "Bogeys"),
    doubleBogeys: intDefaultZero(18, "Double bogeys"),
    triplePlus: intDefaultZero(18, "Triple-plus holes"),
    // Optional fields
    upAndDownAttempts: optionalInt(18),
    upAndDownConverted: optionalInt(18),
    sandSaveAttempts: optionalInt(18),
    sandSaves: optionalInt(18),
    onePutts: optionalInt(18),
    threePutts: optionalInt(18),
  })
  .refine(
    (data) =>
      data.eagles +
        data.birdies +
        data.pars +
        data.bogeys +
        data.doubleBogeys +
        data.triplePlus ===
      18,
    {
      message: "Scoring breakdown must total 18 holes",
      path: ["triplePlus"],
    }
  )
  .refine(
    (data) =>
      data.fairwaysHit == null || data.fairwaysHit <= data.fairwayAttempts,
    {
      message: "Fairways hit can't exceed fairway attempts",
      path: ["fairwaysHit"],
    }
  )
  .refine(
    (data) =>
      data.upAndDownConverted == null ||
      data.upAndDownAttempts == null ||
      data.upAndDownConverted <= data.upAndDownAttempts,
    {
      message: "Up & downs made can't exceed attempts",
      path: ["upAndDownConverted"],
    }
  )
  .refine(
    (data) =>
      data.sandSaves == null ||
      data.sandSaveAttempts == null ||
      data.sandSaves <= data.sandSaveAttempts,
    {
      message: "Sand saves can't exceed attempts",
      path: ["sandSaves"],
    }
  )
  .refine(
    (data) =>
      data.onePutts == null || data.onePutts <= data.totalPutts,
    {
      message: "One-putts can't exceed total putts",
      path: ["onePutts"],
    }
  )
  .refine(
    (data) =>
      data.threePutts == null || data.threePutts <= data.totalPutts,
    {
      message: "Three-putts can't exceed total putts",
      path: ["threePutts"],
    }
  )
  .refine(
    (data) => (data.onePutts ?? 0) + (data.threePutts ?? 0) <= 18,
    {
      message: "One-putts and three-putts can't exceed 18 holes",
      path: ["onePutts"],
    }
  )
  .refine(
    (data) => {
      // impliedOverPar uses par as baseline; actualOverCourseRating uses course
      // rating. These differ by up to ~4 strokes on extreme courses, but the
      // tolerance absorbs the gap. Don't "fix" this by using par — we don't have it.
      // TODO: Switch this comparison to actual over par if the schema ever stores
      // course par directly.
      const impliedOverPar =
        -2 * data.eagles +
        -1 * data.birdies +
        1 * data.bogeys +
        2 * data.doubleBogeys +
        3 * data.triplePlus;
      const actualOverCourseRating = data.score - data.courseRating;
      // Scale tolerance with triplePlus count — each triple+ hole could be
      // +5, +6, or worse over par, not just the +3 we assume
      const tolerance = 8 + data.triplePlus * 2;
      return Math.abs(impliedOverPar - actualOverCourseRating) <= tolerance;
    },
    {
      message:
        "Score doesn't match your scoring breakdown — double-check your entries",
      path: ["score"],
    }
  );

export type RoundInputFormData = z.infer<typeof roundInputSchema>;
