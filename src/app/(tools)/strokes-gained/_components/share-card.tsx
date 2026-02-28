"use client";

import { forwardRef } from "react";
import type {
  StrokesGainedCategory,
  StrokesGainedResult,
  RadarChartDatum,
} from "@/lib/golf/types";
import { BRACKET_LABELS } from "@/lib/golf/constants";
import { RadarChart } from "@/components/charts/radar-chart";

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

interface ShareCardProps {
  result: StrokesGainedResult;
  chartData: RadarChartDatum[];
  courseName: string;
  score: number;
}

export const ShareCard = forwardRef<HTMLDivElement, ShareCardProps>(
  function ShareCard({ result, chartData, courseName, score }, ref) {
    const bracketLabel =
      BRACKET_LABELS[result.benchmarkBracket] ?? result.benchmarkBracket;

    const entries = CATEGORY_ORDER.map((key) => ({
      key,
      label: CATEGORY_LABELS[key],
      value: result.categories[key],
    }));

    return (
      <div
        ref={ref}
        data-testid="share-card"
        className="w-[600px] rounded-xl bg-white p-8 shadow-lg"
        style={{ fontFamily: "system-ui, sans-serif" }}
      >
        {/* Header */}
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{courseName}</h2>
            <p className="text-sm text-gray-500">
              Shot {score} &middot; vs {bracketLabel}
            </p>
          </div>
          <div className="text-right">
            <span
              className={`text-2xl font-bold ${
                result.total >= 0 ? "text-green-600" : "text-red-600"
              }`}
            >
              {formatSG(result.total)}
            </span>
            <p className="text-xs text-gray-400">Total SG</p>
          </div>
        </div>

        {/* Radar chart */}
        <div style={{ height: 320 }}>
          <RadarChart data={chartData} bracketLabel={bracketLabel} />
        </div>

        {/* Category rows */}
        <div className="mt-4 space-y-2">
          {entries.map(({ key, label, value }) => (
            <div
              key={key}
              className="flex items-center justify-between rounded-md bg-gray-50 px-4 py-2"
            >
              <span className="text-sm font-medium text-gray-700">
                {label}
              </span>
              <span
                className={`text-sm font-semibold ${
                  value >= 0 ? "text-green-600" : "text-red-600"
                }`}
              >
                {formatSG(value)}
              </span>
            </div>
          ))}
        </div>

        {/* Watermark */}
        <p className="mt-6 text-center text-xs text-gray-300">
          Golf Data Viz &middot; golfdataviz.com
        </p>
      </div>
    );
  }
);
