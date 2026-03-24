"use client";
/* eslint-disable react-hooks/incompatible-library -- react-hook-form watch() is intentionally reactive */

import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { roundInputSchema, type RoundInputFormData } from "@/lib/golf/schemas";
import { getBracketForHandicap } from "@/lib/golf/benchmarks";
import { BRACKET_LABELS } from "@/lib/golf/constants";
import type { RoundInput } from "@/lib/golf/types";

export const FIELD_META: Record<string, { group: "course_info" | "scoring_breakdown" | "optional_stats"; index: number }> = {
  course: { group: "course_info", index: 1 },
  date: { group: "course_info", index: 2 },
  score: { group: "course_info", index: 3 },
  handicapIndex: { group: "course_info", index: 4 },
  courseRating: { group: "course_info", index: 5 },
  slopeRating: { group: "course_info", index: 6 },
  fairwayAttempts: { group: "course_info", index: 7 },
  fairwaysHit: { group: "course_info", index: 8 },
  greensInRegulation: { group: "course_info", index: 9 },
  totalPutts: { group: "course_info", index: 10 },
  penaltyStrokes: { group: "course_info", index: 11 },
  eagles: { group: "scoring_breakdown", index: 12 },
  birdies: { group: "scoring_breakdown", index: 13 },
  pars: { group: "scoring_breakdown", index: 14 },
  bogeys: { group: "scoring_breakdown", index: 15 },
  doubleBogeys: { group: "scoring_breakdown", index: 16 },
  triplePlus: { group: "scoring_breakdown", index: 17 },
  upAndDownAttempts: { group: "optional_stats", index: 18 },
  upAndDownConverted: { group: "optional_stats", index: 19 },
  sandSaveAttempts: { group: "optional_stats", index: 20 },
  sandSaves: { group: "optional_stats", index: 21 },
  onePutts: { group: "optional_stats", index: 22 },
  threePutts: { group: "optional_stats", index: 23 },
};

interface RoundInputFormProps {
  onSubmit: (data: RoundInput) => void;
  initialValues?: Partial<RoundInput> | null;
  isCalculating?: boolean;
  onFieldCompleted?: (fieldName: string) => void;
}

function FormField({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-full flex-col gap-1">
      <label className="flex flex-1 flex-col gap-1">
        <span className="block text-sm font-medium text-neutral-800">{label}</span>
        {hint && (
          <p className="text-xs text-neutral-400">{hint}</p>
        )}
        <div className="mt-auto">{children}</div>
      </label>
      {error && <p className="text-xs text-amber-700">{error}</p>}
    </div>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.15em] text-neutral-600">
      <span className="h-4 w-0.5 rounded-full bg-brand-800" />
      {children}
    </h2>
  );
}

const inputClass =
  "block w-full rounded-lg border-2 border-cream-200 bg-cream-100 px-3 py-2.5 text-sm transition-all duration-200 placeholder:text-neutral-400 focus:border-brand-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-800/20 hover:border-cream-200/80";

const handleWheel: React.WheelEventHandler<HTMLInputElement> = (e) => {
  e.currentTarget.blur();
};

export function RoundInputForm({
  onSubmit,
  initialValues,
  isCalculating,
  onFieldCompleted,
}: RoundInputFormProps) {
  const [showOptional, setShowOptional] = useState(false);
  const [isPlusHandicap, setIsPlusHandicap] = useState(
    initialValues?.handicapIndex != null && initialValues.handicapIndex < 0
  );

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RoundInputFormData>({
    resolver: zodResolver(roundInputSchema) as Resolver<RoundInputFormData>,
    defaultValues: {
      date: (() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      })(),
      fairwayAttempts: 14,
      ...initialValues,
      // Rehydration: show absolute value when plus handicap
      ...(initialValues?.handicapIndex != null && initialValues.handicapIndex < 0
        ? { handicapIndex: Math.abs(initialValues.handicapIndex) }
        : {}),
    },
    mode: "onBlur",
  });

  function trackedRegister(name: keyof RoundInputFormData) {
    const registration = register(name);
    if (!onFieldCompleted) return registration;
    return {
      ...registration,
      onBlur: (e: React.FocusEvent<HTMLInputElement>) => {
        registration.onBlur(e);
        const value = e.target.value;
        if (value !== "" && value !== undefined) {
          onFieldCompleted(name);
        }
      },
    };
  }

  const handicapValue = watch("handicapIndex");
  const bracketLabel = (() => {
    const absHcp = Math.abs(Number(handicapValue));
    if (!Number.isFinite(absHcp)) return null;
    const previewHandicap = isPlusHandicap && absHcp > 0 ? -absHcp : absHcp;
    if (previewHandicap < -9.9 || previewHandicap > 54) return null;
    try {
      const bracket = getBracketForHandicap(previewHandicap);
      return BRACKET_LABELS[bracket.bracket];
    } catch {
      return null;
    }
  })();

  // Scoring sum indicator
  const [eagles, birdies, pars, bogeys, doubles, triples] = watch([
    "eagles",
    "birdies",
    "pars",
    "bogeys",
    "doubleBogeys",
    "triplePlus",
  ]);
  const scoringSum =
    (Number(eagles) || 0) +
    (Number(birdies) || 0) +
    (Number(pars) || 0) +
    (Number(bogeys) || 0) +
    (Number(doubles) || 0) +
    (Number(triples) || 0);

  function handleFormSubmit(data: RoundInputFormData) {
    const absHcp = Math.abs(data.handicapIndex);
    const handicapIndex = isPlusHandicap && absHcp > 0 ? -absHcp : absHcp;
    onSubmit({ ...data, handicapIndex });
  }

  return (
    <form
      onSubmit={handleSubmit(handleFormSubmit)}
      className="space-y-8"
      autoComplete="off"
      noValidate
    >
      {/* Section 1: Handicap + Bracket */}
      <div className="space-y-4">
        <SectionHeading>Your Handicap</SectionHeading>
        <div className="flex items-end gap-4">
          <div className="flex-1">
            <FormField
              label="Handicap Index"
              hint="Standard handicaps enter as 14.3. Plus handicaps use the + toggle and enter 2.3."
              error={errors.handicapIndex?.message}
            >
              <div className="flex">
                <button
                  type="button"
                  data-testid="plus-handicap-toggle"
                  aria-label={isPlusHandicap ? "Switch to standard handicap" : "Switch to plus handicap"}
                  onClick={() => setIsPlusHandicap((prev) => !prev)}
                  className={`shrink-0 rounded-l-lg border-2 border-r-0 px-3 py-2.5 text-sm font-semibold transition-all duration-200 ${
                    isPlusHandicap
                      ? "border-brand-800 bg-brand-800 text-white"
                      : "border-cream-200 bg-cream-100 text-neutral-600 hover:border-cream-200/80"
                  }`}
                >
                  {isPlusHandicap ? "+" : "HCP"}
                </button>
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.1"
                  min="0"
                  onWheel={handleWheel}
                  className={`${inputClass} rounded-l-none`}
                  {...trackedRegister("handicapIndex")}
                />
              </div>
            </FormField>
          </div>
          {bracketLabel && (
            <div className="pb-2">
              <span className="inline-block rounded-md bg-brand-900 px-3 py-1 font-mono text-xs font-medium tracking-wide text-cream-50">
                {bracketLabel}
              </span>
            </div>
          )}
        </div>
      </div>

      <hr className="border-cream-200" />

      {/* Section 2: Course Info */}
      <div className="space-y-4">
        <SectionHeading>Course Info</SectionHeading>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_auto]">
          <FormField label="Course Name" error={errors.course?.message}>
            <input
              type="text"
              className={inputClass}
              placeholder="e.g., Pebble Beach"
              autoComplete="off"
              autoCapitalize="words"
              {...trackedRegister("course")}
            />
          </FormField>
          <FormField label="Date" error={errors.date?.message}>
            <input type="date" className={inputClass} {...trackedRegister("date")} />
          </FormField>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2" data-testid="course-info-row">
          <FormField
            label="Course Rating"
            hint="Found on your scorecard — not the same as par"
            error={errors.courseRating?.message}
          >
            <input
              type="number"
              inputMode="decimal"
              step="0.1"
              onWheel={handleWheel}
              className={inputClass}
              placeholder="e.g. 72.0"
              {...trackedRegister("courseRating")}
            />
          </FormField>
          <FormField
            label="Slope Rating"
            hint="Also on your scorecard — higher means harder for bogey golfers"
            error={errors.slopeRating?.message}
          >
            <input
              type="number"
              inputMode="numeric"
              onWheel={handleWheel}
              className={inputClass}
              placeholder="e.g. 130"
              {...trackedRegister("slopeRating")}
            />
          </FormField>
        </div>
      </div>

      <hr className="border-cream-200" />

      {/* Section 3: Core Stats */}
      <div className="space-y-4">
        <SectionHeading>Round Stats</SectionHeading>
        <FormField label="Score" error={errors.score?.message}>
          <input
            type="number"
            inputMode="numeric"
            onWheel={handleWheel}
            className={inputClass}
            placeholder="e.g. 87"
            {...trackedRegister("score")}
          />
        </FormField>
        <div className="grid grid-cols-2 gap-4">
          <FormField
            label="Fairways Hit (optional)"
            hint="Tee shots that landed in the fairway (par 4s and 5s)"
            error={errors.fairwaysHit?.message}
          >
            <input
              type="number"
              inputMode="numeric"
              onWheel={handleWheel}
              className={inputClass}
              {...trackedRegister("fairwaysHit")}
            />
          </FormField>
          <FormField
            label="Fairway Attempts"
            hint="Par 4s + par 5s — most courses have 14"
            error={errors.fairwayAttempts?.message}
          >
            <input
              type="number"
              inputMode="numeric"
              onWheel={handleWheel}
              className={inputClass}
              {...trackedRegister("fairwayAttempts")}
            />
          </FormField>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormField
            label="Greens in Regulation (optional)"
            hint="Greens hit in par minus 2 shots"
            error={errors.greensInRegulation?.message}
          >
            <input
              type="number"
              inputMode="numeric"
              onWheel={handleWheel}
              className={inputClass}
              {...trackedRegister("greensInRegulation")}
            />
          </FormField>
          <FormField
            label="Total Putts"
            hint="Total putts for all 18 holes"
            error={errors.totalPutts?.message}
          >
            <input
              type="number"
              inputMode="numeric"
              onWheel={handleWheel}
              className={inputClass}
              {...trackedRegister("totalPutts")}
            />
          </FormField>
        </div>
        <FormField
          label="Penalty Strokes"
          hint="OB, water, lost ball — total penalty strokes"
          error={errors.penaltyStrokes?.message}
        >
          <input
            type="number"
            inputMode="numeric"
            onWheel={handleWheel}
            className={inputClass}
            placeholder="0"
            {...trackedRegister("penaltyStrokes")}
          />
        </FormField>
      </div>

      <hr className="border-cream-200" />

      {/* Section 4: Scoring Distribution */}
      <div className="space-y-4">
        <div>
          <div className="flex items-center justify-between">
            <SectionHeading>Scoring Breakdown</SectionHeading>
            <span
              className={`text-sm font-medium ${
                scoringSum === 18 ? "text-green-600" : "text-amber-700"
              } font-mono`}
            >
              {scoringSum}/18 holes
            </span>
          </div>
          <p className="mt-1 text-xs text-neutral-400">
            From your scorecard or post-round app. Must add up to 18.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <FormField label="Eagles" error={errors.eagles?.message}>
            <input
              type="number"
              inputMode="numeric"
              onWheel={handleWheel}
              className={inputClass}
              placeholder="0"
              {...trackedRegister("eagles")}
            />
          </FormField>
          <FormField label="Birdies" error={errors.birdies?.message}>
            <input
              type="number"
              inputMode="numeric"
              onWheel={handleWheel}
              className={inputClass}
              {...trackedRegister("birdies")}
            />
          </FormField>
          <FormField label="Pars" error={errors.pars?.message}>
            <input
              type="number"
              inputMode="numeric"
              onWheel={handleWheel}
              className={inputClass}
              {...trackedRegister("pars")}
            />
          </FormField>
          <FormField label="Bogeys" error={errors.bogeys?.message}>
            <input
              type="number"
              inputMode="numeric"
              onWheel={handleWheel}
              className={inputClass}
              {...trackedRegister("bogeys")}
            />
          </FormField>
          <FormField label="Doubles" error={errors.doubleBogeys?.message}>
            <input
              type="number"
              inputMode="numeric"
              onWheel={handleWheel}
              className={inputClass}
              placeholder="0"
              {...trackedRegister("doubleBogeys")}
            />
          </FormField>
          <FormField label="Triple+" error={errors.triplePlus?.message}>
            <input
              type="number"
              inputMode="numeric"
              onWheel={handleWheel}
              className={inputClass}
              placeholder="0"
              {...trackedRegister("triplePlus")}
            />
          </FormField>
        </div>
      </div>

      <hr className="border-cream-200" />

      {/* Section 5: Optional Stats (Progressive Disclosure) */}
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => setShowOptional(!showOptional)}
          className="flex items-center gap-1.5 text-sm font-medium text-brand-800 transition-colors hover:text-brand-700"
        >
          <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${showOptional ? "rotate-180" : ""}`} />
          {showOptional ? "Hide" : "Show"} More Stats
        </button>
        {showOptional && (
          <div className="space-y-4 rounded-lg border-2 border-cream-200 p-4">
            <div className="rounded-lg border border-brand-100 bg-brand-50/40 px-4 py-3">
              <p className="text-sm font-medium text-neutral-800">
                What counts as an up &amp; down?
              </p>
              <p className="mt-1.5 text-sm leading-relaxed text-neutral-600">
                Count an up-and-down when you miss the green and finish the hole
                in 2 shots from off the green. It does not have to be a par save.
              </p>
              <p className="mt-1.5 text-sm text-neutral-500">
                <strong className="font-medium text-neutral-700">Attempts</strong> = missed-green chances you&apos;re counting.{" "}
                <strong className="font-medium text-neutral-700">Made</strong> = the ones finished in 2 shots from off the green.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                label="Up & Down Attempts"
                hint="Times you missed the green and tried to get up-and-down"
                error={errors.upAndDownAttempts?.message}
              >
                <input
                  type="number"
                  inputMode="numeric"
                  onWheel={handleWheel}
                  className={inputClass}
                  {...trackedRegister("upAndDownAttempts")}
                />
              </FormField>
              <FormField
                label="Up & Downs Made"
                hint="Successful up-and-downs (got down in 2 from off the green)"
                error={errors.upAndDownConverted?.message}
              >
                <input
                  type="number"
                  inputMode="numeric"
                  onWheel={handleWheel}
                  className={inputClass}
                  {...trackedRegister("upAndDownConverted")}
                />
              </FormField>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                label="Sand Save Attempts"
                error={errors.sandSaveAttempts?.message}
              >
                <input
                  type="number"
                  inputMode="numeric"
                  onWheel={handleWheel}
                  className={inputClass}
                  {...trackedRegister("sandSaveAttempts")}
                />
              </FormField>
              <FormField
                label="Sand Saves Made"
                error={errors.sandSaves?.message}
              >
                <input
                  type="number"
                  inputMode="numeric"
                  onWheel={handleWheel}
                  className={inputClass}
                  {...trackedRegister("sandSaves")}
                />
              </FormField>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                label="One-putts"
                hint="Optional. Helps build a more complete picture of your short game."
                error={errors.onePutts?.message}
              >
                <input
                  type="number"
                  inputMode="numeric"
                  onWheel={handleWheel}
                  className={inputClass}
                  {...trackedRegister("onePutts")}
                />
              </FormField>
              <FormField
                label="Three-Putts"
                hint="Holes where you took 3 or more putts"
                error={errors.threePutts?.message}
              >
                <input
                  type="number"
                  inputMode="numeric"
                  onWheel={handleWheel}
                  className={inputClass}
                  {...trackedRegister("threePutts")}
                />
              </FormField>
            </div>
          </div>
        )}
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={isCalculating}
        className="w-full rounded-lg bg-brand-800 px-4 py-3.5 text-base font-semibold text-white shadow-md transition-all duration-200 hover:-translate-y-0.5 hover:bg-brand-700 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-brand-800/30 focus:ring-offset-2 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isCalculating ? "Calculating..." : "See My Strokes Gained"}
      </button>
    </form>
  );
}
