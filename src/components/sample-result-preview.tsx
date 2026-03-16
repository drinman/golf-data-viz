"use client";

import { RadarChart } from "@/components/charts/radar-chart";
import { formatSG } from "@/lib/golf/format";
import type { SamplePreviewData } from "@/lib/golf/sample-round";

export function SampleResultPreview({
  chartData,
  categories,
  total,
  bracketLabel,
  courseName,
  handicap,
}: SamplePreviewData) {
  return (
    <div
      data-testid="sample-result-preview"
      className="rounded-xl border border-cream-200 bg-cream-50 px-5 py-4"
    >
      <p className="text-xs font-medium uppercase tracking-wide text-neutral-400">
        Example: {handicap}-handicap round at {courseName}
      </p>

      <div className="mt-2 h-[280px]">
        <RadarChart data={chartData} bracketLabel={bracketLabel} />
      </div>

      <div className="-mt-1 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {categories.map((cat) => (
          <div key={cat.label} className="text-center">
            <p className="text-xs text-neutral-500">{cat.label}</p>
            <p
              className={`font-mono text-sm font-semibold tabular-nums ${
                cat.value >= 0 ? "text-data-positive" : "text-data-negative"
              }`}
            >
              {formatSG(cat.value)}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-3 flex items-center justify-between">
        <div
          className={`rounded-lg px-4 py-2 ${
            total >= 0 ? "bg-brand-50" : "bg-red-50"
          }`}
        >
          <p className="text-[10px] font-medium uppercase tracking-wide text-neutral-500">
            Total SG
          </p>
          <p
            className={`font-mono text-lg font-semibold tabular-nums ${
              total >= 0 ? "text-data-positive" : "text-data-negative"
            }`}
          >
            {formatSG(total)}
          </p>
        </div>
        <p className="text-xs text-neutral-400">
          This is a sample — benchmark your own round below
        </p>
      </div>
    </div>
  );
}
