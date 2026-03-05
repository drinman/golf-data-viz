"use client";
/* eslint-disable react-hooks/incompatible-library -- react-hook-form watch() is intentionally reactive */

import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { roundInputSchema, type RoundInputFormData } from "@/lib/golf/schemas";
import { getBracketForHandicap } from "@/lib/golf/benchmarks";
import type { RoundInput } from "@/lib/golf/types";

interface RoundInputFormProps {
  onSubmit: (
    data: RoundInput,
    options?: { saveToCloud: boolean }
  ) => void;
  initialValues?: Partial<RoundInput> | null;
  isCalculating?: boolean;
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
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="flex items-center gap-2 text-base font-semibold tracking-wide text-neutral-950">
      <span className="h-4 w-0.5 rounded-full bg-brand-800" />
      {children}
    </h2>
  );
}

const inputClass =
  "block w-full rounded-lg border-2 border-cream-200 bg-cream-100 px-3 py-2.5 text-sm transition-all duration-200 placeholder:text-neutral-400 focus:border-brand-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-800/20 hover:border-cream-200/80";

export function RoundInputForm({ onSubmit, initialValues, isCalculating }: RoundInputFormProps) {
  const [showOptional, setShowOptional] = useState(false);
  const [saveToCloud, setSaveToCloud] = useState(false);

  useEffect(() => {
    setSaveToCloud(false);
  }, [initialValues]);

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
      penaltyStrokes: 0,
      eagles: 0,
      doubleBogeys: 0,
      triplePlus: 0,
      ...initialValues,
    },
    mode: "onBlur",
  });

  const handicapValue = watch("handicapIndex");
  const bracketLabel = (() => {
    const hcp = Number(handicapValue);
    if (!Number.isFinite(hcp) || hcp < 0 || hcp > 54) return null;
    try {
      return getBracketForHandicap(hcp).bracket;
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
    onSubmit(data, { saveToCloud });
  }

  return (
    <form
      onSubmit={handleSubmit(handleFormSubmit)}
      className="space-y-10"
      noValidate
    >
      {/* Section 1: Handicap + Bracket */}
      <div className="space-y-4">
        <SectionHeading>Your Handicap</SectionHeading>
        <div className="flex items-end gap-4">
          <div className="flex-1">
            <FormField
              label="Handicap Index"
              hint="Your official USGA index (GHIN, TheGrint, etc.)"
              error={errors.handicapIndex?.message}
            >
              <input
                type="number"
                inputMode="decimal"
                step="0.1"
                className={inputClass}
                {...register("handicapIndex")}
              />
            </FormField>
          </div>
          {bracketLabel && (
            <div className="pb-2">
              <span className="inline-block rounded-md bg-brand-900 px-3 py-1 font-mono text-xs font-medium tracking-wide text-cream-50">
                {bracketLabel} bracket
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Section 2: Course Info */}
      <div className="space-y-4">
        <SectionHeading>Course Info</SectionHeading>
        <FormField label="Course Name" error={errors.course?.message}>
          <input
            type="text"
            className={inputClass}
            placeholder="e.g., Pebble Beach"
            {...register("course")}
          />
        </FormField>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3" data-testid="course-info-row">
          <FormField label="Date" error={errors.date?.message}>
            <input type="date" className={inputClass} {...register("date")} />
          </FormField>
          <FormField
            label="Course Rating"
            hint="Found on your scorecard — not the same as par"
            error={errors.courseRating?.message}
          >
            <input
              type="number"
              inputMode="decimal"
              step="0.1"
              className={inputClass}
              placeholder="72.0"
              {...register("courseRating")}
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
              className={inputClass}
              placeholder="130"
              {...register("slopeRating")}
            />
          </FormField>
        </div>
      </div>

      {/* Section 3: Core Stats */}
      <div className="space-y-4">
        <SectionHeading>Round Stats</SectionHeading>
        <FormField label="Score" error={errors.score?.message}>
          <input
            type="number"
            inputMode="numeric"
            className={inputClass}
            placeholder="87"
            {...register("score")}
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
              className={inputClass}
              {...register("fairwaysHit")}
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
              className={inputClass}
              {...register("fairwayAttempts")}
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
              className={inputClass}
              {...register("greensInRegulation")}
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
              className={inputClass}
              {...register("totalPutts")}
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
            className={inputClass}
            {...register("penaltyStrokes")}
          />
        </FormField>
      </div>

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
            How many of each score type? Must add up to 18
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <FormField label="Eagles" error={errors.eagles?.message}>
            <input
              type="number"
              inputMode="numeric"
              className={inputClass}
              {...register("eagles")}
            />
          </FormField>
          <FormField label="Birdies" error={errors.birdies?.message}>
            <input
              type="number"
              inputMode="numeric"
              className={inputClass}
              {...register("birdies")}
            />
          </FormField>
          <FormField label="Pars" error={errors.pars?.message}>
            <input
              type="number"
              inputMode="numeric"
              className={inputClass}
              {...register("pars")}
            />
          </FormField>
          <FormField label="Bogeys" error={errors.bogeys?.message}>
            <input
              type="number"
              inputMode="numeric"
              className={inputClass}
              {...register("bogeys")}
            />
          </FormField>
          <FormField label="Doubles" error={errors.doubleBogeys?.message}>
            <input
              type="number"
              inputMode="numeric"
              className={inputClass}
              {...register("doubleBogeys")}
            />
          </FormField>
          <FormField label="Triple+" error={errors.triplePlus?.message}>
            <input
              type="number"
              inputMode="numeric"
              className={inputClass}
              {...register("triplePlus")}
            />
          </FormField>
        </div>
      </div>

      {/* Section 5: Optional Stats (Progressive Disclosure) */}
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => setShowOptional(!showOptional)}
          className="text-sm font-medium text-brand-800 transition-colors hover:text-brand-700"
        >
          {showOptional ? "Hide" : "Show"} More Stats
        </button>
        {showOptional && (
          <div className="space-y-4 rounded-lg border-2 border-cream-200 p-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                label="Up & Down Attempts"
                hint="Times you missed the green and tried to get up-and-down"
                error={errors.upAndDownAttempts?.message}
              >
                <input
                  type="number"
                  inputMode="numeric"
                  className={inputClass}
                  {...register("upAndDownAttempts")}
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
                  className={inputClass}
                  {...register("upAndDownConverted")}
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
                  className={inputClass}
                  {...register("sandSaveAttempts")}
                />
              </FormField>
              <FormField
                label="Sand Saves Made"
                error={errors.sandSaves?.message}
              >
                <input
                  type="number"
                  inputMode="numeric"
                  className={inputClass}
                  {...register("sandSaves")}
                />
              </FormField>
            </div>
            <FormField
              label="Three-Putts"
              hint="Holes where you took 3 or more putts"
              error={errors.threePutts?.message}
            >
              <input
                type="number"
                inputMode="numeric"
                className={inputClass}
                {...register("threePutts")}
              />
            </FormField>
          </div>
        )}
      </div>

      <label className="flex items-start gap-3 rounded-lg border border-cream-200 bg-cream-50 px-4 py-3 text-sm text-neutral-700">
        <input
          type="checkbox"
          className="mt-0.5 h-4 w-4 rounded border-cream-300 text-brand-800 focus:ring-brand-800/30"
          checked={saveToCloud}
          onChange={(event) => setSaveToCloud(event.target.checked)}
        />
        <span>Save this round anonymously to improve future benchmarks.</span>
      </label>

      {/* Submit */}
      <button
        type="submit"
        disabled={isCalculating}
        className="w-full rounded-lg bg-brand-800 px-4 py-3 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-brand-700 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-brand-800/30 focus:ring-offset-2 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isCalculating ? "Calculating..." : "See My Strokes Gained"}
      </button>
    </form>
  );
}
