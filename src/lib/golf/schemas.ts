/**
 * Zod validation schema for round input form data.
 *
 * Uses z.coerce.number() for required numeric fields (HTML forms produce strings).
 * Optional numeric fields use a preprocessor to handle "" → undefined correctly,
 * preserving the semantic difference between "not tracked" and "zero".
 */

import { z } from "zod";

/**
 * Optional integer field that handles form input edge cases:
 * - "" → undefined (blank field means "not tracked")
 * - null/undefined → undefined
 * - NaN/Infinity → undefined
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
      if (!Number.isFinite(n)) return undefined;
      return n;
    })
    .pipe(z.number().int().min(0).max(max).optional());

export const roundInputSchema = z
  .object({
    course: z.string().min(1, "Course name is required").max(100),
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
    score: z.coerce
      .number()
      .int()
      .min(50, "Score must be 50–150")
      .max(150, "Score must be 50–150"),
    handicapIndex: z.coerce
      .number()
      .min(0, "Handicap must be 0–54")
      .max(54, "Handicap must be 0–54"),
    courseRating: z.coerce
      .number()
      .min(60, "Course rating must be 60–80")
      .max(80, "Course rating must be 60–80"),
    slopeRating: z.coerce
      .number()
      .int()
      .min(55, "Slope must be 55–155")
      .max(155, "Slope must be 55–155"),
    fairwaysHit: z.coerce.number().int().min(0).max(14),
    fairwayAttempts: z.coerce.number().int().min(0).max(14),
    greensInRegulation: z.coerce.number().int().min(0).max(18),
    totalPutts: z.coerce
      .number()
      .int()
      .min(0, "Putts must be 0–60")
      .max(60, "Putts must be 0–60"),
    penaltyStrokes: z.coerce.number().int().min(0).max(20),
    eagles: z.coerce.number().int().min(0).max(18),
    birdies: z.coerce.number().int().min(0).max(18),
    pars: z.coerce.number().int().min(0).max(18),
    bogeys: z.coerce.number().int().min(0).max(18),
    doubleBogeys: z.coerce.number().int().min(0).max(18),
    triplePlus: z.coerce.number().int().min(0).max(18),
    // Optional fields
    upAndDownAttempts: optionalInt(18),
    upAndDownConverted: optionalInt(18),
    sandSaveAttempts: optionalInt(18),
    sandSaves: optionalInt(18),
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
  .refine((data) => data.fairwaysHit <= data.fairwayAttempts, {
    message: "Fairways hit can't exceed fairway attempts",
    path: ["fairwaysHit"],
  })
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
      data.threePutts == null || data.threePutts <= data.totalPutts,
    {
      message: "Three-putts can't exceed total putts",
      path: ["threePutts"],
    }
  );

export type RoundInputFormData = z.infer<typeof roundInputSchema>;
