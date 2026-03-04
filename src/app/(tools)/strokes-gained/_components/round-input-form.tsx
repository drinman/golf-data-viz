"use client";
/* eslint-disable react-hooks/incompatible-library -- react-hook-form watch() is intentionally reactive */

import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { roundInputSchema, type RoundInputFormData } from "@/lib/golf/schemas";
import { getBracketForHandicap } from "@/lib/golf/benchmarks";
import type { RoundInput } from "@/lib/golf/types";

interface RoundInputFormProps {
  onSubmit: (data: RoundInput) => void;
  initialValues?: Partial<RoundInput> | null;
  isCalculating?: boolean;
}

function FormField({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <label className="block space-y-1">
        <span className="block text-sm font-medium text-neutral-800">{label}</span>
        {children}
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
    onSubmit(data as RoundInput);
  }

  return (
    <form
      onSubmit={handleSubmit(handleFormSubmit)}
      className="space-y-8"
      noValidate
    >
      {/* Section 1: Handicap + Bracket */}
      <div className="space-y-4">
        <SectionHeading>Your Handicap</SectionHeading>
        <div className="flex items-end gap-4">
          <div className="flex-1">
            <FormField
              label="Handicap Index"
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
            placeholder="e.g., Pacifica Sharp Park"
            {...register("course")}
          />
        </FormField>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <FormField label="Date" error={errors.date?.message}>
            <input type="date" className={inputClass} {...register("date")} />
          </FormField>
          <FormField label="Course Rating" error={errors.courseRating?.message}>
            <input
              type="number"
              inputMode="decimal"
              step="0.1"
              className={inputClass}
              placeholder="72.0"
              {...register("courseRating")}
            />
          </FormField>
          <FormField label="Slope Rating" error={errors.slopeRating?.message}>
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
          <FormField label="Fairways Hit (optional)" error={errors.fairwaysHit?.message}>
            <input
              type="number"
              inputMode="numeric"
              className={inputClass}
              {...register("fairwaysHit")}
            />
          </FormField>
          <FormField
            label="Fairway Attempts"
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
            error={errors.greensInRegulation?.message}
          >
            <input
              type="number"
              inputMode="numeric"
              className={inputClass}
              {...register("greensInRegulation")}
            />
          </FormField>
          <FormField label="Total Putts" error={errors.totalPutts?.message}>
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
            <FormField label="Three-Putts" error={errors.threePutts?.message}>
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
