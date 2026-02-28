"use client";

import type {
  StrokesGainedCategory,
  StrokesGainedResult,
} from "@/lib/golf/types";
import { BRACKET_LABELS } from "@/lib/golf/constants";

const CATEGORY_LABELS: Record<StrokesGainedCategory, string> = {
  "off-the-tee": "Off the Tee",
  approach: "Approach",
  "around-the-green": "Around the Green",
  putting: "Putting",
};

const CATEGORY_ORDER: StrokesGainedCategory[] = [
  "off-the-tee",
  "approach",
  "around-the-green",
  "putting",
];

function formatSG(value: number): string {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}`;
}

interface ResultsSummaryProps {
  result: StrokesGainedResult;
}

export function ResultsSummary({ result }: ResultsSummaryProps) {
  const entries = CATEGORY_ORDER.map((key) => ({
    key,
    label: CATEGORY_LABELS[key],
    value: result.categories[key],
  }));

  const sorted = [...entries].sort((a, b) => b.value - a.value);
  const strength = sorted[0];
  const weakness = sorted[sorted.length - 1];

  const bracketLabel =
    BRACKET_LABELS[result.benchmarkBracket] ?? result.benchmarkBracket;

  return (
    <div className="w-full max-w-lg space-y-6">
      {/* Benchmark bracket */}
      <p className="text-sm text-gray-500">Compared to {bracketLabel}</p>

      {/* Per-category breakdown */}
      <ul className="space-y-3">
        {entries.map(({ key, label, value }) => (
          <li
            key={key}
            className="flex items-center justify-between rounded-md border border-gray-200 px-4 py-3"
          >
            <span className="text-sm font-medium text-gray-800">{label}</span>
            <span
              className={`text-sm font-semibold ${
                value >= 0 ? "text-green-600" : "text-red-600"
              }`}
            >
              {formatSG(value)}
            </span>
          </li>
        ))}
      </ul>

      {/* Total SG */}
      <div className="flex items-center justify-between border-t border-gray-300 pt-4">
        <span className="text-base font-semibold text-gray-900">Total SG</span>
        <span
          className={`text-base font-bold ${
            result.total >= 0 ? "text-green-600" : "text-red-600"
          }`}
        >
          {formatSG(result.total)}
        </span>
      </div>

      {/* Strength & Weakness callouts */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-md bg-green-50 px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-green-700">
            Biggest Strength
          </p>
          <p className="mt-1 text-sm font-semibold text-green-800">
            {strength.label}
          </p>
          <p className="text-sm text-green-600">{formatSG(strength.value)}</p>
        </div>
        <div className="rounded-md bg-red-50 px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-red-700">
            Biggest Weakness
          </p>
          <p className="mt-1 text-sm font-semibold text-red-800">
            {weakness.label}
          </p>
          <p className="text-sm text-red-600">{formatSG(weakness.value)}</p>
        </div>
      </div>
    </div>
  );
}
